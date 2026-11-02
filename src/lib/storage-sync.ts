// Real-time Storage & Cross-Page Synchronization Engine
// Ensures instant availability of Vehicles, Trips, Payments & Cashbook across all pages

import { auth } from '@/lib/firebase/config'
import type { Vehicle, Trip, Payment, Expense, Reminder } from '@/types'

export async function waitForAuthReady(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (auth && typeof auth.authStateReady === 'function') {
      await auth.authStateReady()
    }
  } catch (err) {
    console.warn('[Sync] Auth ready check warning:', err)
  }
}

export function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`rk_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as T
      if (parsed && typeof parsed === 'object') return parsed as T
    }
  } catch (err) {
    console.warn(`[Sync] Read error for "${key}":`, err)
  }
  return fallback
}

export function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`rk_${key}`, JSON.stringify(value))
  } catch (err) {
    console.warn(`[Sync] Write error for "${key}":`, err)
  }
}

export function notifyDataChanged(
  entity: 'vehicles' | 'trips' | 'payments' | 'expenses' | 'reminders' | 'cashbook' | 'dashboard' | 'all'
): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('rk_data_sync', {
        detail: { entity, timestamp: Date.now() },
      })
    )
    localStorage.setItem('rk_last_sync', `${entity}_${Date.now()}`)
  } catch (err) {
    console.warn('[Sync] Notify error:', err)
  }
}

export function subscribeDataChanged(callback: (entity: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleCustom = (e: Event) => {
    const ce = e as CustomEvent<{ entity?: string }>
    callback(ce.detail?.entity || 'all')
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'rk_last_sync' && e.newValue) {
      const entity = e.newValue.split('_')[0] || 'all'
      callback(entity)
    }
  }

  window.addEventListener('rk_data_sync', handleCustom)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener('rk_data_sync', handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

// Deleted records tracking to guarantee cross-page and cloud synchronization
export function markAsDeleted(entity: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_deleted_${entity}`)
    const set = new Set<string>(raw ? JSON.parse(raw) : [])
    set.add(id)
    localStorage.setItem(`rk_deleted_${entity}`, JSON.stringify(Array.from(set)))
  } catch (err) {
    console.warn(`[Sync] Error marking ${entity} as deleted:`, err)
  }
}

export function unmarkDeleted(entity: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_deleted_${entity}`)
    if (!raw) return
    const set = new Set<string>(JSON.parse(raw))
    set.delete(id)
    localStorage.setItem(`rk_deleted_${entity}`, JSON.stringify(Array.from(set)))
  } catch (err) {
    console.warn(`[Sync] Error unmarking ${entity} as deleted:`, err)
  }
}

export function isDeleted(entity: string, id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(`rk_deleted_${entity}`)
    if (!raw) return false
    const set = new Set<string>(JSON.parse(raw))
    return set.has(id)
  } catch {
    return false
  }
}

// Vehicle helpers
export function getStoredVehicles(): Vehicle[] {
  const list = getLocalData<Vehicle[]>('vehicles', [])
  return list.filter(v => !isDeleted('vehicles', v.id))
}

export function saveStoredVehicles(vehicles: Vehicle[]): void {
  const filtered = (vehicles || []).filter(v => !isDeleted('vehicles', v.id))
  setLocalData('vehicles', filtered)
}

export function upsertStoredVehicle(vehicle: Vehicle): void {
  unmarkDeleted('vehicles', vehicle.id)
  const list = getStoredVehicles()
  const idx = list.findIndex(v => v.id === vehicle.id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...vehicle }
  } else {
    list.unshift(vehicle)
  }
  saveStoredVehicles(list)
}

export function removeStoredVehicle(id: string): void {
  markAsDeleted('vehicles', id)
  const list = getLocalData<Vehicle[]>('vehicles', []).filter(v => v.id !== id && v.registrationNumber !== id)
  setLocalData('vehicles', list)
}

// Trip helpers
export function getStoredTrips(): Trip[] {
  const list = getLocalData<Trip[]>('trips', [])
  return list.filter(t => !isDeleted('trips', t.id) && (!t.tripNumber || !isDeleted('trips', t.tripNumber)))
}

export function saveStoredTrips(trips: Trip[]): void {
  const filtered = (trips || []).filter(t => !isDeleted('trips', t.id) && (!t.tripNumber || !isDeleted('trips', t.tripNumber)))
  setLocalData('trips', filtered)
}

export function upsertStoredTrip(trip: Trip): void {
  unmarkDeleted('trips', trip.id)
  if (trip.tripNumber) unmarkDeleted('trips', trip.tripNumber)
  const list = getStoredTrips()
  const idx = list.findIndex(t => t.id === trip.id || (trip.tripNumber && t.tripNumber === trip.tripNumber))
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...trip }
  } else {
    list.unshift(trip)
  }
  saveStoredTrips(list)
}

export function removeStoredTrip(id: string): void {
  markAsDeleted('trips', id)
  const list = getLocalData<Trip[]>('trips', []).filter(t => t.id !== id && t.tripNumber !== id)
  setLocalData('trips', list)
}

// Payment helpers
export function getStoredPayments(): Payment[] {
  const list = getLocalData<Payment[]>('payments', [])
  return list
    .filter(
      p =>
        !isDeleted('payments', p.id) &&
        (!p.tripId || p.tripId === 'general' || !isDeleted('trips', p.tripId))
    )
    .sort((a, b) => {
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

export function saveStoredPayments(payments: Payment[]): void {
  const filtered = (payments || []).filter(
    p =>
      !isDeleted('payments', p.id) &&
      (!p.tripId || p.tripId === 'general' || !isDeleted('trips', p.tripId))
  )
  setLocalData('payments', filtered)
}

export function upsertStoredPayment(payment: Payment): void {
  unmarkDeleted('payments', payment.id)
  const list = getStoredPayments()
  const idx = list.findIndex(p => p.id === payment.id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...payment }
  } else {
    list.unshift(payment)
  }
  saveStoredPayments(list)
}

export function removeStoredPayment(id: string): void {
  markAsDeleted('payments', id)
  const list = getLocalData<Payment[]>('payments', []).filter(p => p.id !== id)
  setLocalData('payments', list)
}

// Expense helpers
export function getStoredExpenses(): Expense[] {
  const list = getLocalData<Expense[]>('expenses', [])
  return list.filter(
    e =>
      !isDeleted('expenses', e.id) &&
      (!e.tripId || !isDeleted('trips', e.tripId)) &&
      (!e.tripNumber || !isDeleted('trips', e.tripNumber))
  )
}

export function saveStoredExpenses(expenses: Expense[]): void {
  const filtered = (expenses || []).filter(
    e =>
      !isDeleted('expenses', e.id) &&
      (!e.tripId || !isDeleted('trips', e.tripId)) &&
      (!e.tripNumber || !isDeleted('trips', e.tripNumber))
  )
  setLocalData('expenses', filtered)
}

export function upsertStoredExpense(expense: Expense): void {
  unmarkDeleted('expenses', expense.id)
  const list = getStoredExpenses()
  const idx = list.findIndex(e => e.id === expense.id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...expense }
  } else {
    list.unshift(expense)
  }
  saveStoredExpenses(list)
}

export function removeStoredExpense(id: string): void {
  markAsDeleted('expenses', id)
  const list = getLocalData<Expense[]>('expenses', []).filter(e => e.id !== id)
  setLocalData('expenses', list)
}

// Reminder helpers & standard fleet compliance templates
function getOffsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function getDefaultReminders(): Reminder[] {
  return [
    {
      id: 'rem-1',
      title: 'Insurance Renewal',
      dueDate: getOffsetDate(-2),
      category: 'documents',
      relatedEntityType: 'Insurance',
      relatedEntityId: 'veh_1',
      notes: 'Commercial fleet comprehensive policy renewal & claim coverage check.',
      status: 'overdue',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rem-2',
      title: 'Periodic Service',
      dueDate: getOffsetDate(4),
      category: 'vehicle_service',
      relatedEntityType: 'Vehicle Service',
      relatedEntityId: 'veh_2',
      notes: 'Engine oil, transmission fluid, brake pads, and tyre rotation check.',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rem-3',
      title: 'Fitness Certificate',
      dueDate: getOffsetDate(7),
      category: 'documents',
      relatedEntityType: 'Compliance',
      relatedEntityId: 'veh_3',
      notes: 'RTO commercial inspection, tax slip verification, and speed governor test.',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rem-4',
      title: 'Permit Renewal',
      dueDate: getOffsetDate(12),
      category: 'documents',
      relatedEntityType: 'Permit',
      relatedEntityId: 'veh_4',
      notes: 'All India tourist permit renewal & quarterly road tax clearance.',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rem-5',
      title: 'Driver License',
      dueDate: getOffsetDate(18),
      category: 'driver',
      relatedEntityType: 'Driver Compliance',
      notes: 'Heavy transport license renewal badge & annual medical fitness filing.',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rem-6',
      title: 'Battery Check',
      dueDate: getOffsetDate(25),
      category: 'vehicle_service',
      relatedEntityType: 'Maintenance',
      notes: 'Battery acid level check, alternator charging rate, and terminal greasing.',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
}

export function getStoredReminders(): Reminder[] {
  const list = getLocalData<Reminder[]>('reminders', [])
  const nonDeleted = list.filter(r => !isDeleted('reminders', r.id))
  if (nonDeleted.length > 0) return nonDeleted
  const defaults = getDefaultReminders().filter(r => !isDeleted('reminders', r.id))
  return defaults
}

export function saveStoredReminders(reminders: Reminder[]): void {
  const filtered = (reminders || []).filter(r => !isDeleted('reminders', r.id))
  setLocalData('reminders', filtered)
}

export function upsertStoredReminder(reminder: Reminder): void {
  unmarkDeleted('reminders', reminder.id)
  const list = getStoredReminders()
  const idx = list.findIndex(r => r.id === reminder.id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...reminder }
  } else {
    list.unshift(reminder)
  }
  saveStoredReminders(list)
}

export function removeStoredReminder(id: string): void {
  markAsDeleted('reminders', id)
  const list = getLocalData<Reminder[]>('reminders', []).filter(r => r.id !== id)
  setLocalData('reminders', list)
}



