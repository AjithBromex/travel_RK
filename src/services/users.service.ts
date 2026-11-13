import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { UserProfile } from '@/types'
import { isDeleted, markAsDeleted } from '@/lib/storage-sync'
import { moveToTrash } from './trash.service'

const COLLECTION = 'users'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, COLLECTION, uid)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    const data = snap.data() as UserProfile
    if (!data.email || !data.email.trim()) {
      const cleanUser = String(data.userId || data.displayName || '').trim().replace(/@.*$/, '').toLowerCase()
      if (cleanUser) {
        data.email = `${cleanUser}@gmail.com`
        updateDoc(docRef, { email: data.email }).catch(() => {})
      }
    }
    return data
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
  const fallbackEmail = cleanId ? `${cleanId.toLowerCase()}@gmail.com` : ''
  const email = staffData.email || fallbackEmail
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
        email,
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
  const rawEmail = String(profile.email || '').trim()
  const email = rawEmail || (cleanUserId ? `${cleanUserId.toLowerCase()}@gmail.com` : '')
  const newProfile: UserProfile = {
    uid,
    email,
    displayName: profile.displayName || cleanUserId || 'User',
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

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION))
    return snap.docs
      .filter((d) => {
        const data = d.data() as Partial<UserProfile>
        return !data.isDeleted && !isDeleted('users', d.id)
      })
      .map(d => {
        const data = d.data() as Partial<UserProfile>
        const rawEmail = String(data.email || '').trim()
        const cleanUser = String(data.userId || data.displayName || (data as any).name || (data as any).username || d.id || '')
          .trim()
          .replace(/@gmail\.com$/i, '')
          .replace(/@.*$/, '')
          .toLowerCase()
        const fallbackEmail = cleanUser && !cleanUser.startsWith('usr_') ? `${cleanUser}@gmail.com` : ''
        const email = rawEmail || fallbackEmail

        if (!rawEmail && fallbackEmail && d.id) {
          updateDoc(d.ref, { email: fallbackEmail }).catch(() => {})
        }

        return {
          uid: d.id,
          ...data,
          email,
        } as UserProfile
      })
  } catch (err) {
    console.warn('[Users] Error listing users:', err)
    return []
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  markAsDeleted('users', uid)
  try {
    await moveToTrash('users', uid, 'User profile deleted')
  } catch (err) {
    console.warn(`[Users] Error soft-deleting user profile for ${uid}:`, err)
  }
}

