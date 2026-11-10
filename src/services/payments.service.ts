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
} from '@/lib/storage-sync'

const COLLECTION = 'payments'

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

  let customerName = data.customerName || ''
  let tripRef = data.tripRef || ''
  if ((!customerName || !tripRef) && data.tripId && data.tripId !== 'general') {
    try {
      const trips = getStoredTrips()
      const trip = trips.find(t => t.id === data.tripId || t.tripNumber === data.tripId)
      if (trip) {
        if (!customerName) customerName = trip.customerName || (trip as any).customer || ''
        if (!tripRef && trip.from && trip.to) tripRef = `${trip.from} → ${trip.to}`
      }
    } catch {}
  }

  const payload = {
    ...data,
    ...(customerName ? { customerName } : {}),
    ...(tripRef ? { tripRef } : {}),
  }

  let docId = `pay_${Date.now()}`
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...payload,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[PaymentsService] Firestore write fallback to local:', err)
  }

  const newPayment: Payment = {
    id: docId,
    ...payload,
    createdAt: now,
    updatedAt: now,
  }

  upsertStoredPayment(newPayment)

  // Synchronize trip balance if linked to a trip
  if (data.tripId && data.tripId !== 'general') {
    try {
      const trips = getStoredTrips()
      const trip = trips.find(t => t.id === data.tripId || t.tripNumber === data.tripId)
      if (trip) {
        let updatedCustomerPaid = Number(trip.customerPaid) || 0
        let updatedCustomerBalance = Number(trip.customerBalance) || 0
        let updatedDriverPaid = Number(trip.driverPaid) || 0
        let updatedDriverBalance = Number(trip.driverBalance) || 0

        if (data.type === 'customer_received') {
          updatedCustomerPaid += Number(data.amount) || 0
          const total = Number(trip.totalFare) || 0
          updatedCustomerBalance = Math.max(0, total - updatedCustomerPaid)
        } else if (data.type === 'driver_payment') {
          updatedDriverPaid += Number(data.amount) || 0
          const agreed = Number(trip.driverAgreedPay) || 0
          updatedDriverBalance = Math.max(0, agreed - updatedDriverPaid)
        }

        const tripUpdates: Partial<Trip> = {
          customerPaid: updatedCustomerPaid,
          customerBalance: updatedCustomerBalance,
          driverPaid: updatedDriverPaid,
          driverBalance: updatedDriverBalance,
          updatedAt: now,
        }

        upsertStoredTrip({ ...trip, ...tripUpdates })

        try {
          await updateDoc(doc(db, 'trips', trip.id), tripUpdates)
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
  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (err) {
    console.warn('[PaymentsService] Firestore delete fallback to local:', err)
  }

  removeStoredPayment(id)
  invalidateCache('payments')
  invalidateCache('trips')
  invalidateCache('cashbook')
  invalidateCache('reports')
  invalidateCache('dashboard')
  notifyDataChanged('payments')
  notifyDataChanged('trips')
}
