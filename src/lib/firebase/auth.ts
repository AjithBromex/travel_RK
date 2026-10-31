import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth'
import { auth } from './config'
import { getUserProfile, createUserProfile, updateUserProfile, findUserByUsername } from '@/services/users.service'
import type { UserProfile, UserRole } from '@/types'

export function setSessionCookie() {
  if (typeof document !== 'undefined') {
    // 7 days expiration
    const maxAge = 60 * 60 * 24 * 7
    document.cookie = `firebase_auth=true; path=/; max-age=${maxAge}; SameSite=Lax`
  }
}

export function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'firebase_auth=; path=/; max-age=0; SameSite=Lax'
  }
}

/**
 * Normalizes input: if user entered a username instead of email,
 * checks Firestore users collection or constructs user email.
 */
async function resolveLoginEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) {
    return trimmed
  }

  // Look up username in Firestore users
  const profile = await findUserByUsername(trimmed)
  if (profile?.email) {
    return profile.email
  }

  // Default fallback email pattern for usernames: @gmail.com
  return `${trimmed.toLowerCase()}@gmail.com`
}

/**
 * Sign in with email or username + password
 */
export async function signInUser(
  identifier: string,
  password: string
): Promise<{ user: User; profile: UserProfile | null }> {
  const email = await resolveLoginEmail(identifier)
  const credential = await signInWithEmailAndPassword(auth, email, password)
  setSessionCookie()

  const loginUsername = (
    identifier.trim().replace(/@gmail\.com$/i, '').replace(/@.*$/, '') ||
    credential.user.email?.split('@')[0] ||
    identifier
  ).toUpperCase()

  // Retrieve user profile
  let profile = await getUserProfile(credential.user.uid)
  if (!profile) {
    // If first-time login without a profile document, auto-provision
    profile = await createUserProfile(credential.user.uid, {
      email: credential.user.email || email,
      displayName: loginUsername,
      userId: loginUsername,
      role: 'admin',
    })
  } else if (profile.displayName !== loginUsername && loginUsername) {
    // Keep profile displayName in sync with the login username
    profile = { ...profile, displayName: loginUsername, userId: loginUsername }
    updateUserProfile(credential.user.uid, { displayName: loginUsername, userId: loginUsername }).catch(() => {})
  }

  return { user: credential.user, profile }
}

/**
 * Sign up a new user with email, password, and role
 */
export async function signUpUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = 'staff'
): Promise<{ user: User; profile: UserProfile }> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)

  if (displayName) {
    await updateProfile(credential.user, { displayName })
  }

  const profile = await createUserProfile(credential.user.uid, {
    email: credential.user.email || email,
    displayName,
    role,
    userId: displayName.toUpperCase(),
  })

  setSessionCookie()
  return { user: credential.user, profile }
}

/**
 * Sign out current user and clear cookie
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } finally {
    clearSessionCookie()
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(identifier: string): Promise<void> {
  const email = await resolveLoginEmail(identifier)
  await sendPasswordResetEmail(auth, email)
}

/**
 * Human-friendly error translation for Firebase Auth codes
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string }
  const code = err?.code || ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid User ID/Email or password. Please check your credentials.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the administrator.'
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access has been temporarily locked for security. Please try again later.'
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.'
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is currently disabled in your Firebase project. Please enable it in Firebase Console → Authentication → Sign-in method.'
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Firebase API Key is invalid or expired. Please check your project settings.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connectivity.'
    default:
      return err?.message || 'Authentication failed. Please try again.'
  }
}
