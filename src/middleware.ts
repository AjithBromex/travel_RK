import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSessionToken, secureCompare } from '@/lib/admin/auth-check';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Helper to add security headers to any response
  const withSecurityHeaders = (res: NextResponse) => {
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return res;
  };

  // 1. Admin login page - always allow so administrator can authenticate
  if (pathname === '/admin/login') {
    return withSecurityHeaders(NextResponse.next());
  }

  // 2. Admin dashboard & subroutes (/admin, /admin/trips, /admin/trash, etc.)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const adminToken = req.cookies.get('rk_admin')?.value;
    const isAdmin = verifyAdminSessionToken(adminToken);

    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('callbackUrl', pathname);
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // 3. Admin APIs protection
  if (
    pathname.startsWith('/api/') &&
    pathname !== '/api/login' &&
    pathname !== '/api/logout' &&
    pathname !== '/api/auth/session'
  ) {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const isCron =
      pathname === '/api/admin/backups/cron' &&
      Boolean(process.env.CRON_SECRET) &&
      secureCompare(bearer, process.env.CRON_SECRET || '');

    const adminToken = req.cookies.get('rk_admin')?.value;
    const isAdmin = verifyAdminSessionToken(adminToken) || (bearer ? verifyAdminSessionToken(bearer) : false);

    if (!isAdmin && !isCron) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 })
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // 4. User portal auth handling
  const isLoggedIn = !!req.cookies.get('firebase_auth')?.value;
  const isProtected = pathname.startsWith('/travel');
  const isLoginPage = pathname === '/login';

  // Root redirect
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = isLoggedIn ? '/travel' : '/login';
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  // If already logged in and visiting /login -> send to /travel, unless ?switch=true is provided
  if (isLoginPage) {
    const isSwitch = req.nextUrl.searchParams.get('switch') === 'true';
    if (isLoggedIn && !isSwitch) {
      const url = req.nextUrl.clone();
      url.pathname = '/travel';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // If not logged in and visiting protected /travel route -> send to /login
  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/travel',
    '/travel/:path*',
    '/admin',
    '/admin/:path*',
    '/api/:path*',
  ],
};
