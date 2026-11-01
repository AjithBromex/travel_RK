// Next.js 16 uses proxy.ts (formerly middleware.ts). If your repo already has a
// proxy/middleware file, MERGE this logic into it and make sure its matcher/redirects
// do NOT send /admin/* to the normal /login page.
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifyAdminCookie } from '@/lib/admin/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login' || pathname === '/api/admin/session') return NextResponse.next();
  if (await verifyAdminCookie(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', req.url));
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
