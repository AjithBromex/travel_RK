import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Trip, TripStatus } from '@/types'
import { generateTripNumber } from '@/lib/utils'

const COLLECTION = 'trips'

export async function getTrips(limitCount = 100): Promise<Trip[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
  } catch (err) {
    console.warn('Could not fetch trips from Firestore:', err)
    return []
  }
}

export async function getRecentTrips(count = 5): Promise<Trip[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(count))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
  } catch (err) {
    console.warn('Could not fetch recent trips from Firestore:', err)
    return []
  }
}

export async function getTripById(id: string): Promise<Trip | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Trip
  } catch (err) {
    console.warn('Could not fetch trip by id:', err)
    return null
  }
}

export async function getTodayTrips(): Promise<Trip[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const q = query(collection(db, COLLECTION), where('tripDate', '==', today))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
  } catch (err) {
    console.warn('Could not fetch today trips from Firestore:', err)
    return []
  }
}

export async function getTripsByStatus(status: TripStatus): Promise<Trip[]> {
  try {
    const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
  } catch (err) {
    console.warn('Could not fetch trips by status from Firestore:', err)
    return []
  }
}

export async function createTrip(data: Omit<Trip, 'id' | 'tripNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    tripNumber: generateTripNumber(),
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteTrip(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
