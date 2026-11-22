import { getPayments, deletePayment } from './payments.service'
import { getExpenses, deleteExpense } from './expenses.service'
import type { CashBookEntry } from '@/types'
import {
  waitForAuthReady,
  isDeleted,
  markAsDeleted,
  getStoredPayments,
  getStoredExpenses,
  notifyDataChanged,
  isRecordConfirmed,
} from '@/lib/storage-sync'
import { invalidateCache } from '@/lib/cache'
import { moveToTrash } from './trash.service'

export async function getCashBookEntries(): Promise<CashBookEntry[]> {
  try {
    const [payments, expenses] = await Promise.all([
      getPayments(200),
      getExpenses(200),
    ])

    const entries: CashBookEntry[] = []

    // Customer payments received
    payments
      .filter(p => p.type === 'customer_received')
      .filter(p => !p.isDeleted && !isDeleted('payments', p.id) && !isDeleted('cashbook', `p-${p.id}`) && !isDeleted('cashbook', p.id))
      .forEach(p => {
        const isAdvance = p.paymentStage === 'advance' || (p.notes && /advance/i.test(p.notes))
        const stageLabel = isAdvance ? 'Customer Advance' : 'Customer Balance'
        const tripRef = p.tripId && p.tripId !== 'general' ? ` (Trip #${p.tripId})` : ''
        entries.push({
          id: `p-${p.id}`,
          date: p.paymentDate,
          tripId: p.tripId,
          description: `${stageLabel}${tripRef}${p.notes ? ` - ${p.notes}` : ''}`,
          cashIn: Number(p.amount) || 0,
          cashOut: 0,
          balance: 0,
          type: 'receipt',
          paymentMode: p.paymentMode || 'cash',
          createdAt: p.createdAt || p.paymentDate,
          isConfirmed: Boolean(p.isConfirmed || isRecordConfirmed('payments', p.id, p)),
        })
      })

    // Driver payments
    payments
      .filter(p => p.type === 'driver_payment')
      .filter(p => !p.isDeleted && !isDeleted('payments', p.id) && !isDeleted('cashbook', `p-${p.id}`) && !isDeleted('cashbook', p.id))
      .forEach(p => {
        entries.push({
          id: `p-${p.id}`,
          date: p.paymentDate,
          tripId: p.tripId,
          description: p.notes && p.notes.trim() ? p.notes.trim() : (p.tripId && p.tripId !== 'general' ? `Driver Payment (Trip #${p.tripId})` : 'Driver Payment'),
          cashIn: 0,
          cashOut: Number(p.amount) || 0,
          balance: 0,
          type: 'driver_payment',
          paymentMode: p.paymentMode || 'cash',
          createdAt: p.createdAt || p.paymentDate,
          isConfirmed: Boolean(p.isConfirmed || isRecordConfirmed('payments', p.id, p)),
        })
      })

    // Expenses
    expenses
      .filter(e => !e.isDeleted && !isDeleted('expenses', e.id) && !isDeleted('cashbook', `e-${e.id}`) && !isDeleted('cashbook', e.id))
      .forEach(e => {
        entries.push({
          id: `e-${e.id}`,
          date: e.expenseDate,
          tripId: e.tripId,
          description: `${e.category.toUpperCase()}: ${e.description}`,
          cashIn: 0,
          cashOut: Number(e.amount) || 0,
          balance: 0,
          type: 'expense',
          paymentMode: e.paymentMode || 'cash',
          createdAt: e.createdAt || e.expenseDate,
          isConfirmed: Boolean(e.isConfirmed || isRecordConfirmed('expenses', e.id, e as any)),
        })
      })

    // Sort chronologically ascending (oldest first) to calculate running balance accurately
    entries.sort((a, b) => {
      // 1. Transaction date ascending
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB

      // 2. Exact creation timestamp ascending (oldest first)
      const timeA = new Date(a.createdAt || a.date).getTime()
      const timeB = new Date(b.createdAt || b.date).getTime()
      if (timeA !== timeB) return timeA - timeB

      // 3. For the same trip and date, advance payments strictly come before balance payments and expenses
      const isAdvanceA = a.type === 'receipt' && (/advance/i.test(a.description))
      const isAdvanceB = b.type === 'receipt' && (/advance/i.test(b.description))
      if (isAdvanceA && !isAdvanceB) return -1
      if (!isAdvanceA && isAdvanceB) return 1

      return String(a.id).localeCompare(String(b.id))
    })

    let runningBalance = 0
    entries.forEach(entry => {
      // Only cash transactions or all modes according to preference
      runningBalance += entry.cashIn - entry.cashOut
      entry.balance = runningBalance
    })

    // Return in reverse chronological order for table display (newest at the top)
    return entries.reverse()
  } catch (error) {
    console.error('Error calculating cashbook entries:', error)
    return []
  }
}

export async function deleteCashBookEntry(id: string, recordData?: Record<string, unknown>): Promise<void> {
  await waitForAuthReady()
  const cleanId = String(id || '').trim()
  if (!cleanId) return

  // 1. Mark in cashbook soft-delete tracker immediately
  markAsDeleted('cashbook', cleanId)

  // 2. Identify and delegate to underlying collection
  if (cleanId.startsWith('p-')) {
    const paymentId = cleanId.slice(2)
    markAsDeleted('payments', paymentId)
    try {
      await deletePayment(paymentId)
    } catch (err) {
      console.warn('[CashBook] Failed to delete payment document:', err)
    }
  } else if (cleanId.startsWith('e-')) {
    const expenseId = cleanId.slice(2)
    markAsDeleted('expenses', expenseId)
    try {
      await deleteExpense(expenseId)
    } catch (err) {
      console.warn('[CashBook] Failed to delete expense document:', err)
    }
  } else {
    // Check if ID matches a stored payment or expense directly
    const storedPayments = getStoredPayments()
    const paymentMatch = storedPayments.find((p) => p.id === cleanId)
    if (paymentMatch) {
      markAsDeleted('payments', cleanId)
      try {
        await deletePayment(cleanId)
      } catch (err) {
        console.warn('[CashBook] Fallback deletePayment error:', err)
      }
    } else {
      const storedExpenses = getStoredExpenses()
      const expenseMatch = storedExpenses.find((e) => e.id === cleanId)
      if (expenseMatch) {
        markAsDeleted('expenses', cleanId)
        try {
          await deleteExpense(cleanId)
        } catch (err) {
          console.warn('[CashBook] Fallback deleteExpense error:', err)
        }
      } else {
        // Direct cashbook entry
        try {
          await moveToTrash('cashbook', cleanId, 'Deleted from Cash Book', undefined, recordData as any)
        } catch (err) {
          console.warn('[CashBook] Move to trash error:', err)
        }
      }
    }
  }

  // 3. Clear all related caches
  invalidateCache('cashbook')
  invalidateCache('payments')
  invalidateCache('expenses')
  invalidateCache('trips')
  invalidateCache('dashboard')
  invalidateCache('reports')

  // 4. Notify all tabs & listeners
  notifyDataChanged('cashbook')
  notifyDataChanged('payments')
  notifyDataChanged('expenses')
  notifyDataChanged('trips')
  notifyDataChanged('all')
}

