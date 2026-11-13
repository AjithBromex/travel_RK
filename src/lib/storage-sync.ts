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
    const normalizedKey = key.startsWith('rk_') ? key : `rk_${key}`
    const raw =
      localStorage.getItem(normalizedKey) ??
      localStorage.getItem(key) ??
      (key.startsWith('rk_') ? localStorage.getItem(key.replace(/^rk_/, '')) : null)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T
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
    const normalizedKey = key.startsWith('rk_') ? key : `rk_${key}`
    const jsonVal = JSON.stringify(value)
    localStorage.setItem(normalizedKey, jsonVal)
    // Also set alternate key so both rk_key and key are populated
    if (key.startsWith('rk_')) {
      localStorage.setItem(key.replace(/^rk_/, ''), jsonVal)
    } else {
      localStorage.setItem(key, jsonVal)
    }
  } catch (err) {
    console.warn(`[Sync] Write error for "${key}":`, err)
  }
}

export function notifyDataChanged(
  entity:
    | 'vehicles'
    | 'trips'
    | 'payments'
    | 'expenses'
    | 'reminders'
    | 'cashbook'
    | 'dashboard'
    | 'trash'
    | 'backups'
    | 'audit_logs'
    | 'all'
    | string
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

export function clearDeletedMarkers(entity?: string): void {
  if (typeof window === 'undefined') return
  try {
    if (entity) {
      localStorage.removeItem(`rk_deleted_${entity}`)
      localStorage.removeItem(`deleted_${entity}`)
    } else {
      const keys = ['trips', 'vehicles', 'payments', 'expenses', 'reminders', 'cashbook', 'users', 'trash']
      for (const k of keys) {
        localStorage.removeItem(`rk_deleted_${k}`)
        localStorage.removeItem(`deleted_${k}`)
      }
      localStorage.removeItem('rk_permanently_purged_ids')
      localStorage.removeItem('permanently_purged_ids')
    }
  } catch (err) {
    console.warn('[Sync] Error clearing deleted markers:', err)
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

// Admin Confirmation / Locking records tracking
export function markAsConfirmed(entity: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_confirmed_${entity}`)
    const set = new Set<string>(raw ? JSON.parse(raw) : [])
    set.add(id)
    localStorage.setItem(`rk_confirmed_${entity}`, JSON.stringify(Array.from(set)))
  } catch (err) {
    console.warn(`[Sync] Error marking ${entity} as confirmed:`, err)
  }
}

export function unmarkConfirmed(entity: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_confirmed_${entity}`)
    if (!raw) return
    const set = new Set<string>(JSON.parse(raw))
    set.delete(id)
    localStorage.setItem(`rk_confirmed_${entity}`, JSON.stringify(Array.from(set)))
  } catch (err) {
    console.warn(`[Sync] Error unmarking ${entity} as confirmed:`, err)
  }
}

export function isRecordConfirmed(
  entity: string,
  id?: string,
  record?: { isConfirmed?: boolean } | null
): boolean {
  if (record && record.isConfirmed === true) return true
  if (!id || typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(`rk_confirmed_${entity}`)
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
  return []
}

export function getStoredReminders(): Reminder[] {
  const list = getLocalData<Reminder[]>('reminders', [])
  return list.filter(
    r =>
      !isDeleted('reminders', r.id) &&
      !['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].includes(r.id)
  )
}

export function saveStoredReminders(reminders: Reminder[]): void {
  const filtered = (reminders || []).filter(
    r =>
      !isDeleted('reminders', r.id) &&
      !['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].includes(r.id)
  )
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

// Purge obsolete mock template reminders from client localStorage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('rk_reminders')
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        const cleaned = list.filter(
          (r: any) => !['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].includes(r?.id)
        )
        if (cleaned.length !== list.length) {
          localStorage.setItem('rk_reminders', JSON.stringify(cleaned))
        }
      }
    }
    ['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].forEach(id => {
      markAsDeleted('reminders', id)
    })
  } catch {}
}



