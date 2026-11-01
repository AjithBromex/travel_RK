import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/login')) return NextResponse.next();
  const ok = req.cookies.get('rk_admin')?.value === process.env.ADMIN_SESSION_SECRET;
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/admin/:path*', '/api/:path*'] };
