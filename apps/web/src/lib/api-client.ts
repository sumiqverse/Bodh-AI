import { BodhaiApiClient, COOKIE_SESSION_TOKEN, type UserResponse } from '@bodhai/api-client';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL = rawApiUrl.includes('bodhai-api.onrender.com')
  ? 'https://bodhai-kqwj.onrender.com'
  : rawApiUrl ||
    (typeof window !== 'undefined' && window.location.origin.includes('vercel.app')
      ? 'https://bodhai-kqwj.onrender.com'
      : 'http://localhost:8000');

const TOKEN_KEY = 'bodhai_access_token';
const USER_KEY = 'bodhai_user';
const LOGGED_IN_COOKIE = 'bodhai_logged_in';
const USER_ROLE_COOKIE = 'bodhai_user_role';
const REFRESH_GENERATION_KEY = 'bodhai_refresh_generation';

let memoryToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let refreshGeneration = 0;

// Purge legacy bearer tokens left in localStorage by older builds.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(TOKEN_KEY);
    refreshGeneration = Number(localStorage.getItem(REFRESH_GENERATION_KEY) || '0') || 0;
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function getCsrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match && match[1] ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {};
}

export function syncSessionCookies(_token?: string | null, user?: UserResponse | null): void {
  if (typeof window === 'undefined') return;
  const activeUser = user !== undefined ? user : getCurrentUser();

  if (activeUser) {
    setCookie(LOGGED_IN_COOKIE, 'true', 30);
    setCookie(USER_ROLE_COOKIE, activeUser.role || 'student', 30);
  } else {
    deleteCookie(LOGGED_IN_COOKIE);
    deleteCookie(USER_ROLE_COOKIE);
  }
}

export function getUserDashboardPath(user: UserResponse | null): string {
  if (!user) return '/profile';
  if (user.role === 'admin') return '/admin/stats';
  if (user.role === 'teacher') return '/classes';
  if (user.role === 'student') return '/student';
  return '/profile';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (memoryToken) return memoryToken;
  // The real access token lives in an HttpOnly cookie. This non-secret sentinel
  // keeps existing callers working while the API client falls back to cookies.
  return getCurrentUser() ? COOKIE_SESSION_TOKEN : null;
}

export function getCurrentUser(): UserResponse | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as UserResponse;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: UserResponse): void {
  if (typeof window === 'undefined') return;
  memoryToken = token;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  syncSessionCookies(token, user);
  try {
    window.dispatchEvent(new Event('bodhai_auth_change'));
  } catch {
    // ignore
  }
}

async function revokeServerSession(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getCsrfHeaders(),
      keepalive: true,
    });
  } catch {
    // Local sign-out must still complete if the network is unavailable.
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  void revokeServerSession();
  memoryToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('bodhai_session_last_active');
  localStorage.removeItem('bodhai_diag_session');
  syncSessionCookies(null, null);
  // Clear any residual student state on shared device
  sessionStorage.clear();
  try {
    window.dispatchEvent(new Event('bodhai_auth_change'));
  } catch {
    // ignore
  }
}

export function getActiveLocale(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang;
    if (lang === 'hi' || lang === 'en') return lang;
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.startsWith('/hi') || path === '/hi') return 'hi';
    if (path.startsWith('/en') || path === '/en') return 'en';
  }
  return 'en';
}

function readSharedRefreshGeneration(): number {
  if (typeof window === 'undefined') return refreshGeneration;
  try {
    return Number(localStorage.getItem(REFRESH_GENERATION_KEY) || '0') || 0;
  } catch {
    return refreshGeneration;
  }
}

function bumpRefreshGeneration(): void {
  refreshGeneration += 1;
  try {
    localStorage.setItem(REFRESH_GENERATION_KEY, String(refreshGeneration));
  } catch {
    // The in-memory generation still prevents duplicate refreshes in this tab.
  }
}

async function performTokenRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const observedGeneration = refreshGeneration;
  // Prefer the shared HttpOnly cookie when another tab has already refreshed.
  memoryToken = null;

  const refresh = async (): Promise<boolean> => {
    const sharedGeneration = readSharedRefreshGeneration();
    if (sharedGeneration > observedGeneration) {
      refreshGeneration = sharedGeneration;
      return true;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;

      const data = (await res.json()) as {
        access_token?: string;
        user?: UserResponse;
      };
      if (!data.access_token || !data.user) return false;

      setAuthSession(data.access_token, data.user);
      bumpRefreshGeneration();
      return true;
    } catch {
      return false;
    }
  };

  // Serialize refreshes across tabs so two tabs never replay the same rotating token.
  const lockManager = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (lockManager) {
    try {
      return await lockManager.request('bodhai_token_refresh', refresh);
    } catch {
      // Fall back to an in-tab refresh when the Web Locks API is unavailable.
    }
  }
  return refresh();
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

let clientInstance: BodhaiApiClient | null = null;

export function getWebApiClient(): BodhaiApiClient {
  if (!clientInstance) {
    clientInstance = new BodhaiApiClient({
      baseUrl: API_BASE_URL,
      getToken: getAuthToken,
      getLocale: getActiveLocale,
      onUnauthorized: refreshAccessToken,
    });
  }
  return clientInstance;
}
