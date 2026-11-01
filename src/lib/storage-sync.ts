// Real-time Storage & Cross-Page Synchronization Engine
// Ensures instant availability of Vehicles, Trips, Payments & Cashbook across all pages

import { auth } from '@/lib/firebase/config'
import type { Vehicle, Trip, Payment, Expense } from '@/types'

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
  entity: 'vehicles' | 'trips' | 'payments' | 'expenses' | 'cashbook' | 'dashboard' | 'all'
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

// Vehicle helpers
export function getStoredVehicles(): Vehicle[] {
  return getLocalData<Vehicle[]>('vehicles', [])
}

export function saveStoredVehicles(vehicles: Vehicle[]): void {
  setLocalData('vehicles', vehicles)
}

export function upsertStoredVehicle(vehicle: Vehicle): void {
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
  const list = getStoredVehicles().filter(v => v.id !== id)
  saveStoredVehicles(list)
}

// Trip helpers
export function getStoredTrips(): Trip[] {
  return getLocalData<Trip[]>('trips', [])
}

export function saveStoredTrips(trips: Trip[]): void {
  setLocalData('trips', trips)
}

export function upsertStoredTrip(trip: Trip): void {
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
  const list = getStoredTrips().filter(t => t.id !== id && t.tripNumber !== id)
  saveStoredTrips(list)
}

// Payment helpers
export function getStoredPayments(): Payment[] {
  return getLocalData<Payment[]>('payments', [])
}

export function saveStoredPayments(payments: Payment[]): void {
  setLocalData('payments', payments)
}

export function upsertStoredPayment(payment: Payment): void {
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
  const list = getStoredPayments().filter(p => p.id !== id)
  saveStoredPayments(list)
}

// Expense helpers
export function getStoredExpenses(): Expense[] {
  return getLocalData<Expense[]>('expenses', [])
}

export function saveStoredExpenses(expenses: Expense[]): void {
  setLocalData('expenses', expenses)
}

export function upsertStoredExpense(expense: Expense): void {
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
  const list = getStoredExpenses().filter(e => e.id !== id)
  saveStoredExpenses(list)
}
