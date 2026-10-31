import { BodhaiApiClient, type UserResponse } from '@bodhai/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'bodhai_access_token';
const USER_KEY = 'bodhai_user';
const LOGGED_IN_COOKIE = 'bodhai_logged_in';
const USER_ROLE_COOKIE = 'bodhai_user_role';

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function syncSessionCookies(token?: string | null, user?: UserResponse | null): void {
  if (typeof window === 'undefined') return;
  const activeUser = user !== undefined ? user : getCurrentUser();
  const activeToken = token !== undefined ? token : getAuthToken();

  if (activeUser && activeToken) {
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
  return localStorage.getItem(TOKEN_KEY);
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
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  syncSessionCookies(token, user);
  try {
    window.dispatchEvent(new Event('bodhai_auth_change'));
  } catch {
    // ignore
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
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

let clientInstance: BodhaiApiClient | null = null;

export function getWebApiClient(): BodhaiApiClient {
  if (!clientInstance) {
    clientInstance = new BodhaiApiClient({
      baseUrl: API_BASE_URL,
      getToken: getAuthToken,
      getLocale: getActiveLocale,
    });
  }
  return clientInstance;
}
