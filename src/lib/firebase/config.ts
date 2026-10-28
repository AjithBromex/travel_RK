import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const hasCustomConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAu0i9koilbhdhjk5V6rQ-E1blwnIBhk7M",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rk-travels-1f4f3.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://rk-travels-1f4f3-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rk-travels-1f4f3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rk-travels-1f4f3.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "19661413172",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:19661413172:web:e21afcaaec707e0feee361",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DNX425SF9E",
}

if (typeof window !== 'undefined' && !hasCustomConfig && process.env.NODE_ENV === 'development') {
  console.info(
    '[Firebase] Using placeholder configuration. To connect to your real Firebase project, set NEXT_PUBLIC_FIREBASE_* variables in .env.local.'
  )
}

// Initialize Firebase (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export default app
