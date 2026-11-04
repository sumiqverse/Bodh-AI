/**
 * Resolves the canonical base URL for the application across environments:
 * 1. Explicit production env vars: NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL
 * 2. Vercel deployment URLs: VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL
 * 3. Default fallback to the live production deployment: https://bodhai-two.vercel.app
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
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://bodhai-two.vercel.app';
}
