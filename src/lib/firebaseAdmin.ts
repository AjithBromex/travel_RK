import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getServiceAccountSafe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeFs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodePath = require("path");

  // 1. Explicit env var (JSON string or file path)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (raw.startsWith("{")) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore malformed JSON in build
      }
    }
    try {
      const resolved = nodePath.isAbsolute(raw)
        ? raw
        : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
      if (nodeFs.existsSync(resolved)) {
        return JSON.parse(nodeFs.readFileSync(resolved, "utf-8"));
      }
    } catch {
      // ignore
    }
  }

  // 2. Individual env vars
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

  // 3. Fallback: Check for any *-adminsdk-*.json in cwd
  try {
    const files: string[] = nodeFs.readdirSync(/*turbopackIgnore: true*/ process.cwd());
    const keyFile = files.find(
      (f: string) => f.includes("adminsdk") && f.endsWith(".json")
    );
    if (keyFile) {
      const fullPath = nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), keyFile);
      return JSON.parse(nodeFs.readFileSync(fullPath, "utf-8"));
    }
  } catch {
    // ignore
  }

  return null;
}

let _app: App | null = null;

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  if (_app) return _app;

  const cred = getServiceAccountSafe();
  if (cred) {
    _app = initializeApp({
      credential: cert(cred),
      projectId: cred.projectId,
    });
  } else {
    // Safe build-time / CI fallback when credentials are provided in Vercel project settings
    _app = initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "rk-travels-1f4f3",
    });
  }
  return _app;
}

// Resilient proxies that delay resolution until runtime request execution
export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAuth(getAdminApp());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (auth as any)[prop];
    return typeof val === "function" ? val.bind(auth) : val;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getFirestore(getAdminApp());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (db as any)[prop];
    return typeof val === "function" ? val.bind(db) : val;
  },
});

export const adminApp = new Proxy({} as App, {
  get(_target, prop) {
    const app = getAdminApp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (app as any)[prop];
    return typeof val === "function" ? val.bind(app) : val;
  },
});
