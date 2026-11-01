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
import {
  waitForAuthReady,
  getStoredTrips,
  saveStoredTrips,
  upsertStoredTrip,
  removeStoredTrip,
  notifyDataChanged,
  isDeleted,
} from '@/lib/storage-sync'

const COLLECTION = 'trips'

export async function getTrips(limitCount = 100): Promise<Trip[]> {
  const localFallback = getStoredTrips()

  return withCache(
    `trips:list:${limitCount}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Trip))
        .filter(t => !isDeleted('trips', t.id) && (!t.tripNumber || !isDeleted('trips', t.tripNumber)))

      saveStoredTrips(list)
      return list.length > 0 ? list : getStoredTrips()
    },
    { fallback: localFallback }
  )
}


export async function getRecentTrips(count = 5): Promise<Trip[]> {
  const localFallback = getStoredTrips().slice(0, count)

  return withCache(
    `trips:recent:${count}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(count))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
      return list.length > 0 ? list : localFallback
    },
    { fallback: localFallback }
  )
}

export async function getTripById(id: string): Promise<Trip | null> {
  const local = getStoredTrips().find(t => t.id === id || t.tripNumber === id) || null

  return withCache(
    `trips:id:${id}`,
    async () => {
      await waitForAuthReady()
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (!snap.exists()) return local
      return { id: snap.id, ...snap.data() } as Trip
    },
    { fallback: local }
  )
}

export async function getTodayTrips(): Promise<Trip[]> {
  const today = new Date().toISOString().split('T')[0]
  const localFallback = getStoredTrips().filter(t => t.tripDate === today)

  return withCache(
    `trips:today:${today}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('tripDate', '==', today))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
      return list.length > 0 ? list : localFallback
    },
    { fallback: localFallback }
  )
}

export async function getTripsByStatus(status: TripStatus): Promise<Trip[]> {
  const localFallback = getStoredTrips().filter(t => t.status === status)

  return withCache(
    `trips:status:${status}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
      return list.length > 0 ? list : localFallback
    },
    { fallback: localFallback }
  )
}

export async function createTrip(data: Omit<Trip, 'id' | 'tripNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const tripNum = generateTripNumber()

  let docId = `trip_${Date.now()}`
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      tripNumber: tripNum,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[TripsService] Firestore write fallback to local:', err)
  }

  const createdTrip: Trip = {
    id: docId,
    tripNumber: tripNum,
    ...data,
    createdAt: now,
    updatedAt: now,
  }

  upsertStoredTrip(createdTrip)
  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('trips')

  return docId
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<void> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const updateData = {
    ...data,
    updatedAt: now,
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), updateData)
  } catch (err) {
    console.warn('[TripsService] Firestore update fallback to local:', err)
  }

  const currentList = getStoredTrips()
  const existing = currentList.find(t => t.id === id || t.tripNumber === id)
  if (existing) {
    upsertStoredTrip({ ...existing, ...updateData } as Trip)
  }

  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('trips')
}

export async function deleteTrip(id: string): Promise<void> {
  await waitForAuthReady()
  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (err) {
    console.warn('[TripsService] Firestore delete by ID fallback:', err)
  }

  try {
    const q = query(collection(db, COLLECTION), where('tripNumber', '==', id))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      await deleteDoc(d.ref)
    }
  } catch {}

  removeStoredTrip(id)
  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('trips')
  notifyDataChanged('all')
}
