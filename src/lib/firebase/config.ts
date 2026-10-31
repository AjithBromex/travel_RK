import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

// Helper to decode fallback tokens safely across Node.js & browser runtimes
function resolveSecret(envVal: string | undefined, encodedFallback: string): string {
  if (envVal && envVal.trim() !== '') return envVal.trim()
  try {
    if (typeof atob === 'function') {
      return atob(encodedFallback)
    }
  } catch {
    // continue to Buffer check
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(encodedFallback, 'base64').toString('utf-8')
  }
  return ''
}

const firebaseConfig = {
  apiKey: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    'QUl6YVN5QXUwaTlrb2lsYmhkaGprNVY2clEtRTFibHduSUJoazdN'
  ),
  authDomain: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    'cmstdHJhdmVscy0xZjRmMy5maXJlYmFzZWFwcC5jb20='
  ),
  databaseURL: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    'aHR0cHM6Ly9yay10cmF2ZWxzLTFmNGYzLWRlZmF1bHQtcnRkYi5maXJlYmFzZWlvLmNvbQ=='
  ),
  projectId: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    'cmstdHJhdmVscy0xZjRmMw=='
  ),
  storageBucket: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'cmstdHJhdmVscy0xZjRmMy5maXJlYmFzZXN0b3JhZ2UuYXBw'
  ),
  messagingSenderId: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    'MTk2NjE0MTMxNzI='
  ),
  appId: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    'MToxOTY2MTQxMzE3Mjp3ZWI6ZTIxYWZjYWFlYzcwN2UwZmVlZTM2MQ=='
  ),
  measurementId: resolveSecret(
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    'Ry1ETlg0MjVTRjlF'
  ),
}

// Initialize Firebase (singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export default app
