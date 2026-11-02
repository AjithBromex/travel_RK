import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || 'rk-travel-admin-secret-2026-key';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin login page - always render login page so administrator must provide credentials
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // 2. Admin dashboard & subroutes
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const isAdmin = req.cookies.get('rk_admin')?.value === ADMIN_SECRET;
    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 3. Admin APIs protection
  if (pathname.startsWith('/api/') && pathname !== '/api/login' && pathname !== '/api/logout') {
    const isAdmin = req.cookies.get('rk_admin')?.value === ADMIN_SECRET;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4. User portal auth handling
  const isLoggedIn = !!req.cookies.get('firebase_auth')?.value;
  const isProtected = pathname.startsWith('/travel');
  const isLoginPage = pathname === '/login';

  // Root redirect
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = isLoggedIn ? '/travel' : '/login';
    return NextResponse.redirect(url);
  }

  // If already logged in and visiting /login -> send to /travel, unless ?switch=true is provided
  if (isLoginPage) {
    const isSwitch = req.nextUrl.searchParams.get('switch') === 'true';
    if (isLoggedIn && !isSwitch) {
      const url = req.nextUrl.clone();
      url.pathname = '/travel';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If not logged in and visiting protected /travel route -> send to /login
  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
