import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.FIREBASE_ADMIN_SESSION_SECRET ||
  'rk-travel-admin-secret-2026-key';

/**
 * Constant-time string comparison for Edge Runtime (zero Node dependencies).
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validates the admin session token using standard W3C Web Cryptography API.
 * 100% Edge-safe: zero imports from Node 'crypto' and zero dependency on Node Buffer.
 */
async function verifyEdgeAdminToken(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(ADMIN_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature to Uint8Array using standard atob
    let b64 = sig.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const binary = atob(b64);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
    if (!isValid) return false;

    // Validate token expiry timestamp
    let payloadB64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (payloadB64.length % 4 !== 0) payloadB64 += '=';
    const decoded = atob(payloadB64);
    const [_, expStr] = decoded.split(':');
    const exp = parseInt(expStr, 10);
    return !isNaN(exp) && Date.now() <= exp;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Helper to add security headers to any response
  const withSecurityHeaders = (res: NextResponse) => {
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'SAMEORIGIN');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.headers.set('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production') {
      res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return res;
  };

  // 0. Auto-correct common URL variations/typos for admin subroutes (e.g. "audit logs" -> "audit-logs")
  try {
    const decodedPath = decodeURI(pathname).toLowerCase().trim();
    if (
      decodedPath === '/admin/audit logs' ||
      decodedPath === '/admin/audit_logs' ||
      decodedPath === '/admin/auditlog' ||
      decodedPath === '/admin/auditlogs'
    ) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/audit-logs';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    if (
      decodedPath === '/admin/backup' ||
      decodedPath === '/admin/back-up' ||
      decodedPath === '/admin/backups/'
    ) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/backups';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    if (decodedPath === '/admin/trash/') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/trash';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  } catch {
    // If decoding fails, continue normally
  }

  // 1. Admin login page - always allow so administrator can authenticate
  if (pathname === '/admin/login') {
    return withSecurityHeaders(NextResponse.next());
  }

  // 2. Admin dashboard & subroutes (/admin, /admin/trips, /admin/trash, etc.)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const adminToken = req.cookies.get('rk_admin')?.value;
    const isAdmin = await verifyEdgeAdminToken(adminToken);

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
    pathname !== '/api/auth/session' &&
    pathname !== '/api/webhooks/twilio'
  ) {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const isCronPath =
      pathname === '/api/admin/backups/cron' ||
      pathname === '/api/admin/whatsapp/cron';

    const isCronTokenValid =
      Boolean(process.env.CRON_SECRET) &&
      Boolean(bearer) &&
      constantTimeCompare(bearer, process.env.CRON_SECRET || '');

    const isVercelCronHeader = req.headers.get('x-vercel-cron') === '1';

    const isCron = isCronPath && (isCronTokenValid || isVercelCronHeader);

    const adminToken = req.cookies.get('rk_admin')?.value;
    const isAdmin =
      (await verifyEdgeAdminToken(adminToken)) ||
      (bearer ? await verifyEdgeAdminToken(bearer) : false);

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
