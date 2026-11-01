import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, SESSION_MS, adminAuth, audit, clearFailures, currentAdmin, hash, isLocked, recordFailure } from '@/lib/admin/server';

const DENY = () => NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 }); // identical for every failure
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const ipKey = `ip_${hash(ip)}`;
  let body: { idToken?: unknown; failedEmail?: unknown } = {};
  try { body = await req.json(); } catch { return DENY(); }

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
    const decoded = await adminAuth().verifyIdToken(body.idToken, true);
    const email = (decoded.email ?? '').toLowerCase();
    const pairKey = `pair_${hash(`${ip}|${email}`)}`;
    if (await isLocked([pairKey])) return DENY();
    if (decoded.admin !== true) {
      await recordFailure([ipKey, pairKey]);
      await audit({ action: 'admin_login_failed', reason: 'no_admin_claim', ipHash: hash(ip), emailHash: hash(email) });
      return DENY();
    }
    const cookie = await adminAuth().createSessionCookie(body.idToken, { expiresIn: SESSION_MS });
    await clearFailures([pairKey]);
    await audit({ action: 'admin_login', adminUid: decoded.uid, ipHash: hash(ip) });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, cookie, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: SESSION_MS / 1000 });
    return res;
  } catch {
    await recordFailure([ipKey]);
    await audit({ action: 'admin_login_failed', reason: 'token_invalid', ipHash: hash(ip) });
    return DENY();
  }
}

export async function DELETE() {
  const admin = await currentAdmin();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 0 });
  if (admin) {
    await adminAuth().revokeRefreshTokens(admin.uid);
    await audit({ action: 'admin_logout', adminUid: admin.uid });
  }
  return res;
}
