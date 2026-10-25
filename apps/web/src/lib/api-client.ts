import { BodhaiApiClient, type UserResponse } from '@bodhai/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'bodhai_access_token';
const USER_KEY = 'bodhai_user';

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
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

let clientInstance: BodhaiApiClient | null = null;

export function getWebApiClient(): BodhaiApiClient {
  if (!clientInstance) {
    clientInstance = new BodhaiApiClient({
      baseUrl: API_BASE_URL,
    });
  }
  return clientInstance;
}
