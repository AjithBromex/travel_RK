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

const COLLECTION = 'expenses'

export async function getExpenses(limitCount = 100): Promise<Expense[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('expenseDate', 'desc'), limit(limitCount))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
  } catch (err) {
    console.error("Error fetching expenses:", err)
    return []
  }
}

export async function getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  try {
    const q = query(collection(db, COLLECTION), where('category', '==', category), orderBy('expenseDate', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
  } catch (err) {
    console.error("Error fetching expenses by category:", err)
    return []
  }
}

export async function getExpensesByTrip(tripId: string): Promise<Expense[]> {
  try {
    const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
  } catch (err) {
    console.error("Error fetching trip expenses:", err)
    return []
  }
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
