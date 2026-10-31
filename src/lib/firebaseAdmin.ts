import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getServiceAccount() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePath = require("path");

  // 1. Explicit environment variable with path or JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (raw.startsWith("{")) {
      return JSON.parse(raw);
    }
    const resolved = nodePath.isAbsolute(raw)
      ? raw
      : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
    if (nodeFs.existsSync(resolved)) {
      return JSON.parse(nodeFs.readFileSync(resolved, "utf-8"));
    }
  }

  // 2. Individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  // 3. Fallback to check default key in project directory
  const defaultFile = nodePath.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    "rk-travels-1f4f3-firebase-adminsdk-fbsvc-92c95a691b.json"
  );
  if (nodeFs.existsSync(defaultFile)) {
    return JSON.parse(nodeFs.readFileSync(defaultFile, "utf-8"));
  }

  throw new Error(
    "Missing Firebase Service Account credentials. Please set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local"
  );
}

const app: App =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(getServiceAccount()),
      });

export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = getFirestore(app);
export { app as adminApp };
