// One-time: npx tsx --env-file=.env.local scripts/setAdminClaim.ts admin@gmail.com
// Assigns admin:true to an EXISTING Auth user. Never creates users or handles passwords.
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) { console.error('Usage: setAdminClaim.ts <email>'); process.exit(1); }
const { FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail, FIREBASE_ADMIN_PRIVATE_KEY: key } = process.env;
if (!projectId || !clientEmail || !key) {
  console.error('Missing FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY.'); process.exit(1);
}
initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, '\n') }) });
const auth = getAuth();
auth.getUserByEmail(email)
  .then((u) => auth.setCustomUserClaims(u.uid, { ...(u.customClaims ?? {}), admin: true }).then(() => u.uid))
  .then((uid) => console.log(`admin:true set for ${uid}. Sign out and in again to refresh the token.`))
  .catch(() => { console.error('Could not set claim. Check that the user exists and credentials are valid.'); process.exit(1); });
