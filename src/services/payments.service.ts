import {
  collection, doc, getDocs, addDoc, deleteDoc,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Payment } from '@/types'

const COLLECTION = 'payments'

export async function getPayments(limitCount = 100): Promise<Payment[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('paymentDate', 'desc'), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
  } catch (err) {
    console.warn('Could not fetch payments from Firestore:', err)
    return []
  }
}

export async function getPaymentsByTrip(tripId: string): Promise<Payment[]> {
  try {
    const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
  } catch (err) {
    console.warn('Could not fetch trip payments from Firestore:', err)
    return []
  }
}

export async function createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
