import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || 'rk-travel-admin-secret-2026-key';

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const path = nextUrl.pathname;

  // 1. Admin login page
  if (path === '/admin/login') {
    const isAdmin = cookies.get('rk_admin')?.value === ADMIN_SECRET;
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin', nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Admin dashboard & subroutes
  if (path === '/admin' || path.startsWith('/admin/')) {
    const isAdmin = cookies.get('rk_admin')?.value === ADMIN_SECRET;
    if (!isAdmin) {
      const loginUrl = new URL('/admin/login', nextUrl);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Admin APIs protection
  if (path.startsWith('/api/') && path !== '/api/login' && path !== '/api/logout') {
    const isAdmin = cookies.get('rk_admin')?.value === ADMIN_SECRET;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 4. User portal auth handling
  const isLoggedIn = !!cookies.get('firebase_auth')?.value;
  const isProtected = path.startsWith('/travel');
  const isLoginPage = path === '/login';

  // Root redirect
  if (path === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl));
    }
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // If already logged in and visiting /login -> send to /travel
  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl));
    }
    return NextResponse.next();
  }

  // If not logged in and visiting protected /travel route -> send to /login
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
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
