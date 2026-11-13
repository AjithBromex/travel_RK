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
import {
  waitForAuthReady,
  getStoredExpenses,
  saveStoredExpenses,
  upsertStoredExpense,
  removeStoredExpense,
  notifyDataChanged,
  isDeleted,
  markAsDeleted,
} from '@/lib/storage-sync'
import { moveToTrash } from './trash.service'

const COLLECTION = 'expenses'

export async function getExpenses(limitCount = 100): Promise<Expense[]> {
  await waitForAuthReady()
  const cached = getStoredExpenses()
  return withCache(
    `expenses:list:${limitCount}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('expenseDate', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Expense))
        .filter(
          e =>
            !e.isDeleted &&
            !isDeleted('expenses', e.id) &&
            (!e.tripId || !isDeleted('trips', e.tripId)) &&
            (!e.tripNumber || !isDeleted('trips', e.tripNumber))
        )
      saveStoredExpenses(list)
      return list
    },
    { fallback: cached }
  )
}

export async function getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  await waitForAuthReady()
  const cached = getStoredExpenses().filter(e => e.category === category)
  return withCache(
    `expenses:category:${category}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('category', '==', category), orderBy('expenseDate', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
      return list
    },
    { fallback: cached }
  )
}

export async function getExpensesByTrip(tripId: string): Promise<Expense[]> {
  if (isDeleted('trips', tripId)) return []
  await waitForAuthReady()
  const cached = getStoredExpenses().filter(e => e.tripId === tripId || (e as any).tripNumber === tripId)
  return withCache(
    `expenses:trip:${tripId}`,
    async () => {
      const q = query(collection(db, COLLECTION), where('tripId', '==', tripId))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
      return list
    },
    { fallback: cached }
  )
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  let docId = 'exp_' + Date.now()

  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[Expenses] Cloud create failed, persisting to local storage:', err)
  }

  const newExpense: Expense = {
    ...data,
    id: docId,
    createdAt: now,
    updatedAt: now,
  }
  upsertStoredExpense(newExpense)

  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  notifyDataChanged('expenses')
  return docId
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: now,
    })
  } catch (err) {
    console.warn('[Expenses] Cloud update failed, updating local copy:', err)
  }

  const list = getStoredExpenses()
  const existing = list.find(e => e.id === id)
  if (existing) {
    upsertStoredExpense({ ...existing, ...data, updatedAt: now })
  }

  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  notifyDataChanged('expenses')
}

export async function deleteExpense(id: string, recordData?: Partial<Expense>): Promise<void> {
  await waitForAuthReady()
  try {
    await moveToTrash('expenses', id, 'Expense deleted', undefined, recordData as any)
  } catch (err) {
    console.warn('[Expenses] moveToTrash failed, removing locally:', err)
  }
  removeStoredExpense(id)
  markAsDeleted('expenses', id)

  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  notifyDataChanged('expenses')
  notifyDataChanged('trash')
  notifyDataChanged('all')
}

