/**
 * Type-safe environment variable parser and validator for BodhAI Web.
 * Ensures critical client/server configurations are present and well-formed.
 */

export interface WebEnvConfig {
  apiUrl: string;
  appEnv: 'development' | 'staging' | 'production' | 'test';
  sentryDsn?: string;
  maintenanceMode: boolean;
  demoMode: boolean;
  defaultLocale: 'en' | 'hi';
}

function parseBoolean(val: string | undefined, defaultVal = false): boolean {
  if (!val) return defaultVal;
  return val.toLowerCase() === 'true' || val === '1';
}

export function validateWebEnv(): WebEnvConfig {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const rawEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development';

  const validEnvs = ['development', 'staging', 'production', 'test'] as const;
  const appEnv = (
    validEnvs.includes(rawEnv as (typeof validEnvs)[number]) ? rawEnv : 'development'
  ) as WebEnvConfig['appEnv'];

  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
  const maintenanceMode = parseBoolean(
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE || process.env.MAINTENANCE_MODE,
    false,
  );
  const demoMode = parseBoolean(process.env.NEXT_PUBLIC_DEMO_MODE, false);

  const rawLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';
  const defaultLocale: 'en' | 'hi' = rawLocale === 'hi' ? 'hi' : 'en';

  // In production, validate API URL has a secure protocol
  if (appEnv === 'production' && !apiUrl.startsWith('https://')) {
    // Only warn or fail if not a container hostname
    if (!apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      console.warn('[SECURITY] NEXT_PUBLIC_API_URL in production should use HTTPS protocol.');
    }
  }

  return {
    apiUrl,
    appEnv,
    sentryDsn,
    maintenanceMode,
    demoMode,
    defaultLocale,
  };
}

export const env = validateWebEnv();
