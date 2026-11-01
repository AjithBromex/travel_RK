// Server-only. Firebase Admin SDK must never be imported from client components.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export const COOKIE = '__admin_session';
export const SESSION_MS = 60 * 60 * 1000; // 1 hour
export const COLLECTIONS = ['trips', 'vehicles', 'payments', 'expenses', 'cashbook', 'reminders'] as const;

function app(): App {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !key) throw new Error('Firebase Admin environment variables are missing.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') }) });
}
export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());

/** Verifies the session cookie (checking revocation) AND the admin claim. */
export async function verifyAdminCookie(value?: string) {
  if (!value) return null;
  try {
    const d = await adminAuth().verifySessionCookie(value, true);
    return d.admin === true ? d : null;
  } catch { return null; }
}
export async function currentAdmin() {
  return verifyAdminCookie((await cookies()).get(COOKIE)?.value);
}

export const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export async function audit(entry: Record<string, unknown>) {
  try { await adminDb().collection('auditLogs').add({ ...entry, at: FieldValue.serverTimestamp() }); }
  catch { console.error('audit write failed'); }
}

// Brute-force limiter: 5 failures / 15 min, then 15 min lockout. Keys are hashed.
const MAX = 5, WINDOW = 15 * 60 * 1000;
const ref = (k: string) => adminDb().doc(`adminLoginAttempts/${k}`);
export async function isLocked(keys: string[]) {
  const snaps = await Promise.all(keys.map((k) => ref(k).get()));
  return snaps.some((s) => (s.data()?.lockedUntil ?? 0) > Date.now());
}
export async function recordFailure(keys: string[]) {
  await Promise.all(keys.map((k) => adminDb().runTransaction(async (t) => {
    const d = (await t.get(ref(k))).data(); const now = Date.now();
    const fresh = !d || now - d.windowStart > WINDOW;
    const count = fresh ? 1 : d.count + 1;
    t.set(ref(k), { count, windowStart: fresh ? now : d.windowStart, lockedUntil: count >= MAX ? now + WINDOW : 0 });
  })));
}
export const clearFailures = (keys: string[]) => Promise.all(keys.map((k) => ref(k).delete()));
