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
import type { Expense, ExpenseCategory, Trip } from '@/types'
import { withCache, invalidateCache } from '@/lib/cache'
import {
  waitForAuthReady,
  getStoredExpenses,
  saveStoredExpenses,
  upsertStoredExpense,
  removeStoredExpense,
  getStoredTrips,
  upsertStoredTrip,
  getStoredPayments,
  notifyDataChanged,
  isDeleted,
  markAsDeleted,
  unmarkDeleted,
} from '@/lib/storage-sync'
import { moveToTrash } from './trash.service'
import { reconcileTripWithPayments, isExpenseLinkedToTrip } from './payments.service'

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
        .filter(e => {
          if (e.isDeleted) return false
          if (isDeleted('expenses', e.id)) {
            unmarkDeleted('expenses', e.id)
          }
          if (e.tripId && isDeleted('trips', e.tripId)) {
            unmarkDeleted('trips', e.tripId)
          }
          if (e.tripNumber && isDeleted('trips', e.tripNumber)) {
            unmarkDeleted('trips', e.tripNumber)
          }
          return true
        })
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

export async function syncTripFareWithExpenses(target: string | Partial<Expense>): Promise<void> {
  try {
    const dummyExpense: Partial<Expense> = typeof target === 'string'
      ? { tripId: target, tripNumber: target }
      : target

    if (!dummyExpense.tripId && !dummyExpense.tripNumber) return
    if (dummyExpense.tripId === 'general') return

    const trips = getStoredTrips()
    let targetTrip = trips.find(t => isExpenseLinkedToTrip(dummyExpense, t))

    if (!targetTrip) {
      if (dummyExpense.tripId) {
        try {
          const tripSnap = await getDoc(doc(db, 'trips', dummyExpense.tripId))
          if (tripSnap.exists()) {
            targetTrip = { id: tripSnap.id, ...tripSnap.data() } as Trip
          }
        } catch {}
      }
      if (!targetTrip && (dummyExpense.tripNumber || dummyExpense.tripId)) {
        try {
          const identifier = (dummyExpense.tripNumber || dummyExpense.tripId || '').trim()
          const qTrips = query(collection(db, 'trips'), where('tripNumber', '==', identifier), limit(1))
          const snap = await getDocs(qTrips)
          if (!snap.empty) {
            targetTrip = { id: snap.docs[0].id, ...snap.docs[0].data() } as Trip
          }
        } catch {}
      }
    }

    if (!targetTrip) return

    const paymentsList = getStoredPayments()
    const expensesList = getStoredExpenses()

    const reconciled = reconcileTripWithPayments(targetTrip, paymentsList, expensesList)

    const tripUpdates: Partial<Trip> = {
      baseFare: reconciled.baseFare,
      totalFare: reconciled.totalFare,
      totalExpenses: reconciled.totalExpenses || 0,
      customerBalance: reconciled.customerBalance,
      customerPaid: reconciled.customerPaid,
      advanceReceived: reconciled.advanceReceived,
      driverBalance: reconciled.driverBalance,
      driverPaid: reconciled.driverPaid,
      updatedAt: new Date().toISOString(),
    }

    upsertStoredTrip({ ...targetTrip, ...tripUpdates })

    try {
      await updateDoc(doc(db, 'trips', targetTrip.id), tripUpdates)
    } catch (tripErr) {
      console.warn('[ExpensesService] Linked trip update fallback to local:', tripErr)
    }

    invalidateCache('trips')
    invalidateCache('dashboard')
    invalidateCache('reports')
    notifyDataChanged('trips')
    notifyDataChanged('all')
  } catch (err) {
    console.warn('[ExpensesService] Error syncing trip fare with expenses:', err)
  }
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

  // Synchronize trip fare if expense is linked to a trip
  if (data.tripId && data.tripId !== 'general') {
    await syncTripFareWithExpenses(newExpense)
  }

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
  const list = getStoredExpenses()
  const existing = list.find(e => e.id === id)
  const previousTripId = existing?.tripId
  const previousTripNumber = existing?.tripNumber

  try {
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: now,
    })
  } catch (err) {
    console.warn('[Expenses] Cloud update failed, updating local copy:', err)
  }

  if (existing) {
    upsertStoredExpense({ ...existing, ...data, updatedAt: now })
  }

  // If linked trip changed, sync old trip
  if (previousTripId && previousTripId !== 'general' && (previousTripId !== data.tripId || previousTripNumber !== data.tripNumber)) {
    await syncTripFareWithExpenses({ tripId: previousTripId, tripNumber: previousTripNumber })
  }

  // Sync new/current trip
  const updatedExpense = { ...(existing || {}), ...data }
  if (updatedExpense.tripId && updatedExpense.tripId !== 'general') {
    await syncTripFareWithExpenses(updatedExpense)
  }

  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  notifyDataChanged('expenses')
}

export async function deleteExpense(id: string, recordData?: Partial<Expense>): Promise<void> {
  await waitForAuthReady()
  const currentExpenses = getStoredExpenses()
  const expenseToDelete = recordData || currentExpenses.find(e => e.id === id)

  try {
    await moveToTrash('expenses', id, 'Expense deleted', undefined, expenseToDelete as any)
  } catch (err) {
    console.warn('[Expenses] moveToTrash failed, removing locally:', err)
  }
  removeStoredExpense(id)
  markAsDeleted('expenses', id)

  // Synchronize linked trip totalFare & customerBalance
  if (expenseToDelete && expenseToDelete.tripId && expenseToDelete.tripId !== 'general') {
    await syncTripFareWithExpenses(expenseToDelete)
  }

  invalidateCache('expenses')
  invalidateCache('dashboard')
  invalidateCache('cashbook')
  invalidateCache('reports')
  notifyDataChanged('expenses')
  notifyDataChanged('trash')
  notifyDataChanged('all')
}

