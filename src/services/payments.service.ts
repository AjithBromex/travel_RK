import {
  collection, doc, getDocs, addDoc, deleteDoc, updateDoc,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Payment, Trip } from '@/types'
import { withCache, invalidateCache } from '@/lib/cache'
import {
  waitForAuthReady,
  getStoredPayments,
  saveStoredPayments,
  upsertStoredPayment,
  removeStoredPayment,
  getStoredTrips,
  upsertStoredTrip,
  notifyDataChanged,
  isDeleted,
  markAsDeleted,
} from '@/lib/storage-sync'

const COLLECTION = 'payments'

export function isPaymentLinkedToTrip(payment: Partial<Payment>, trip: Partial<Trip>): boolean {
  if (!payment || !payment.tripId || payment.tripId === 'general') return false;
  const pId = String(payment.tripId).trim().toLowerCase();
  const tId = String(trip.id || '').trim().toLowerCase();
  const tNum = String(trip.tripNumber || '').trim().toLowerCase();
  const tRec = String(trip.receiptNumber || '').trim().toLowerCase();

  return (
    (tId !== '' && pId === tId) ||
    (tNum !== '' && pId === tNum) ||
    (tRec !== '' && pId === tRec) ||
    (tRec !== '' && pId.replace(/^#/, '') === tRec.replace(/^#/, '')) ||
    (Boolean((payment as any).tripNumber) && (String((payment as any).tripNumber).trim().toLowerCase() === tId || String((payment as any).tripNumber).trim().toLowerCase() === tNum))
  );
}

export function reconcileTripWithPayments(trip: Trip, allPayments?: Payment[]): Trip {
  const paymentsList = allPayments || getStoredPayments();
  const activePayments = paymentsList.filter(
    (p) => !isDeleted('payments', p.id) && isPaymentLinkedToTrip(p, trip)
  );

  const customerPayments = activePayments.filter((p) => p.type === 'customer_received');
  const customerPaidSum = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const driverPaidSum = activePayments
    .filter((p) => p.type === 'driver_payment')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Check how much advance payment is already recorded in active payments
  const advancePayments = customerPayments.filter(
    (p) => p.paymentStage === 'advance' || (p.notes && /advance/i.test(p.notes))
  );
  const advanceFromPayments = advancePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // If active customer payments exist for this trip, customerPaid is strictly customerPaidSum
  // and advanceReceived is advanceFromPayments.
  // If no customer payments are linked at all, fall back to trip.advanceReceived (e.g. legacy trips)
  const hasLinkedCustomerPayments = customerPayments.length > 0;
  const tripAdvance = Number(trip.advanceReceived) || 0;

  const trueCustomerPaid = hasLinkedCustomerPayments ? customerPaidSum : tripAdvance;
  const effectiveAdvanceReceived = hasLinkedCustomerPayments ? advanceFromPayments : tripAdvance;

  const totalFare = Number(trip.totalFare ?? (Number(trip.baseFare || 0) + Number(trip.extraKmCharge || 0))) || 0;
  const agreedDriverPay = Number(trip.driverAgreedPay) || 0;

  const trueCustomerBalance = Math.max(0, totalFare - trueCustomerPaid);
  const trueDriverPaid = driverPaidSum;
  const trueDriverBalance = Math.max(0, agreedDriverPay - trueDriverPaid);

  return {
    ...trip,
    advanceReceived: effectiveAdvanceReceived,
    customerPaid: trueCustomerPaid,
    customerBalance: trueCustomerBalance,
    driverPaid: trueDriverPaid,
    driverBalance: trueDriverBalance,
  };
}

export function reconcileTripsWithPayments(trips: Trip[], allPayments?: Payment[]): Trip[] {
  const paymentsList = allPayments || getStoredPayments();
  return (trips || []).map((t) => reconcileTripWithPayments(t, paymentsList));
}

export function sortPaymentsRecentFirst(list: Payment[]): Payment[] {
  return [...list].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (timeA && timeB && timeA !== timeB) return timeB - timeA

    if (a.id && b.id && a.id.startsWith('pay_') && b.id.startsWith('pay_')) {
      const idA = parseInt(a.id.replace('pay_', ''), 10)
      const idB = parseInt(b.id.replace('pay_', ''), 10)
      if (!isNaN(idA) && !isNaN(idB) && idA !== idB) return idB - idA
    }

    const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
    const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
    if (dateA && dateB && dateA !== dateB) return dateB - dateA

    return (b.id || '').localeCompare(a.id || '')
  })
}

export async function getPayments(limitCount = 100): Promise<Payment[]> {
  const localFallback = sortPaymentsRecentFirst(getStoredPayments())

  return withCache(
    `payments:list:${limitCount}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('paymentDate', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Payment))
        .filter(
          p =>
            !isDeleted('payments', p.id) &&
            (!p.tripId || p.tripId === 'general' || !isDeleted('trips', p.tripId))
        )
      const sorted = sortPaymentsRecentFirst(list)
      saveStoredPayments(sorted)
      return sorted
    },
    { fallback: localFallback }
  )
}

export async function getPaymentsByTrip(tripId: string): Promise<Payment[]> {
  if (isDeleted('trips', tripId)) return []
  const localFallback = getStoredPayments().filter(p => p.tripId === tripId)

  return withCache(
    `payments:trip:${tripId}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
      return list
    },
    { fallback: localFallback }
  )
}

export async function createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()

  // Guard against adding balance payment greater than outstanding balance
  if (data.tripId && data.tripId !== 'general') {
    const trips = getStoredTrips()
    const targetTrip = trips.find(t => isPaymentLinkedToTrip(data, t))
    if (targetTrip) {
      if (data.type === 'customer_received' && data.paymentStage === 'balance') {
        const reconciled = reconcileTripWithPayments(targetTrip)
        const remainingBal = Number(reconciled.customerBalance) || 0
        if (remainingBal <= 0) {
          throw new Error('This trip is already fully settled. There is no pending balance due.')
        }
        if (Number(data.amount) > remainingBal) {
          throw new Error(`Balance payment amount (₹${Number(data.amount).toLocaleString('en-IN')}) cannot exceed the remaining balance of ₹${remainingBal.toLocaleString('en-IN')}`)
        }
      }
    }
  }

  let docId = `pay_${Date.now()}`
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[PaymentsService] Firestore write fallback to local:', err)
  }

  const newPayment: Payment = {
    id: docId,
    ...data,
    createdAt: now,
    updatedAt: now,
  }

  upsertStoredPayment(newPayment)

  // Synchronize trip balance if linked to a trip
  if (data.tripId && data.tripId !== 'general') {
    try {
      const trips = getStoredTrips()
      const targetTrip = trips.find(t => isPaymentLinkedToTrip(newPayment, t))
      if (targetTrip) {
        const currentPayments = getStoredPayments()
        const allPaymentsForTrip = [newPayment, ...currentPayments.filter(p => p.id !== newPayment.id)]
        const reconciled = reconcileTripWithPayments(targetTrip, allPaymentsForTrip)

        const tripUpdates: Partial<Trip> = {
          advanceReceived: reconciled.advanceReceived,
          customerPaid: reconciled.customerPaid,
          customerBalance: reconciled.customerBalance,
          driverPaid: reconciled.driverPaid,
          driverBalance: reconciled.driverBalance,
          updatedAt: now,
        }

        upsertStoredTrip({ ...targetTrip, ...tripUpdates })

        try {
          await updateDoc(doc(db, 'trips', targetTrip.id), tripUpdates)
        } catch (tripErr) {
          console.warn('[PaymentsService] Linked trip update fallback to local:', tripErr)
        }
      }
    } catch (syncErr) {
      console.warn('[PaymentsService] Error updating linked trip dues:', syncErr)
    }
  }

  invalidateCache('payments')
  invalidateCache('trips')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('payments')
  notifyDataChanged('trips')

  return docId
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const updateData = {
    ...data,
    updatedAt: now,
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), updateData)
  } catch (err) {
    console.warn('[PaymentsService] Firestore update fallback to local:', err)
  }

  const list = getStoredPayments()
  const existing = list.find(p => p.id === id)
  if (existing) {
    upsertStoredPayment({ ...existing, ...updateData } as Payment)
  }

  invalidateCache('payments')
  invalidateCache('trips')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('payments')
  notifyDataChanged('trips')
  notifyDataChanged('all')
}

export async function deletePayment(id: string): Promise<void> {
  await waitForAuthReady()

  const currentPayments = getStoredPayments()
  let paymentToDelete = currentPayments.find(p => p.id === id)

  if (!paymentToDelete) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (snap.exists()) {
        paymentToDelete = { id: snap.id, ...snap.data() } as Payment
      }
    } catch {}
  }

  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (err) {
    console.warn('[PaymentsService] Firestore delete fallback to local:', err)
  }

  removeStoredPayment(id)
  markAsDeleted('payments', id)

  // Reconcile and update linked trip dues when payment is deleted
  if (paymentToDelete && paymentToDelete.tripId && paymentToDelete.tripId !== 'general') {
    try {
      let remainingPayments = currentPayments.filter(p => p.id !== id && !isDeleted('payments', p.id))
      try {
        const paySnap = await getDocs(query(collection(db, COLLECTION), limit(200)))
        const livePayments = paySnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .filter(p => p.id !== id && !isDeleted('payments', p.id))
        if (livePayments.length > 0) remainingPayments = livePayments
      } catch {}

      let allTrips = getStoredTrips()
      let targetTrip = allTrips.find(t => isPaymentLinkedToTrip(paymentToDelete!, t))

      if (!targetTrip) {
        try {
          const tripSnap = await getDoc(doc(db, 'trips', paymentToDelete.tripId))
          if (tripSnap.exists()) {
            targetTrip = { id: tripSnap.id, ...tripSnap.data() } as Trip
          }
        } catch {}
      }

      if (targetTrip) {
        const reconciled = reconcileTripWithPayments(targetTrip, remainingPayments)
        const now = new Date().toISOString()
        const tripUpdates: Partial<Trip> = {
          advanceReceived: reconciled.advanceReceived,
          customerPaid: reconciled.customerPaid,
          customerBalance: reconciled.customerBalance,
          driverPaid: reconciled.driverPaid,
          driverBalance: reconciled.driverBalance,
          updatedAt: now,
        }

        upsertStoredTrip({ ...targetTrip, ...tripUpdates })

        try {
          await updateDoc(doc(db, 'trips', targetTrip.id), tripUpdates)
        } catch (tripErr) {
          console.warn('[PaymentsService] Linked trip update fallback to local on delete:', tripErr)
        }
      }
    } catch (syncErr) {
      console.warn('[PaymentsService] Error reconciling linked trip dues on delete:', syncErr)
    }
  }

  invalidateCache('payments')
  invalidateCache('trips')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('payments')
  notifyDataChanged('trips')
  notifyDataChanged('all')
}
