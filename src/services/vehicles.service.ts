import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Vehicle } from '@/types'
import { normalizeRegNumber } from '@/lib/utils'
import { withCache, invalidateCache } from '@/lib/cache'
import {
  waitForAuthReady,
  getStoredVehicles,
  saveStoredVehicles,
  upsertStoredVehicle,
  removeStoredVehicle,
  notifyDataChanged,
  isDeleted,
} from '@/lib/storage-sync'

const COLLECTION = 'vehicles'

export async function getVehicles(limitCount?: number): Promise<Vehicle[]> {
  const localFallback = getStoredVehicles()

  return withCache(
    `vehicles:list:${limitCount ?? 'all'}`,
    async () => {
      await waitForAuthReady()
      const baseCol = collection(db, COLLECTION)
      const q = limitCount
        ? query(baseCol, orderBy('createdAt', 'desc'), limit(limitCount))
        : query(baseCol, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Vehicle))
        .filter(v => !isDeleted('vehicles', v.id))

      saveStoredVehicles(list)
      return list.length > 0 ? list : getStoredVehicles()
    },
    { fallback: localFallback }
  )
}


export async function getActiveVehicles(): Promise<Vehicle[]> {
  const localFallback = getStoredVehicles().filter(v => v.status === 'active')

  return withCache(
    'vehicles:active',
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), where('status', '==', 'active'))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))
      list.sort((a, b) => (a.name || a.registrationNumber).localeCompare(b.name || b.registrationNumber))
      return list.length > 0 ? list : localFallback
    },
    { fallback: localFallback }
  )
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const local = getStoredVehicles().find(v => v.id === id) || null

  return withCache(
    `vehicles:id:${id}`,
    async () => {
      await waitForAuthReady()
      const snap = await getDoc(doc(db, COLLECTION, id))
      if (!snap.exists()) return local
      return { id: snap.id, ...snap.data() } as Vehicle
    },
    { fallback: local }
  )
}

export async function createVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const normReg = normalizeRegNumber(data.registrationNumber)

  let docId = `veh_${Date.now()}`
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      registrationNumberNormalized: normReg,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[VehiclesService] Firestore write fallback to local:', err)
  }

  const createdVehicle: Vehicle = {
    id: docId,
    ...data,
    registrationNumberNormalized: normReg,
    createdAt: now,
    updatedAt: now,
  }

  upsertStoredVehicle(createdVehicle)
  invalidateCache('vehicles')
  invalidateCache('trips')
  invalidateCache('dashboard')
  notifyDataChanged('vehicles')

  return docId
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const updateData: Partial<Vehicle> & { updatedAt: string; registrationNumberNormalized?: string } = {
    ...data,
    updatedAt: now,
  }
  if (data.registrationNumber) {
    updateData.registrationNumberNormalized = normalizeRegNumber(data.registrationNumber)
  }

  try {
    await updateDoc(doc(db, COLLECTION, id), updateData)
  } catch (err) {
    console.warn('[VehiclesService] Firestore update fallback to local:', err)
  }

  const currentList = getStoredVehicles()
  const existing = currentList.find(v => v.id === id)
  if (existing) {
    upsertStoredVehicle({ ...existing, ...updateData } as Vehicle)
  }

  invalidateCache('vehicles')
  invalidateCache('trips')
  invalidateCache('dashboard')
  notifyDataChanged('vehicles')
}

export async function deleteVehicle(id: string): Promise<void> {
  await waitForAuthReady()
  try {
    await deleteDoc(doc(db, COLLECTION, id))
  } catch (err) {
    console.warn('[VehiclesService] Firestore delete by ID fallback:', err)
  }

  try {
    const q = query(collection(db, COLLECTION), where('registrationNumber', '==', id))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      await deleteDoc(d.ref)
    }
  } catch {}

  removeStoredVehicle(id)
  invalidateCache('vehicles')
  invalidateCache('trips')
  invalidateCache('dashboard')
  notifyDataChanged('vehicles')
  notifyDataChanged('all')
}

