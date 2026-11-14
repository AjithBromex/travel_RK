import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.FIREBASE_ADMIN_SESSION_SECRET ||
  'rk-travel-admin-secret-2026-key';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Constant-time string comparison to prevent timing attacks on secrets and passwords.
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to keep constant time
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Format: payload.signature
 * Where payload is base64url(issuedAt:expiresAt:nonce)
 */
export function createAdminSessionToken(): string {
  const now = Date.now();
  const exp = now + SESSION_TTL_MS;
  const nonce = randomBytes(8).toString('hex');
  const payload = Buffer.from(`${now}:${exp}:${nonce}`).toString('base64url');

  const hmac = createHmac('sha256', ADMIN_SECRET);
  hmac.update(payload);
  const sig = hmac.digest('base64url');

  return `${payload}.${sig}`;
}

/**
 * Verifies the cryptographically signed admin session token.
 * Validates HMAC signature, expiration time, and formatting.
 */
export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  try {
    const hmac = createHmac('sha256', ADMIN_SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest('base64url');

    if (!secureCompare(sig, expectedSig)) {
      return false;
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const [_, expStr] = decoded.split(':');
    const exp = parseInt(expStr, 10);

    if (isNaN(exp) || Date.now() > exp) {
      return false; // Token expired
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies if an incoming NextRequest has valid administrative authorization.
 * Checks signed session cookie 'rk_admin' or Authorization Bearer header.
 */
export function verifyAdminAuth(req: NextRequest): { authorized: boolean; reason?: string } {
  const cookieVal = req.cookies.get('rk_admin')?.value;

  if (verifyAdminSessionToken(cookieVal)) {
    return { authorized: true };
  }

  // Check Bearer token (for automated systems, cron jobs, or API integrations)
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      if (process.env.CRON_SECRET && secureCompare(bearer, process.env.CRON_SECRET)) {
        return { authorized: true };
      }
      if (verifyAdminSessionToken(bearer)) {
        return { authorized: true };
      }
    }
  }

  return { authorized: false, reason: 'Invalid or expired administrative authorization.' };
}

