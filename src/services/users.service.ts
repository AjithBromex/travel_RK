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

export async function createStaffRecord(
  uid: string,
  staffData: {
    displayName?: string
    email?: string
    userId?: string
    phone?: string
  }
): Promise<void> {
  const now = new Date().toISOString()
  const cleanId = (staffData.userId || staffData.displayName || staffData.email?.split('@')[0] || '').toUpperCase()
  try {
    const staffDocRef = doc(db, 'staff', uid)
    await setDoc(
      staffDocRef,
      {
        uid,
        name: staffData.displayName || cleanId || 'Staff Member',
        displayName: staffData.displayName || cleanId || 'Staff Member',
        userId: cleanId,
        username: cleanId,
        email: staffData.email || '',
        phone: staffData.phone || '',
        role: 'staff',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    )
  } catch (err) {
    console.warn('[Staff] Error creating staff record in Firebase:', err)
  }
}

export async function createUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<UserProfile> {
  const now = new Date().toISOString()
  const role = profile.role || 'staff'
  const cleanUserId = (profile.userId || profile.displayName || profile.email?.split('@')[0] || '').toUpperCase()
  const newProfile: UserProfile = {
    uid,
    email: profile.email || '',
    displayName: profile.displayName || profile.email?.split('@')[0] || 'User',
    role,
    userId: cleanUserId,
    isActive: profile.isActive !== undefined ? profile.isActive : true,
    phone: profile.phone || '',
    createdAt: now,
    updatedAt: now,
  }

  try {
    const docRef = doc(db, COLLECTION, uid)
    await setDoc(docRef, newProfile, { merge: true })

    // Also persist a new staff record in Firebase Firestore if role is staff
    if (role === 'staff') {
      await createStaffRecord(uid, {
        displayName: newProfile.displayName,
        email: newProfile.email,
        userId: newProfile.userId,
        phone: newProfile.phone,
      })
    }

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
