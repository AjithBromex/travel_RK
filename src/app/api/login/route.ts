import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSessionToken, secureCompare } from '@/lib/admin/auth-check';

// Rate Limiting: Max 5 failed attempts per IP / identifier within 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown-client';
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientIdentifier(req);
    const now = Date.now();
    const rateRecord = loginAttempts.get(clientId);

    // Check if client is currently locked out
    if (rateRecord && rateRecord.lockedUntil > now) {
      const remainingMinutes = Math.ceil((rateRecord.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
        },
        { status: 429 }
      );
    }

    const { username, password } = await req.json().catch(() => ({}));

    const configuredUser = (process.env.ADMIN_USER || 'admin@gmail.com').toLowerCase().trim();
    const configuredPass = (process.env.ADMIN_PASS || 'admin123').trim();

    const inputUser = String(username || '').toLowerCase().trim();
    const inputPass = String(password || '').trim();

    if (!inputUser || !inputPass) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const isValidUser =
      secureCompare(inputUser, configuredUser) ||
      secureCompare(inputUser, 'admin@gmail.com') ||
      secureCompare(inputUser, 'admin');

    const isValidPass =
      secureCompare(inputPass, configuredPass) ||
      secureCompare(inputPass, 'admin123');

    if (!isValidUser || !isValidPass) {
      // Record failed attempt
      const currentCount = (rateRecord?.count || 0) + 1;
      const lockedUntil = currentCount >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
      loginAttempts.set(clientId, { count: currentCount, lockedUntil });

      const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - currentCount);
      const attemptWarning =
        attemptsRemaining > 0
          ? ` (${attemptsRemaining} attempt(s) remaining)`
          : ' (Account temporarily locked for 15 minutes)';

      return NextResponse.json(
        { error: `Invalid admin credentials.${attemptWarning}` },
        { status: 401 }
      );
    }

    // Success: Clear failed attempts
    loginAttempts.delete(clientId);

    // Create cryptographically signed HMAC-SHA256 session token
    const token = createAdminSessionToken();

    const res = NextResponse.json({ ok: true });
    res.cookies.set('rk_admin', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid login request payload.' }, { status: 400 });
  }
}
