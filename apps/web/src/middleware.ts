import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

const handleI18nRouting = createMiddleware(routing);

// Protected internal routes that require an authenticated session
const PROTECTED_PREFIXES = [
  '/diagnostic',
  '/student',
  '/learn',
  '/solve',
  '/test',
  '/profile',
  '/profiles',
  '/classes',
  '/admin',
  '/progress',
  '/certificate',
  '/settings',
  '/curriculum',
];

export default function middleware(request: NextRequest): NextResponse {
  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' https: https://bodhai-kqwj.onrender.com ${apiHost} http://127.0.0.1:8000 http://localhost:8000`,
    "worker-src 'self' blob:",
  ].join('; ');

  function applySecurityHeaders(res: NextResponse): NextResponse {
    res.headers.set('Content-Security-Policy', cspHeader);
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
    );
    return res;
  }

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
    return applySecurityHeaders(NextResponse.redirect(maintenanceUrl, { status: 307 }));
  }

  const isLoggedIn = request.cookies.get('bodhai_logged_in')?.value === 'true';
  const isPublicBypass = request.nextUrl.searchParams.get('public') === 'true';
  const locale = pathname.startsWith('/hi') ? 'hi' : 'en';
  const cleanPath = pathname.replace(new RegExp(`^/(?:en|hi)(?=/|$)`), '') || '/';

  // Unauthenticated users attempting to access protected routes -> redirect to login with redirect path
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + '/'),
  );

  if (!isLoggedIn && isProtectedRoute) {
    const search = request.nextUrl.search || '';
    const targetUrl = cleanPath + search;
    const redirectUrl = new URL(
      `/${locale}/login?redirect=${encodeURIComponent(targetUrl)}`,
      request.url,
    );
    return applySecurityHeaders(NextResponse.redirect(redirectUrl, { status: 307 }));
  }

  // Authenticated users visiting landing page / login / signup -> redirect to their role dashboard
  if (isLoggedIn && !isPublicBypass) {
    const isAuthOrLanding = cleanPath === '/' || cleanPath === '/login' || cleanPath === '/signup';

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
      return applySecurityHeaders(NextResponse.redirect(redirectUrl, { status: 307 }));
    }
  }

  const response = handleI18nRouting(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/', '/(en|hi)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
