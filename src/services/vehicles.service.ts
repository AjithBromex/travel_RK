import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Vehicle } from '@/types'
import { normalizeRegNumber } from '@/lib/utils'

const COLLECTION = 'vehicles'

export async function getVehicles(limitCount?: number): Promise<Vehicle[]> {
  try {
    const baseCol = collection(db, COLLECTION)
    const q = limitCount
      ? query(baseCol, orderBy('createdAt', 'desc'), limit(limitCount))
      : query(baseCol, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))
  } catch (err) {
    console.warn('Could not fetch vehicles from Firestore:', err)
    return []
  }
}

export async function getActiveVehicles(): Promise<Vehicle[]> {
  try {
    const q = query(collection(db, COLLECTION), where('status', '==', 'active'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))
  } catch (err) {
    console.warn('Could not fetch active vehicles from Firestore:', err)
    return []
  }
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Vehicle
  } catch (err) {
    console.warn('Could not fetch vehicle by id:', err)
    return null
  }
}

export async function createVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    registrationNumberNormalized: normalizeRegNumber(data.registrationNumber),
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
  const updateData: Partial<Vehicle> & { updatedAt: string; registrationNumberNormalized?: string } = {
    ...data,
    updatedAt: new Date().toISOString(),
  }
  if (data.registrationNumber) {
    updateData.registrationNumberNormalized = normalizeRegNumber(data.registrationNumber)
  }
  await updateDoc(doc(db, COLLECTION, id), updateData)
}

export async function deleteVehicle(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
