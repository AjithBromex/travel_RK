import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Payment } from '@/types'
import { withCache, invalidateCache } from '@/lib/cache'

const COLLECTION = 'payments'

export async function getPayments(limitCount = 100): Promise<Payment[]> {
  return withCache(
    `payments:list:${limitCount}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('paymentDate', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
    },
    { fallback: [] }
  )
}

export async function getPaymentsByTrip(tripId: string): Promise<Payment[]> {
  return withCache(
    `payments:trip:${tripId}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
    },
    { fallback: [] }
  )
}

export async function createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  invalidateCache('payments')
  invalidateCache('dashboard')
  return docRef.id
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  invalidateCache('payments')
  invalidateCache('dashboard')
}
