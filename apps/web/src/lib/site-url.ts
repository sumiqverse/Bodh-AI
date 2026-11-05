/**
 * Resolves the canonical base URL for the application across environments:
 * 1. Explicit production env vars: NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL
 * 2. Vercel's production URL
 * 3. Default production deployment (never a per-preview VERCEL_URL)
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'https://bodhai-two.vercel.app';
}
