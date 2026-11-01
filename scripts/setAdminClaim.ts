// One-time: npx tsx --env-file=.env.local scripts/setAdminClaim.ts <email>
// Assigns admin:true to an EXISTING Auth user. Never creates users or handles passwords.
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/setAdminClaim.ts <email>');
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !key) {
  console.error('Missing FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: key.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
auth
  .getUserByEmail(email)
  .then((u) => auth.setCustomUserClaims(u.uid, { ...(u.customClaims ?? {}), admin: true }).then(() => u.uid))
  .then((uid) => console.log(`admin:true claim successfully set for ${uid} (${email}). User can sign out and sign in again.`))
  .catch((err) => {
    console.error('Could not set claim. Check that the user exists and credentials are valid:', err.message);
    process.exit(1);
  });
