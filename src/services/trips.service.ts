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
  getStoredPayments,
  removeStoredPayment,
  getStoredExpenses,
  removeStoredExpense,
  markAsDeleted,
  getLocalData,
  setLocalData,
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

  // 1. Resolve Trip details to get ID, tripNumber, and related aliases
  const storedList = getStoredTrips()
  const matchedStored = storedList.find(t => t.id === id || t.tripNumber === id)

  let tripNumber = matchedStored?.tripNumber || ''
  let tripDocId = matchedStored?.id || id

  if (!tripNumber) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (snap.exists()) {
        const data = snap.data() as Trip
        tripNumber = data.tripNumber || ''
        tripDocId = snap.id
      }
    } catch {}
  }

  // Collect all possible identifiers for this trip
  const tripIdentifiers = new Set<string>()
  if (id) tripIdentifiers.add(id)
  if (tripDocId) tripIdentifiers.add(tripDocId)
  if (tripNumber) tripIdentifiers.add(tripNumber)
  const idArray = Array.from(tripIdentifiers)

  // 2. Cascade delete PAYMENTS
  try {
    for (const ident of idArray) {
      try {
        const qTripId = query(collection(db, 'payments'), where('tripId', '==', ident))
        const snapTripId = await getDocs(qTripId)
        for (const d of snapTripId.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch (err) {
        console.warn('[TripsService] Error querying payments by tripId:', err)
      }

      try {
        const qTripNum = query(collection(db, 'payments'), where('tripNumber', '==', ident))
        const snapTripNum = await getDocs(qTripNum)
        for (const d of snapTripNum.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch {}

      try {
        const qTripRef = query(collection(db, 'payments'), where('tripRef', '==', ident))
        const snapTripRef = await getDocs(qTripRef)
        for (const d of snapTripRef.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch {}
    }

    // Cascade delete local payments
    const localPayments = getStoredPayments()
    const paymentsToDelete = localPayments.filter(
      p =>
        tripIdentifiers.has(p.tripId) ||
        ((p as any).tripNumber && tripIdentifiers.has((p as any).tripNumber)) ||
        ((p as any).tripRef && tripIdentifiers.has((p as any).tripRef))
    )
    for (const p of paymentsToDelete) {
      removeStoredPayment(p.id)
      markAsDeleted('payments', p.id)
    }
  } catch (err) {
    console.warn('[TripsService] Cascade delete payments error:', err)
  }

  // 3. Cascade delete EXPENSES
  try {
    for (const ident of idArray) {
      try {
        const qExpId = query(collection(db, 'expenses'), where('tripId', '==', ident))
        const snapExpId = await getDocs(qExpId)
        for (const d of snapExpId.docs) {
          markAsDeleted('expenses', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch (err) {
        console.warn('[TripsService] Error querying expenses by tripId:', err)
      }

      try {
        const qExpNum = query(collection(db, 'expenses'), where('tripNumber', '==', ident))
        const snapExpNum = await getDocs(qExpNum)
        for (const d of snapExpNum.docs) {
          markAsDeleted('expenses', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch {}
    }

    // Cascade delete local expenses
    const localExpenses = getStoredExpenses()
    const expensesToDelete = localExpenses.filter(
      e =>
        (e.tripId && tripIdentifiers.has(e.tripId)) ||
        (e.tripNumber && tripIdentifiers.has(e.tripNumber))
    )
    for (const e of expensesToDelete) {
      removeStoredExpense(e.id)
      markAsDeleted('expenses', e.id)
    }
  } catch (err) {
    console.warn('[TripsService] Cascade delete expenses error:', err)
  }

  // 4. Cascade delete REMINDERS linked to this trip
  try {
    for (const ident of idArray) {
      try {
        const qRem = query(collection(db, 'reminders'), where('relatedEntityId', '==', ident))
        const snapRem = await getDocs(qRem)
        for (const d of snapRem.docs) {
          markAsDeleted('reminders', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[TripsService] Cascade delete reminders error:', err)
  }

  // 5. Cascade delete CASHBOOK entries if any standalone exist
  try {
    for (const ident of idArray) {
      try {
        const qCb = query(collection(db, 'cashbook'), where('tripId', '==', ident))
        const snapCb = await getDocs(qCb)
        for (const d of snapCb.docs) {
          markAsDeleted('cashbook', d.id)
          await deleteDoc(d.ref).catch(() => {})
        }
      } catch {}
    }
    const localCb = getLocalData<any[]>('cashbook', [])
    if (localCb && localCb.length > 0) {
      const remainingCb = localCb.filter(
        c => !tripIdentifiers.has(c.tripId) && !tripIdentifiers.has(c.refId)
      )
      setLocalData('cashbook', remainingCb)
    }
  } catch {}

  // 6. Delete TRIP itself from Firestore
  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (err) {
    console.warn('[TripsService] Firestore delete by ID fallback:', err)
  }

  if (tripDocId && tripDocId !== id) {
    try {
      await deleteDoc(doc(db, COLLECTION, tripDocId))
    } catch {}
  }

  for (const ident of idArray) {
    try {
      const q = query(collection(db, COLLECTION), where('tripNumber', '==', ident))
      const snap = await getDocs(q)
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => {})
      }
    } catch {}
  }

  // Remove trip from local storage & mark as deleted
  for (const ident of idArray) {
    removeStoredTrip(ident)
    markAsDeleted('trips', ident)
  }

  // 7. Invalidate all associated caches
  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('expenses')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  invalidateCache('reminders')

  // 8. Broadcast data change notifications across all pages & tabs
  notifyDataChanged('trips')
  notifyDataChanged('payments')
  notifyDataChanged('expenses')
  notifyDataChanged('cashbook')
  notifyDataChanged('dashboard')
  notifyDataChanged('all')
}
