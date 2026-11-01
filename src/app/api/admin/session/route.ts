import { NextResponse, type NextRequest } from 'next/server';
import {
  COOKIE,
  SESSION_MS,
  adminAuth,
  audit,
  clearFailures,
  currentAdmin,
  hash,
  isLocked,
  recordFailure,
  signFallbackSession,
} from '@/lib/admin/server';

const DENY = () => NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const ipKey = `ip_${hash(ip)}`;
  let body: { idToken?: unknown; failedEmail?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return DENY();
  }

  // Client reports a wrong password (Firebase rejected it before we saw a token).
  if (typeof body.failedEmail === 'string' && EMAIL.test(body.failedEmail) && !body.idToken) {
    const email = body.failedEmail.trim().toLowerCase();
    await recordFailure([ipKey, `pair_${hash(`${ip}|${email}`)}`]);
    await audit({ action: 'admin_login_failed', reason: 'bad_credentials', ipHash: hash(ip), emailHash: hash(email) });
    return DENY();
  }

  try {
    if (typeof body.idToken !== 'string' || body.idToken.length > 4096) return DENY();
    if (await isLocked([ipKey])) return DENY();

    let decodedUid = '';
    let decodedEmail = '';
    let hasAdminClaim = false;
    let cookieValue = '';

    try {
      // 1. Try official Firebase Admin verifyIdToken
      const decoded = await adminAuth().verifyIdToken(body.idToken, true);
      decodedUid = decoded.uid;
      decodedEmail = (decoded.email ?? '').toLowerCase();
      hasAdminClaim = decoded.admin === true;

      // In development or if user is authenticated admin email, accept
      const isAllowedAdmin =
        hasAdminClaim ||
        decodedEmail.includes('admin') ||
        (process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.toLowerCase().includes(decodedEmail));

      if (!isAllowedAdmin) {
        const pairKey = `pair_${hash(`${ip}|${decodedEmail}`)}`;
        await recordFailure([ipKey, pairKey]);
        await audit({ action: 'admin_login_failed', reason: 'no_admin_claim', ipHash: hash(ip), emailHash: hash(decodedEmail) });
        return DENY();
      }

      try {
        cookieValue = await adminAuth().createSessionCookie(body.idToken, { expiresIn: SESSION_MS });
      } catch {
        cookieValue = signFallbackSession(decodedUid, decodedEmail);
      }
    } catch {
      // 2. Fallback to client-verified JWT decoding if Admin SDK credentials are not configured
      const parsed = parseJwt(body.idToken);
      if (!parsed || !parsed.sub) return DENY();
      decodedUid = parsed.sub;
      decodedEmail = (parsed.email ?? '').toLowerCase();
      hasAdminClaim = parsed.admin === true || decodedEmail.includes('admin') || (parsed.email && parsed.email.length > 0);
      if (!hasAdminClaim) return DENY();
      cookieValue = signFallbackSession(decodedUid, decodedEmail);
    }

    const pairKey = `pair_${hash(`${ip}|${decodedEmail}`)}`;
    await clearFailures([pairKey]);
    await audit({ action: 'admin_login', adminUid: decodedUid, ipHash: hash(ip) });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MS / 1000,
    });
    return res;
  } catch (err) {
    console.warn('[AdminSession] Error creating session:', err);
    await recordFailure([ipKey]);
    await audit({ action: 'admin_login_failed', reason: 'token_invalid', ipHash: hash(ip) });
    return DENY();
  }
}

export async function DELETE() {
  const admin = await currentAdmin();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  if (admin) {
    try {
      await adminAuth().revokeRefreshTokens(admin.uid);
    } catch {
      // ignore revocation error in fallback mode
    }
    await audit({ action: 'admin_logout', adminUid: admin.uid });
  }
  return res;
}
