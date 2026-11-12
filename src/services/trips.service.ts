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
import type { Trip, TripStatus, Payment, Expense } from '@/types'
import { generateTripNumber } from '@/lib/utils'
import { withCache, invalidateCache } from '@/lib/cache'
import {
  waitForAuthReady,
  getStoredTrips,
  saveStoredTrips,
  upsertStoredTrip,
  removeStoredTrip,
  getStoredPayments,
  saveStoredPayments,
  removeStoredPayment,
  getStoredExpenses,
  removeStoredExpense,
  markAsDeleted,
  getLocalData,
  setLocalData,
  notifyDataChanged,
  isDeleted,
} from '@/lib/storage-sync'
import {
  reconcileTripsWithPayments,
  createPayment,
  updatePayment,
  deletePayment,
  isPaymentLinkedToTrip,
} from './payments.service'

const COLLECTION = 'trips'

export async function getTrips(limitCount = 100): Promise<Trip[]> {
  const localFallback = reconcileTripsWithPayments(getStoredTrips(), getStoredPayments())

  return withCache(
    `trips:list:${limitCount}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Trip))
        .filter(t => !isDeleted('trips', t.id) && (!t.tripNumber || !isDeleted('trips', t.tripNumber)))

      let paymentsList = getStoredPayments()
      try {
        const paySnap = await getDocs(query(collection(db, 'payments'), limit(200)))
        const cloudPayments = paySnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .filter(p => !isDeleted('payments', p.id))
        saveStoredPayments(cloudPayments)
        paymentsList = cloudPayments
      } catch {}

      const reconciled = reconcileTripsWithPayments(list, paymentsList)
      saveStoredTrips(reconciled)

      // Sync Firestore trip documents if they differ from reconciled amounts
      reconciled.forEach((rTrip) => {
        const raw = list.find((t) => t.id === rTrip.id)
        if (
          raw &&
          (Number(raw.advanceReceived || 0) !== Number(rTrip.advanceReceived || 0) ||
            Number(raw.customerPaid || 0) !== Number(rTrip.customerPaid || 0) ||
            Number(raw.customerBalance || 0) !== Number(rTrip.customerBalance || 0))
        ) {
          try {
            updateDoc(doc(db, COLLECTION, rTrip.id), {
              advanceReceived: rTrip.advanceReceived,
              customerPaid: rTrip.customerPaid,
              customerBalance: rTrip.customerBalance,
              updatedAt: new Date().toISOString(),
            }).catch(() => {})
          } catch {}
        }
      })

      return reconciled
    },
    { fallback: localFallback }
  )
}

export async function getRecentTrips(count = 5): Promise<Trip[]> {
  const localFallback = reconcileTripsWithPayments(getStoredTrips().slice(0, count), getStoredPayments())

  return withCache(
    `trips:recent:${count}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(count))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Trip))
        .filter(t => !isDeleted('trips', t.id) && (!t.tripNumber || !isDeleted('trips', t.tripNumber)))
      return reconcileTripsWithPayments(list, getStoredPayments())
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
      return list
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
      return list
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

  // Automatically record advance payment voucher in payments if advance is received at booking
  if (Number(data.advanceReceived) > 0) {
    try {
      await createPayment({
        tripId: tripNum,
        type: 'customer_received',
        paymentStage: 'advance',
        amount: Number(data.advanceReceived),
        paymentDate: data.tripDate || now.split('T')[0],
        paymentMode: 'cash',
        notes: `Advance payment received at booking for Trip #${tripNum} (${data.customerName || 'Customer'})`,
      })
    } catch (advErr) {
      console.warn('[TripsService] Could not auto-create advance payment voucher:', advErr)
    }
  }

  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('trips')
  notifyDataChanged('payments')
  notifyDataChanged('all')

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

  // Synchronize advance payment voucher if advanceReceived was modified
  if (data.advanceReceived !== undefined) {
    try {
      const advAmt = Number(data.advanceReceived)
      const allPayments = getStoredPayments()
      const existingAdvPayment = allPayments.find(
        (p) =>
          !isDeleted('payments', p.id) &&
          p.type === 'customer_received' &&
          (p.paymentStage === 'advance' || (p.notes && /advance/i.test(p.notes))) &&
          isPaymentLinkedToTrip(p, { id, tripNumber: existing?.tripNumber })
      )

      if (existingAdvPayment && advAmt > 0 && Number(existingAdvPayment.amount) !== advAmt) {
        await updatePayment(existingAdvPayment.id, {
          amount: advAmt,
          notes: `Advance payment received at booking for Trip #${existing?.tripNumber || id}`,
        })
      } else if (!existingAdvPayment && advAmt > 0) {
        await createPayment({
          tripId: existing?.tripNumber || id,
          type: 'customer_received',
          paymentStage: 'advance',
          amount: advAmt,
          paymentDate: data.tripDate || existing?.tripDate || now.split('T')[0],
          paymentMode: 'cash',
          notes: `Advance payment received at booking for Trip #${existing?.tripNumber || id}`,
        })
      } else if (existingAdvPayment && advAmt === 0) {
        await deletePayment(existingAdvPayment.id)
      }
    } catch (syncAdvErr) {
      console.warn('[TripsService] Error updating advance payment on trip update:', syncAdvErr)
    }
  }

  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('trips')
  notifyDataChanged('payments')
  notifyDataChanged('all')
}

export async function deleteTrip(tripOrId: string | Trip): Promise<void> {
  await waitForAuthReady()

  const id = typeof tripOrId === 'string' ? tripOrId : tripOrId.id
  const tripObj = typeof tripOrId === 'object' ? tripOrId : null

  // 1. Resolve Trip details to get ID, tripNumber, receiptNumber, and related aliases
  const storedList = getStoredTrips()
  const matchedStored = storedList.find(
    t => t.id === id || t.tripNumber === id || (t.receiptNumber && t.receiptNumber === id)
  )

  const tripNumber = tripObj?.tripNumber || matchedStored?.tripNumber || ''
  const receiptNumber = tripObj?.receiptNumber || matchedStored?.receiptNumber || ''
  let tripDocId = tripObj?.id || matchedStored?.id || id

  // Collect all possible identifiers for this trip
  const tripIdentifiers = new Set<string>()
  if (id) tripIdentifiers.add(id)
  if (tripDocId) tripIdentifiers.add(tripDocId)
  if (tripNumber) tripIdentifiers.add(tripNumber)
  if (receiptNumber) {
    tripIdentifiers.add(receiptNumber)
    tripIdentifiers.add(receiptNumber.replace(/^#/, ''))
    tripIdentifiers.add(`#${receiptNumber.replace(/^#/, '')}`)
  }

  // Also query Firestore for any trip doc matching this ID, tripNumber, or receiptNumber
  try {
    const directDoc = await getDoc(doc(db, COLLECTION, id))
    if (directDoc.exists()) {
      tripDocId = directDoc.id
      tripIdentifiers.add(directDoc.id)
      const data = directDoc.data() as Trip
      if (data.tripNumber) tripIdentifiers.add(data.tripNumber)
      if (data.receiptNumber) {
        tripIdentifiers.add(data.receiptNumber)
        tripIdentifiers.add(data.receiptNumber.replace(/^#/, ''))
        tripIdentifiers.add(`#${data.receiptNumber.replace(/^#/, '')}`)
      }
    }
  } catch (err) {
    console.warn('[TripsService] Direct doc fetch error:', err)
  }

  // Also query trips by tripNumber and receiptNumber
  for (const ident of Array.from(tripIdentifiers)) {
    try {
      const qNum = query(collection(db, COLLECTION), where('tripNumber', '==', ident))
      const snapNum = await getDocs(qNum)
      snapNum.docs.forEach(d => {
        tripIdentifiers.add(d.id)
        const dt = d.data() as Trip
        if (dt.tripNumber) tripIdentifiers.add(dt.tripNumber)
        if (dt.receiptNumber) {
          tripIdentifiers.add(dt.receiptNumber)
          tripIdentifiers.add(dt.receiptNumber.replace(/^#/, ''))
        }
      })
    } catch {}

    try {
      const qRec = query(collection(db, COLLECTION), where('receiptNumber', '==', ident))
      const snapRec = await getDocs(qRec)
      snapRec.docs.forEach(d => {
        tripIdentifiers.add(d.id)
        const dt = d.data() as Trip
        if (dt.tripNumber) tripIdentifiers.add(dt.tripNumber)
        if (dt.receiptNumber) {
          tripIdentifiers.add(dt.receiptNumber)
          tripIdentifiers.add(dt.receiptNumber.replace(/^#/, ''))
        }
      })
    } catch {}
  }

  const idArray = Array.from(tripIdentifiers)

  // 2. Cascade delete PAYMENTS in Firestore & local
  try {
    for (const ident of idArray) {
      try {
        const qTripId = query(collection(db, 'payments'), where('tripId', '==', ident))
        const snapTripId = await getDocs(qTripId)
        for (const d of snapTripId.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref)
        }
      } catch (err) {
        console.warn('[TripsService] Error querying payments by tripId:', err)
      }

      try {
        const qTripNum = query(collection(db, 'payments'), where('tripNumber', '==', ident))
        const snapTripNum = await getDocs(qTripNum)
        for (const d of snapTripNum.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref)
        }
      } catch {}

      try {
        const qTripRef = query(collection(db, 'payments'), where('tripRef', '==', ident))
        const snapTripRef = await getDocs(qTripRef)
        for (const d of snapTripRef.docs) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref)
        }
      } catch {}
    }

    // Comprehensive scan of all payments in Firestore to ensure no linked payment was missed
    try {
      const allPaymentsSnap = await getDocs(collection(db, 'payments'))
      for (const d of allPaymentsSnap.docs) {
        const p = d.data() as Payment
        const isLinked =
          (p.tripId && tripIdentifiers.has(p.tripId)) ||
          ((p as any).tripNumber && tripIdentifiers.has((p as any).tripNumber)) ||
          ((p as any).tripRef && tripIdentifiers.has((p as any).tripRef))
        if (isLinked) {
          markAsDeleted('payments', d.id)
          await deleteDoc(d.ref)
        }
      }
    } catch (err) {
      console.warn('[TripsService] Error scanning all payments for trip deletion:', err)
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

  // 3. Cascade delete EXPENSES in Firestore & local
  try {
    for (const ident of idArray) {
      try {
        const qExpId = query(collection(db, 'expenses'), where('tripId', '==', ident))
        const snapExpId = await getDocs(qExpId)
        for (const d of snapExpId.docs) {
          markAsDeleted('expenses', d.id)
          await deleteDoc(d.ref)
        }
      } catch (err) {
        console.warn('[TripsService] Error querying expenses by tripId:', err)
      }

      try {
        const qExpNum = query(collection(db, 'expenses'), where('tripNumber', '==', ident))
        const snapExpNum = await getDocs(qExpNum)
        for (const d of snapExpNum.docs) {
          markAsDeleted('expenses', d.id)
          await deleteDoc(d.ref)
        }
      } catch {}
    }

    // Scan all expenses in Firestore
    try {
      const allExpSnap = await getDocs(collection(db, 'expenses'))
      for (const d of allExpSnap.docs) {
        const e = d.data() as Expense
        const isLinked =
          (e.tripId && tripIdentifiers.has(e.tripId)) ||
          ((e as any).tripNumber && tripIdentifiers.has((e as any).tripNumber))
        if (isLinked) {
          markAsDeleted('expenses', d.id)
          await deleteDoc(d.ref)
        }
      }
    } catch (err) {
      console.warn('[TripsService] Error scanning all expenses for trip deletion:', err)
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
          await deleteDoc(d.ref)
        }
      } catch {}

      try {
        const qRemTrip = query(collection(db, 'reminders'), where('tripId', '==', ident))
        const snapRemTrip = await getDocs(qRemTrip)
        for (const d of snapRemTrip.docs) {
          markAsDeleted('reminders', d.id)
          await deleteDoc(d.ref)
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[TripsService] Cascade delete reminders error:', err)
  }

  // 5. Cascade delete CASHBOOK entries if any standalone exist in Firestore
  try {
    for (const ident of idArray) {
      try {
        const qCb = query(collection(db, 'cashbook'), where('tripId', '==', ident))
        const snapCb = await getDocs(qCb)
        for (const d of snapCb.docs) {
          markAsDeleted('cashbook', d.id)
          await deleteDoc(d.ref)
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
  for (const ident of idArray) {
    try {
      await deleteDoc(doc(db, COLLECTION, ident))
    } catch (err) {
      console.warn(`[TripsService] Firestore deleteDoc /trips/${ident}:`, err)
    }

    try {
      const qNum = query(collection(db, COLLECTION), where('tripNumber', '==', ident))
      const snapNum = await getDocs(qNum)
      for (const d of snapNum.docs) {
        await deleteDoc(d.ref)
      }
    } catch {}

    try {
      const qRec = query(collection(db, COLLECTION), where('receiptNumber', '==', ident))
      const snapRec = await getDocs(qRec)
      for (const d of snapRec.docs) {
        await deleteDoc(d.ref)
      }
    } catch {}
  }

  // Remove trip from local storage & mark as deleted
  for (const ident of idArray) {
    removeStoredTrip(ident)
    markAsDeleted('trips', ident)
  }

  // 7. Run purge to clean any remaining orphan database records
  await purgeOrphanedTripData().catch(() => {})

  // 8. Invalidate all associated caches
  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('expenses')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  invalidateCache('reminders')

  // 9. Broadcast data change notifications across all pages & tabs
  notifyDataChanged('trips')
  notifyDataChanged('payments')
  notifyDataChanged('all')
  notifyDataChanged('payments')
  notifyDataChanged('expenses')
  notifyDataChanged('cashbook')
  notifyDataChanged('dashboard')
  notifyDataChanged('all')
}

/**
 * Scans Firestore and purges any payments, expenses, or records
 * whose associated parent trip was deleted or no longer exists.
 */
export async function purgeOrphanedTripData(): Promise<{ deletedPayments: number; deletedExpenses: number }> {
  await waitForAuthReady()
  let deletedPayments = 0
  let deletedExpenses = 0

  try {
    // 1. Get all active trips from Firestore
    const tripsSnap = await getDocs(collection(db, COLLECTION))
    const validTripIdentifiers = new Set<string>()

    tripsSnap.docs.forEach(d => {
      validTripIdentifiers.add(d.id)
      const data = d.data() as Trip
      if (data.tripNumber) validTripIdentifiers.add(data.tripNumber)
      if (data.receiptNumber) {
        validTripIdentifiers.add(data.receiptNumber)
        validTripIdentifiers.add(data.receiptNumber.replace(/^#/, ''))
        validTripIdentifiers.add(`#${data.receiptNumber.replace(/^#/, '')}`)
      }
    })

    // Also include stored trips from local storage
    const stored = getStoredTrips()
    stored.forEach(t => {
      validTripIdentifiers.add(t.id)
      if (t.tripNumber) validTripIdentifiers.add(t.tripNumber)
      if (t.receiptNumber) {
        validTripIdentifiers.add(t.receiptNumber)
        validTripIdentifiers.add(t.receiptNumber.replace(/^#/, ''))
      }
    })

    const deletedTripsRaw = typeof window !== 'undefined' ? localStorage.getItem('rk_deleted_trips') : null
    const locallyDeletedTrips = new Set<string>(deletedTripsRaw ? JSON.parse(deletedTripsRaw) : [])

    // 2. Scan and purge payments linked to non-existent or deleted trips
    const paymentsSnap = await getDocs(collection(db, 'payments'))
    for (const pDoc of paymentsSnap.docs) {
      const p = pDoc.data() as Payment
      const tripRef = p.tripId || (p as any).tripNumber || (p as any).tripRef

      const isOrphan =
        tripRef &&
        tripRef !== 'general' &&
        (locallyDeletedTrips.has(tripRef) || !validTripIdentifiers.has(tripRef))

      if (isOrphan) {
        try {
          await deleteDoc(pDoc.ref)
          deletedPayments++
          markAsDeleted('payments', pDoc.id)
          removeStoredPayment(pDoc.id)
        } catch (err) {
          console.warn('[TripsService] Error purging orphan payment:', pDoc.id, err)
        }
      }
    }

    // 3. Scan and purge expenses linked to non-existent or deleted trips
    const expensesSnap = await getDocs(collection(db, 'expenses'))
    for (const eDoc of expensesSnap.docs) {
      const e = eDoc.data() as Expense
      const tripRef = e.tripId || (e as any).tripNumber

      const isOrphan =
        tripRef &&
        tripRef !== 'general' &&
        (locallyDeletedTrips.has(tripRef) || !validTripIdentifiers.has(tripRef))

      if (isOrphan) {
        try {
          await deleteDoc(eDoc.ref)
          deletedExpenses++
          markAsDeleted('expenses', eDoc.id)
          removeStoredExpense(eDoc.id)
        } catch (err) {
          console.warn('[TripsService] Error purging orphan expense:', eDoc.id, err)
        }
      }
    }

    if (deletedPayments > 0 || deletedExpenses > 0) {
      invalidateCache('payments')
      invalidateCache('expenses')
      invalidateCache('cashbook')
      invalidateCache('dashboard')
      notifyDataChanged('all')
    }
  } catch (err) {
    console.warn('[TripsService] purgeOrphanedTripData error:', err)
  }

  return { deletedPayments, deletedExpenses }
}
