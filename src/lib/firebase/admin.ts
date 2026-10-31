import { initializeApp, getApps, getApp, cert, App, ServiceAccount } from 'firebase-admin/app'
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

/**
 * Validates whether the required Firebase Admin Service Account environment variables exist.
 */
export function hasAdminConfig(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
}

/**
 * Loads the Firebase Admin Service Account credentials from environment variables.
 * Refuses to run and throws an informative error if environment variables are missing.
 */
export function getServiceAccountCredential(): ServiceAccount {
  // Option 1: Full JSON string or file path in FIREBASE_SERVICE_ACCOUNT_KEY
  // Option 1: Full JSON string or file path in FIREBASE_SERVICE_ACCOUNT_KEY
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim()
    if (raw.startsWith('{')) {
      try {
        return JSON.parse(raw) as ServiceAccount
      } catch {
        throw new Error(
          'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON. Please ensure it is valid JSON.'
        )
      }
    } else {
      // Treat as file path - load dynamically in Node environment
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeFs = require('fs')
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodePath = require('path')
        const filePath = nodePath.isAbsolute(raw)
          ? raw
          : nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), raw)
        if (!nodeFs.existsSync(filePath)) {
          throw new Error(
            `FIREBASE_SERVICE_ACCOUNT_KEY specified path "${filePath}" does not exist.`
          )
        }
        const fileData = nodeFs.readFileSync(filePath, 'utf-8')
        return JSON.parse(fileData) as ServiceAccount
      } catch (err: unknown) {
        throw new Error(
          `Could not read service account file: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  // Option 2: Individual environment variables
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKeyRaw) {
    // Replace escaped newlines if private key is passed as a single-line string with '\n'
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n')
    return {
      projectId,
      clientEmail,
      privateKey,
    }
  }

  // Option 3: GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeFs = require('fs')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodePath = require('path')
      const credPath = nodePath.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      if (nodeFs.existsSync(credPath)) {
        const fileData = nodeFs.readFileSync(credPath, 'utf-8')
        return JSON.parse(fileData) as ServiceAccount
      }
    } catch {
      // fallback
    }
  }

  throw new Error(
    'Firebase Admin SDK credentials not configured. Please supply FIREBASE_SERVICE_ACCOUNT_KEY (as JSON string or file path) or provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  )
}

let adminAppInstance: App | null = null

/**
 * Initializes and returns the Firebase Admin App singleton.
 */
export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  if (adminAppInstance) {
    return adminAppInstance
  }

  const credentials = getServiceAccountCredential()
  adminAppInstance = initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
  })

  return adminAppInstance
}

export function getAdminAuth(): Auth {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require('firebase-admin/auth')
  return getAuth(getAdminApp())
}

export function getAdminFirestore(): Firestore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require('firebase-admin/firestore')
  return getFirestore(getAdminApp())
}

export interface AdminTokenVerification {
  valid: boolean
  uid?: string
  email?: string
  admin?: boolean
  error?: string
}

/**
 * Verifies an ID token and asserts that the custom claim `admin: true` is present.
 */
export async function verifyAdminIdToken(
  idToken: string,
  checkRevoked: boolean = true
): Promise<AdminTokenVerification> {
  try {
    const auth = getAdminAuth()
    const decodedToken = await auth.verifyIdToken(idToken, checkRevoked)

    if (decodedToken.admin !== true) {
      return {
        valid: false,
        uid: decodedToken.uid,
        email: decodedToken.email,
        admin: false,
        error: 'Missing admin custom claim.',
      }
    }

    return {
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: true,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Token verification failed.'
    return {
      valid: false,
      error: errorMsg,
    }
  }
}

/**
 * Verifies a server-side session cookie and asserts that `admin: true` is present.
 */
export async function verifyAdminSessionCookie(
  sessionCookie: string,
  checkRevoked: boolean = true
): Promise<AdminTokenVerification> {
  try {
    const auth = getAdminAuth()
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, checkRevoked)

    if (decodedClaims.admin !== true) {
      return {
        valid: false,
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        admin: false,
        error: 'Missing admin custom claim.',
      }
    }

    return {
      valid: true,
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      admin: true,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Session verification failed.'
    return {
      valid: false,
      error: errorMsg,
    }
  }
}
