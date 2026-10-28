import { getPayments } from './payments.service'
import { getExpenses } from './expenses.service'
import type { CashBookEntry } from '@/types'

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
      .forEach(p => {
        entries.push({
          id: `p-${p.id}`,
          date: p.paymentDate,
          tripId: p.tripId,
          description: `Customer Receipt (Trip ${p.tripId})`,
          cashIn: Number(p.amount) || 0,
          cashOut: 0,
          balance: 0,
          type: 'receipt',
          paymentMode: p.paymentMode || 'cash',
          createdAt: p.createdAt || p.paymentDate,
        })
      })

    // Driver payments
    payments
      .filter(p => p.type === 'driver_payment')
      .forEach(p => {
        entries.push({
          id: `p-${p.id}`,
          date: p.paymentDate,
          tripId: p.tripId,
          description: `Driver Payment (Trip ${p.tripId})`,
          cashIn: 0,
          cashOut: Number(p.amount) || 0,
          balance: 0,
          type: 'driver_payment',
          paymentMode: p.paymentMode || 'cash',
          createdAt: p.createdAt || p.paymentDate,
        })
      })

    // Expenses
    expenses.forEach(e => {
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
      })
    })

    // Sort chronologically ascending to calculate running balance
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    entries.forEach(entry => {
      // Only cash transactions or all modes according to preference
      runningBalance += entry.cashIn - entry.cashOut
      entry.balance = runningBalance
    })

    // Return in reverse chronological order for table display
    return entries.reverse()
  } catch (error) {
    console.error('Error calculating cashbook entries:', error)
    return []
  }
}
