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
  saveStoredExpenses,
  removeStoredExpense,
  markAsDeleted,
  unmarkDeleted,
  getLocalData,
  setLocalData,
  notifyDataChanged,
  isDeleted,
} from '@/lib/storage-sync'
import { moveToTrash } from './trash.service'
import {
  reconcileTripsWithPayments,
  reconcileTripWithPayments,
  createPayment,
  updatePayment,
  deletePayment,
  isPaymentLinkedToTrip,
} from './payments.service'

export {
  reconcileTripsWithPayments,
  reconcileTripWithPayments,
  isPaymentLinkedToTrip,
} from './payments.service'

const COLLECTION = 'trips'

export async function getTrips(limitCount = 100): Promise<Trip[]> {
  const localFallback = reconcileTripsWithPayments(getStoredTrips(), getStoredPayments(), getStoredExpenses())

  return withCache(
    `trips:list:${limitCount}`,
    async () => {
      await waitForAuthReady()
      const baseCol = collection(db, COLLECTION)
      let snap
      try {
        const q = query(baseCol, orderBy('createdAt', 'desc'), limit(limitCount))
        snap = await getDocs(q)
      } catch {
        snap = await getDocs(query(baseCol, limit(limitCount)))
      }
      const list = snap.docs
        .map(d => {
          const data = d.data() as Trip
          return {
            ...data,
            id: d.id,
            createdAt: data.createdAt || data.updatedAt || (data as any).restoredAt || new Date().toISOString(),
            status: data.status || 'scheduled',
            customerName: data.customerName || (data as any).customer || data.tripNumber || d.id,
            tripDate: data.tripDate || (data as any).startDate || new Date().toISOString().slice(0, 10),
            baseFare: Number(data.baseFare ?? (data.totalFare || (data as any).amount || 0)),
            totalFare: Number(data.totalFare || (data as any).amount || 0),
            from: data.from || 'Tirur',
            to: data.to || 'Chennai',
          } as Trip
        })
        .filter(t => {
          if (t.isDeleted) return false
          if (isDeleted('trips', t.id)) {
            unmarkDeleted('trips', t.id)
            if (t.tripNumber) unmarkDeleted('trips', t.tripNumber)
          }
          return true
        })
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

      let paymentsList = getStoredPayments()
      try {
        const paySnap = await getDocs(query(collection(db, 'payments'), limit(200)))
        const cloudPayments = paySnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .filter(p => {
            if (p.isDeleted) return false
            if (isDeleted('payments', p.id)) {
              unmarkDeleted('payments', p.id)
            }
            return true
          })
        saveStoredPayments(cloudPayments)
        paymentsList = cloudPayments
      } catch {}

      let expensesList = getStoredExpenses()
      try {
        const expSnap = await getDocs(query(collection(db, 'expenses'), limit(200)))
        const cloudExpenses = expSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Expense))
          .filter(e => {
            if (e.isDeleted) return false
            if (isDeleted('expenses', e.id)) {
              unmarkDeleted('expenses', e.id)
            }
            return true
          })
        saveStoredExpenses(cloudExpenses)
        expensesList = cloudExpenses
      } catch {}

      const reconciled = reconcileTripsWithPayments(list, paymentsList, expensesList)
      saveStoredTrips(reconciled)

      // Sync Firestore trip documents if they differ from reconciled amounts
      reconciled.forEach((rTrip) => {
        const raw = list.find((t) => t.id === rTrip.id)
        if (
          raw &&
          (Number(raw.totalFare || 0) !== Number(rTrip.totalFare || 0) ||
            Number(raw.advanceReceived || 0) !== Number(rTrip.advanceReceived || 0) ||
            Number(raw.customerPaid || 0) !== Number(rTrip.customerPaid || 0) ||
            Number(raw.customerBalance || 0) !== Number(rTrip.customerBalance || 0))
        ) {
          try {
            updateDoc(doc(db, COLLECTION, rTrip.id), {
              baseFare: rTrip.baseFare,
              totalFare: rTrip.totalFare,
              totalExpenses: (rTrip as any).totalExpenses || 0,
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
  const localFallback = reconcileTripsWithPayments(getStoredTrips().slice(0, count), getStoredPayments(), getStoredExpenses())

  return withCache(
    `trips:recent:${count}`,
    async () => {
      await waitForAuthReady()
      const baseCol = collection(db, COLLECTION)
      let snap
      try {
        const q = query(baseCol, orderBy('createdAt', 'desc'), limit(count))
        snap = await getDocs(q)
      } catch {
        snap = await getDocs(query(baseCol, limit(count)))
      }
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Trip))
        .filter(t => {
          if (t.isDeleted) return false
          if (isDeleted('trips', t.id)) {
            unmarkDeleted('trips', t.id)
            if (t.tripNumber) unmarkDeleted('trips', t.tripNumber)
          }
          return true
        })
      return reconcileTripsWithPayments(list, getStoredPayments())
    },
    { fallback: localFallback }
  )
}

export async function getTripById(id: string): Promise<Trip | null> {
  const local = getStoredTrips().find(t => t.id === id || t.tripNumber === id) || null
  const localReconciled = local ? reconcileTripWithPayments(local) : null

  return withCache(
    `trips:id:${id}`,
    async () => {
      await waitForAuthReady()
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (!snap.exists()) return localReconciled
      const cloudTrip = { id: snap.id, ...snap.data() } as Trip
      return reconcileTripWithPayments(cloudTrip)
    },
    { fallback: localReconciled }
  )
}

export async function getTodayTrips(): Promise<Trip[]> {
  const today = new Date().toISOString().split('T')[0]
  const localFallback = reconcileTripsWithPayments(getStoredTrips().filter(t => t.tripDate === today))

  return withCache(
    `trips:today:${today}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('tripDate', '==', today))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
      return reconcileTripsWithPayments(list)
    },
    { fallback: localFallback }
  )
}

export async function getTripsByStatus(status: TripStatus): Promise<Trip[]> {
  const localFallback = reconcileTripsWithPayments(getStoredTrips().filter(t => t.status === status))

  return withCache(
    `trips:status:${status}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip))
      return reconcileTripsWithPayments(list)
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

  // 1. Instantly purge from local storage (0ms UI latency!)
  for (const ident of idArray) {
    removeStoredTrip(ident)
    markAsDeleted('trips', ident)
  }

  const localPayments = getStoredPayments()
  const paymentsToDelete = localPayments.filter(
    (p) =>
      tripIdentifiers.has(p.tripId) ||
      ((p as any).tripNumber && tripIdentifiers.has((p as any).tripNumber)) ||
      ((p as any).tripRef && tripIdentifiers.has((p as any).tripRef))
  )
  for (const p of paymentsToDelete) {
    removeStoredPayment(p.id)
    markAsDeleted('payments', p.id)
  }

  const localExpenses = getStoredExpenses()
  const expensesToDelete = localExpenses.filter(
    (e) =>
      (e.tripId && tripIdentifiers.has(e.tripId)) ||
      (e.tripNumber && tripIdentifiers.has(e.tripNumber))
  )
  for (const e of expensesToDelete) {
    removeStoredExpense(e.id)
    markAsDeleted('expenses', e.id)
  }

  const localCb = getLocalData<any[]>('cashbook', [])
  if (localCb && localCb.length > 0) {
    const remainingCb = localCb.filter(
      (c) => !tripIdentifiers.has(c.tripId) && !tripIdentifiers.has(c.refId)
    )
    setLocalData('cashbook', remainingCb)
  }

  // 2. Cascade soft-delete Cloud Firestore records in parallel
  const cascadeTasks: Promise<any>[] = []

  // Soft-delete linked payments
  try {
    for (const ident of idArray) {
      const qPay = query(collection(db, 'payments'), where('tripId', '==', ident))
      const paySnap = await getDocs(qPay)
      for (const d of paySnap.docs) {
        markAsDeleted('payments', d.id)
        cascadeTasks.push(moveToTrash('payments', d.id, `Cascade soft-delete from Trip #${id}`))
      }
    }
  } catch (err) {
    console.warn('[TripsService] Error querying payments for trip deletion:', err)
  }

  // Soft-delete linked expenses
  try {
    for (const ident of idArray) {
      const qExp = query(collection(db, 'expenses'), where('tripId', '==', ident))
      const expSnap = await getDocs(qExp)
      for (const d of expSnap.docs) {
        markAsDeleted('expenses', d.id)
        cascadeTasks.push(moveToTrash('expenses', d.id, `Cascade soft-delete from Trip #${id}`))
      }
    }
  } catch (err) {
    console.warn('[TripsService] Error querying expenses for trip deletion:', err)
  }

  // Soft-delete linked reminders
  try {
    for (const ident of idArray) {
      const qRem = query(collection(db, 'reminders'), where('relatedEntityId', '==', ident))
      cascadeTasks.push(
        getDocs(qRem).then((snap) => {
          for (const d of snap.docs) {
            markAsDeleted('reminders', d.id)
            moveToTrash('reminders', d.id, `Cascade soft-delete from Trip #${ident}`).catch(() => {})
          }
        }).catch(() => {})
      )
    }
  } catch {}

  // Soft-delete trip document itself
  for (const ident of idArray) {
    cascadeTasks.push(moveToTrash('trips', ident, 'Trip deleted').catch(() => {}))
  }

  // Await all cascade tasks concurrently in parallel
  await Promise.allSettled(cascadeTasks)

  // 7. Invalidate caches and broadcast change immediately
  invalidateCache('trips')
  invalidateCache('payments')
  invalidateCache('expenses')
  invalidateCache('cashbook')
  invalidateCache('dashboard')
  invalidateCache('reports')
  invalidateCache('trash')

  notifyDataChanged('trips')
  notifyDataChanged('payments')
  notifyDataChanged('expenses')
  notifyDataChanged('cashbook')
  notifyDataChanged('dashboard')
  notifyDataChanged('trash')
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
