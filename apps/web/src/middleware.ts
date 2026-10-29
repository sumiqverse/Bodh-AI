import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest): NextResponse {
  // Generate cryptographically secure base64 nonce for strict CSP without 'unsafe-inline'
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== 'production';

  // Strict CSP: Zero 'unsafe-inline' for scripts in production; nonced strict-dynamic
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspHeader = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
    "img-src 'self' blob: data:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} http://127.0.0.1:8000`,
  ].join('; ');

  // Check for maintenance mode gating
  const isMaintenance =
    process.env.MAINTENANCE_MODE === 'true' || process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const pathname = request.nextUrl.pathname;
  const isBypass = request.headers.get('x-bodhai-bypass-maintenance') === 'true';

  if (
    isMaintenance &&
    !isBypass &&
    !pathname.includes('/maintenance') &&
    !pathname.startsWith('/api/health')
  ) {
    const locale = pathname.startsWith('/hi') ? 'hi' : 'en';
    const maintenanceUrl = new URL(`/${locale}/maintenance`, request.url);
    return NextResponse.redirect(maintenanceUrl, { status: 307 });
  }

  // Check for authenticated user redirect on landing page / login / signup
  const isLoggedIn = request.cookies.get('bodhai_logged_in')?.value === 'true';
  const isPublicBypass = request.nextUrl.searchParams.get('public') === 'true';

  if (isLoggedIn && !isPublicBypass) {
    const locale = pathname.startsWith('/hi') ? 'hi' : 'en';
    const cleanPath = pathname.replace(new RegExp(`^/(?:en|hi)(?=/|$)`), '') || '/';
    const isAuthOrLanding =
      cleanPath === '/' || cleanPath === '/login' || cleanPath === '/signup';

    if (isAuthOrLanding) {
      const role = request.cookies.get('bodhai_user_role')?.value;
      let targetPath = `/${locale}/profile`;
      if (role === 'admin') {
        targetPath = `/${locale}/admin/stats`;
      } else if (role === 'teacher') {
        targetPath = `/${locale}/classes`;
      } else if (role === 'student') {
        targetPath = `/${locale}/student`;
      }

      const redirectUrl = new URL(targetPath, request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl, { status: 307 });

      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      redirectResponse.headers.set('X-Content-Type-Options', 'nosniff');
      redirectResponse.headers.set('X-Frame-Options', 'DENY');
      redirectResponse.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
      redirectResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      redirectResponse.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
      );
      redirectResponse.headers.set('x-nonce', nonce);

      return redirectResponse;
    }
  }

  const response = handleI18nRouting(request);

  // Set strict security headers on response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
  );
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/', '/(en|hi)/:path*'],
};
