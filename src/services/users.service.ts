import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { UserProfile } from '@/types'

const COLLECTION = 'users'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION, uid)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return snap.data() as UserProfile
  } catch (err) {
    console.warn(`[Users] Error fetching user profile for ${uid}:`, err)
    return null
  }
}

export async function createUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  const now = new Date().toISOString()
  const newProfile: UserProfile = {
    uid,
    email: profile.email || '',
    displayName: profile.displayName || profile.email?.split('@')[0] || 'User',
    role: profile.role || 'staff',
    userId: profile.userId || profile.displayName || profile.email?.split('@')[0]?.toUpperCase(),
    isActive: profile.isActive !== undefined ? profile.isActive : true,
    phone: profile.phone || '',
    createdAt: now,
    updatedAt: now,
  }

  try {
    const docRef = doc(db, COLLECTION, uid)
    await setDoc(docRef, newProfile, { merge: true })
    return newProfile
  } catch (err) {
    console.warn('[Users] Error creating user profile:', err)
    return newProfile
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, uid)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.warn(`[Users] Error updating user profile for ${uid}:`, err)
  }
}

export async function findUserByUsername(username: string): Promise<UserProfile | null> {
  try {
    const upper = username.trim().toUpperCase()
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', upper),
      limit(1)
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfile
    }
    return null
  } catch (err) {
    console.warn(`[Users] Error finding user by username ${username}:`, err)
    return null
  }
}
