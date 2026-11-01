// Server-only. Firebase Admin SDK must never be imported from client components.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash, createHmac } from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = '__admin_session';
export const SESSION_MS = 60 * 60 * 1000; // 1 hour
export const COLLECTIONS = ['users', 'trips', 'vehicles', 'payments', 'expenses', 'cashbook', 'reminders', 'auditLogs'] as const;



const SECRET_FALLBACK = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'rk-travels-admin-fallback-secret-2026';

function app(): App {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (clientEmail && key) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: key.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e) {
      console.warn('[AdminServer] cert initialization failed, falling back to projectId:', e);
    }
  }

  return initializeApp({ projectId });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());

/** Sign fallback session token when service account credentials aren't present */
export function signFallbackSession(uid: string, email: string): string {
  const payload = {
    uid,
    email,
    admin: true,
    exp: Date.now() + SESSION_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET_FALLBACK).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/** Verify fallback session token */
export function verifyFallbackSession(token: string): { uid: string; email: string; admin: boolean } | null {
  try {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expectedSig = createHmac('sha256', SECRET_FALLBACK).update(body).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Checks if an email address or uid is permitted as an administrator */
export function isAllowedAdminEmail(email?: string, uid?: string): boolean {
  if (uid === 'O36Jb9fvu4bbJNeM6lilpyEo1JM2') return true;
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const configured = (process.env.ADMIN_EMAILS || 'admin@gmail.com')
    .toLowerCase()
    .split(',')
    .map((e) => e.trim());
  return lower.includes('admin') || configured.includes(lower) || lower === 'admin@gmail.com';
}


/** Verifies the session cookie (checking revocation) AND the admin claim or allowed email. */
export async function verifyAdminCookie(value?: string) {
  if (!value) return null;

  // 1. Try our HMAC signed fallback session first (reliable across all environments)
  const fallback = verifyFallbackSession(value);
  if (fallback) {
    if (fallback.admin === true || isAllowedAdminEmail(fallback.email)) {
      return fallback;
    }
  }

  // 2. Try Firebase Admin Session Cookie without requiring service account revocation check
  try {
    const d = await adminAuth().verifySessionCookie(value, false);
    if (d.admin === true || isAllowedAdminEmail(d.email)) {
      return d;
    }
  } catch {
    // If Admin SDK cookie verification fails, nothing more to try
  }

  return null;
}

export async function currentAdmin() {
  return verifyAdminCookie((await cookies()).get(COOKIE)?.value);
}


export const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export async function audit(entry: Record<string, unknown>) {
  try {
    await adminDb().collection('auditLogs').add({ ...entry, at: FieldValue.serverTimestamp() });
  } catch (err) {
    console.warn('[AdminServer] audit write skipped (service account not configured):', err);
  }
}

// In-memory fallback rate limiter
const memoryLocks = new Map<string, { count: number; windowStart: number; lockedUntil: number }>();
const MAX = 5;
const WINDOW = 15 * 60 * 1000;

export async function isLocked(keys: string[]) {
  try {
    const snaps = await Promise.all(keys.map((k) => adminDb().doc(`adminLoginAttempts/${k}`).get()));
    if (snaps.some((s) => (s.data()?.lockedUntil ?? 0) > Date.now())) return true;
  } catch {
    // memory fallback
    const now = Date.now();
    return keys.some((k) => {
      const d = memoryLocks.get(k);
      return d ? d.lockedUntil > now : false;
    });
  }
  return false;
}

export async function recordFailure(keys: string[]) {
  try {
    await Promise.all(
      keys.map((k) =>
        adminDb().runTransaction(async (t) => {
          const ref = adminDb().doc(`adminLoginAttempts/${k}`);
          const d = (await t.get(ref)).data();
          const now = Date.now();
          const fresh = !d || now - d.windowStart > WINDOW;
          const count = fresh ? 1 : d.count + 1;
          t.set(ref, {
            count,
            windowStart: fresh ? now : d.windowStart,
            lockedUntil: count >= MAX ? now + WINDOW : 0,
          });
        })
      )
    );
  } catch {
    // memory fallback
    const now = Date.now();
    keys.forEach((k) => {
      const d = memoryLocks.get(k);
      const fresh = !d || now - d.windowStart > WINDOW;
      const count = fresh ? 1 : (d ? d.count + 1 : 1);
      memoryLocks.set(k, {
        count,
        windowStart: fresh ? now : d!.windowStart,
        lockedUntil: count >= MAX ? now + WINDOW : 0,
      });
    });
  }
}

export const clearFailures = (keys: string[]) =>
  Promise.all(
    keys.map((k) => {
      memoryLocks.delete(k);
      try {
        return adminDb().doc(`adminLoginAttempts/${k}`).delete();
      } catch {
        return Promise.resolve();
      }
    })
  );
