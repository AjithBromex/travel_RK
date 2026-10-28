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
import { withCache, invalidateCache } from '@/lib/cache'

const COLLECTION = 'trips'

export async function getTrips(limitCount = 100): Promise<Trip[]> {
  return withCache(
    `trips:list:${limitCount}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
    },
    { fallback: [] }
  )
}

export async function getRecentTrips(count = 5): Promise<Trip[]> {
  return withCache(
    `trips:recent:${count}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(count))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
    },
    { fallback: [] }
  )
}

export async function getTripById(id: string): Promise<Trip | null> {
  return withCache(
    `trips:id:${id}`,
    async () => {
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Trip
    },
    { fallback: null }
  )
}

export async function getTodayTrips(): Promise<Trip[]> {
  const today = new Date().toISOString().split('T')[0]
  return withCache(
    `trips:today:${today}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('tripDate', '==', today))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
    },
    { fallback: [] }
  )
}

export async function getTripsByStatus(status: TripStatus): Promise<Trip[]> {
  return withCache(
    `trips:status:${status}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
    },
    { fallback: [] }
  )
}

export async function createTrip(data: Omit<Trip, 'id' | 'tripNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    tripNumber: generateTripNumber(),
    createdAt: now,
    updatedAt: now,
  })
  invalidateCache('trips')
  invalidateCache('dashboard')
  return docRef.id
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
  invalidateCache('trips')
  invalidateCache('dashboard')
}

export async function deleteTrip(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  invalidateCache('trips')
  invalidateCache('dashboard')
}
