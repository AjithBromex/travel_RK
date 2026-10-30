import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Expense, ExpenseCategory } from '@/types'
import { withCache, invalidateCache } from '@/lib/cache'

const COLLECTION = 'expenses'

export async function getExpenses(limitCount = 100): Promise<Expense[]> {
  return withCache(
    `expenses:list:${limitCount}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('expenseDate', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
    },
    { fallback: [] }
  )
}

export async function getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  return withCache(
    `expenses:category:${category}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('category', '==', category), orderBy('expenseDate', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
    },
    { fallback: [] }
  )
}

export async function getExpensesByTrip(tripId: string): Promise<Expense[]> {
  return withCache(
    `expenses:trip:${tripId}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
    },
    { fallback: [] }
  )
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  return docRef.id
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
}
