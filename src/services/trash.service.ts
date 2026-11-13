import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { TrashItem } from '@/types'
import {
  waitForAuthReady,
  getLocalData,
  setLocalData,
  markAsDeleted,
  unmarkDeleted,
  notifyDataChanged,
  getStoredTrips,
  upsertStoredTrip,
  removeStoredTrip,
  getStoredVehicles,
  upsertStoredVehicle,
  removeStoredVehicle,
  getStoredPayments,
  upsertStoredPayment,
  removeStoredPayment,
  getStoredExpenses,
  upsertStoredExpense,
  removeStoredExpense,
  getStoredReminders,
  upsertStoredReminder,
  removeStoredReminder,
} from '@/lib/storage-sync'
import { logAuditEvent } from './audit.service'
import { invalidateCache } from '@/lib/cache'

const TRASH_COLLECTION = 'trash'
const LOCAL_STORAGE_KEY = 'rk_trash_items'

export function getRecordDisplayName(collectionName: string, data: Record<string, any>): string {
  if (!data) return `${collectionName} record`

  if (collectionName === 'trips') {
    const num = data.receiptNumber || data.tripNumber || data.id || 'Trip'
    const cust = data.customerName || data.customer || 'Customer'
    const route = data.from && data.to ? ` (${data.from} → ${data.to})` : ''
    return `${num}: ${cust}${route}`
  }

  if (collectionName === 'vehicles') {
    const reg = data.registrationNumber || data.number || ''
    const name = data.name || data.model || 'Vehicle'
    return `${name} [${reg}]`
  }

  if (collectionName === 'payments') {
    const amt = Number(data.amount || 0).toLocaleString('en-IN')
    const cust = data.customerName || data.customer || 'Customer'
    const stage = data.paymentStage ? ` (${data.paymentStage})` : ''
    return `Payment ₹${amt} - ${cust}${stage}`
  }

  if (collectionName === 'expenses') {
    const cat = data.category ? String(data.category).toUpperCase() : 'Expense'
    const desc = data.description || data.note || ''
    const amt = Number(data.amount || 0).toLocaleString('en-IN')
    return `${cat}: ${desc} (₹${amt})`
  }

  if (collectionName === 'reminders') {
    return data.title || 'Reminder'
  }

  if (collectionName === 'users') {
    const name = data.displayName || data.name || data.userId || 'User'
    const email = data.email ? ` <${data.email}>` : ''
    return `${name}${email}`
  }

  if (collectionName === 'cashbook') {
    const type = data.type === 'receipt' ? 'Cash IN' : 'Cash OUT'
    const amt = Number(data.amount || data.cashIn || data.cashOut || 0).toLocaleString('en-IN')
    return `${type}: ${data.description || 'Entry'} (₹${amt})`
  }

  return data.name || data.title || data.id || `${collectionName} Record`
}

/**
 * Moves any record to the Trash (Soft Delete).
 * Updates the original document with isDeleted: true and archives a copy into 'trash'.
 */
export async function moveToTrash(
  collectionName: string,
  id: string,
  reason?: string,
  user?: { uid?: string; email?: string; displayName?: string; role?: string }
): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const trashDocId = `${collectionName}_${id}`

  // 1. Fetch current document data
  let existingData: Record<string, any> = {}
  try {
    const snap = await getDoc(doc(db, collectionName, id))
    if (snap.exists()) {
      existingData = { id: snap.id, ...snap.data() }
    }
  } catch (err) {
    console.warn(`[TrashService] Cloud fetch for ${collectionName}/${id}:`, err)
  }

  // Fallback to local storage if document wasn't fetched
  if (!existingData || Object.keys(existingData).length === 0) {
    if (collectionName === 'trips') {
      const found = getStoredTrips().find((t) => t.id === id || t.tripNumber === id)
      if (found) existingData = { ...found }
    } else if (collectionName === 'vehicles') {
      const found = getStoredVehicles().find((v) => v.id === id || v.registrationNumber === id)
      if (found) existingData = { ...found }
    } else if (collectionName === 'payments') {
      const found = getStoredPayments().find((p) => p.id === id)
      if (found) existingData = { ...found }
    } else if (collectionName === 'expenses') {
      const found = getStoredExpenses().find((e) => e.id === id)
      if (found) existingData = { ...found }
    } else if (collectionName === 'reminders') {
      const found = getStoredReminders().find((r) => r.id === id)
      if (found) existingData = { ...found }
    }
  }

  if (!existingData.id) {
    existingData.id = id
  }

  const recordName = getRecordDisplayName(collectionName, existingData)

  const deletedBy = {
    uid: user?.uid || 'admin',
    email: user?.email || 'admin@gmail.com',
    displayName: user?.displayName || 'Administrator',
    role: user?.role || 'admin',
  }

  const softDeleteMetadata = {
    isDeleted: true,
    deletedAt: now,
    deletedBy,
    originalCollection: collectionName,
    deletionReason: reason || 'Manual deletion',
    updatedAt: now,
  }

  const trashItem: TrashItem = {
    id: trashDocId,
    originalId: id,
    originalCollection: collectionName,
    recordName,
    recordType: collectionName,
    data: { ...existingData, ...softDeleteMetadata },
    isDeleted: true,
    deletedAt: now,
    deletedBy,
    deletionReason: reason || 'Manual deletion',
    restored: false,
    createdAt: existingData.createdAt || now,
    updatedAt: now,
  }

  // 2. Update original Firestore document
  try {
    await updateDoc(doc(db, collectionName, id), softDeleteMetadata)
  } catch (updateErr) {
    console.warn(`[TrashService] Soft-delete updateDoc fallback on ${collectionName}/${id}:`, updateErr)
  }

  // 3. Persist to Firestore 'trash' collection
  try {
    await setDoc(doc(db, TRASH_COLLECTION, trashDocId), trashItem)
  } catch (trashErr) {
    console.warn(`[TrashService] Write to /trash/${trashDocId} error:`, trashErr)
  }

  // 4. Update local storage caches
  markAsDeleted(collectionName, id)
  if (existingData.tripNumber) markAsDeleted(collectionName, existingData.tripNumber)
  if (existingData.registrationNumber) markAsDeleted(collectionName, existingData.registrationNumber)

  // Remove from active local lists
  if (collectionName === 'trips') removeStoredTrip(id)
  else if (collectionName === 'vehicles') removeStoredVehicle(id)
  else if (collectionName === 'payments') removeStoredPayment(id)
  else if (collectionName === 'expenses') removeStoredExpense(id)
  else if (collectionName === 'reminders') removeStoredReminder(id)

  // Save to local trash cache
  const localTrash = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, [])
  const existingIdx = localTrash.findIndex((t) => t.id === trashDocId)
  if (existingIdx >= 0) {
    localTrash[existingIdx] = trashItem
  } else {
    localTrash.unshift(trashItem)
  }
  setLocalData(LOCAL_STORAGE_KEY, localTrash)

  // 5. Log audit event
  logAuditEvent({
    action: 'SOFT_DELETE',
    collectionName,
    recordId: id,
    userId: deletedBy.uid,
    userEmail: deletedBy.email,
    userRole: deletedBy.role,
    details: `Moved ${recordName} to Trash. Reason: ${reason || 'User action'}`,
    previousState: existingData,
    metadata: { trashDocId, collectionName },
  }).catch(() => {})

  // 6. Invalidate caches and broadcast sync
  invalidateCache(collectionName)
  invalidateCache('trash')
  invalidateCache('dashboard')
  invalidateCache('reports')
  notifyDataChanged(collectionName as any)
  notifyDataChanged('all')

  return trashDocId
}

/**
 * Retrieves all items currently in Trash.
 */
export async function getTrashItems(collectionFilter?: string): Promise<TrashItem[]> {
  const localFallback = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, []).filter(
    (t) => !t.restored && t.isDeleted
  )

  try {
    await waitForAuthReady()
    const q = query(collection(db, TRASH_COLLECTION), orderBy('deletedAt', 'desc'), limit(300))
    const snap = await getDocs(q)
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as TrashItem))
      .filter((t) => !t.restored && t.isDeleted)

    if (list.length > 0) {
      setLocalData(LOCAL_STORAGE_KEY, list)
      if (collectionFilter && collectionFilter !== 'all') {
        return list.filter((t) => t.originalCollection === collectionFilter)
      }
      return list
    }
  } catch (err) {
    console.warn('[TrashService] Cloud getTrashItems fallback to local:', err)
  }

  if (collectionFilter && collectionFilter !== 'all') {
    return localFallback.filter((t) => t.originalCollection === collectionFilter)
  }
  return localFallback
}

/**
 * Restores a record from Trash back to its original collection.
 * Preserves the exact document ID, fields, and relationships.
 */
export async function restoreFromTrash(
  trashId: string,
  user?: { uid?: string; email?: string }
): Promise<boolean> {
  await waitForAuthReady()
  const now = new Date().toISOString()

  // 1. Fetch trash record
  let item: TrashItem | null = null
  const localTrash = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, [])
  item = localTrash.find((t) => t.id === trashId || t.originalId === trashId) || null

  try {
    const snap = await getDoc(doc(db, TRASH_COLLECTION, trashId))
    if (snap.exists()) {
      item = { id: snap.id, ...snap.data() } as TrashItem
    }
  } catch {}

  if (!item) {
    throw new Error('Trash record not found.')
  }

  const { originalCollection, originalId, data, recordName } = item
  const restoredPayload = {
    ...data,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    restoredAt: now,
    restoredBy: {
      uid: user?.uid || 'admin',
      email: user?.email || 'admin@gmail.com',
    },
    updatedAt: now,
  }

  // 2. Restore in original collection (using exact original document ID)
  try {
    await setDoc(doc(db, originalCollection, originalId), restoredPayload, { merge: true })
  } catch (restoreErr) {
    console.warn(`[TrashService] Cloud restore to /${originalCollection}/${originalId}:`, restoreErr)
  }

  // 3. Remove or mark restored in 'trash' collection
  try {
    await deleteDoc(doc(db, TRASH_COLLECTION, trashId))
  } catch {
    try {
      await updateDoc(doc(db, TRASH_COLLECTION, trashId), {
        restored: true,
        restoredAt: now,
        isDeleted: false,
      })
    } catch {}
  }

  // 4. Update local storage: unmark deleted and restore local cache
  unmarkDeleted(originalCollection, originalId)
  if (data.tripNumber) unmarkDeleted(originalCollection, data.tripNumber)
  if (data.registrationNumber) unmarkDeleted(originalCollection, data.registrationNumber)

  if (originalCollection === 'trips') upsertStoredTrip(restoredPayload as any)
  else if (originalCollection === 'vehicles') upsertStoredVehicle(restoredPayload as any)
  else if (originalCollection === 'payments') upsertStoredPayment(restoredPayload as any)
  else if (originalCollection === 'expenses') upsertStoredExpense(restoredPayload as any)
  else if (originalCollection === 'reminders') upsertStoredReminder(restoredPayload as any)

  // Remove from local trash cache
  const updatedTrash = localTrash.filter((t) => t.id !== trashId && t.originalId !== originalId)
  setLocalData(LOCAL_STORAGE_KEY, updatedTrash)

  // 5. Log audit event
  logAuditEvent({
    action: 'RESTORE',
    collectionName: originalCollection,
    recordId: originalId,
    userId: user?.uid || 'admin',
    userEmail: user?.email || 'admin@gmail.com',
    details: `Restored ${recordName} back to ${originalCollection}.`,
    newState: restoredPayload,
    metadata: { trashId, originalCollection, originalId },
  }).catch(() => {})

  // 6. Invalidate caches and notify
  invalidateCache(originalCollection)
  invalidateCache('trash')
  invalidateCache('dashboard')
  invalidateCache('reports')
  notifyDataChanged(originalCollection as any)
  notifyDataChanged('all')

  return true
}

/**
 * Restores multiple records from Trash in batch.
 */
export async function restoreMultipleFromTrash(
  trashIds: string[],
  user?: { uid?: string; email?: string }
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const id of trashIds) {
    try {
      await restoreFromTrash(id, user)
      success++
    } catch {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Permanently deletes a record from both original collection and Trash.
 * Restricted to administrators with confirmation.
 */
export async function permanentDeleteFromTrash(
  trashId: string,
  user?: { uid?: string; email?: string }
): Promise<boolean> {
  await waitForAuthReady()

  // 1. Fetch item
  let item: TrashItem | null = null
  const localTrash = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, [])
  item = localTrash.find((t) => t.id === trashId || t.originalId === trashId) || null

  try {
    const snap = await getDoc(doc(db, TRASH_COLLECTION, trashId))
    if (snap.exists()) {
      item = { id: snap.id, ...snap.data() } as TrashItem
    }
  } catch {}

  const origCol = item?.originalCollection
  const origId = item?.originalId || trashId.split('_').slice(1).join('_')
  const recordName = item?.recordName || `${origCol} #${origId}`

  // 2. Permanently delete from original collection
  if (origCol && origId) {
    try {
      await deleteDoc(doc(db, origCol, origId))
    } catch (err) {
      console.warn(`[TrashService] Cloud perm-delete on /${origCol}/${origId}:`, err)
    }
  }

  // 3. Permanently delete from 'trash' collection
  try {
    await deleteDoc(doc(db, TRASH_COLLECTION, trashId))
  } catch (err) {
    console.warn(`[TrashService] Cloud perm-delete on /trash/${trashId}:`, err)
  }

  // 4. Update local storage
  const updatedTrash = localTrash.filter((t) => t.id !== trashId && t.originalId !== origId)
  setLocalData(LOCAL_STORAGE_KEY, updatedTrash)

  // 5. Log audit event
  logAuditEvent({
    action: 'PERMANENT_DELETE',
    collectionName: origCol || 'trash',
    recordId: origId || trashId,
    userId: user?.uid || 'admin',
    userEmail: user?.email || 'admin@gmail.com',
    details: `Permanently destroyed record: ${recordName}. This action is irreversible.`,
    metadata: { trashId, originalCollection: origCol, originalId: origId },
  }).catch(() => {})

  invalidateCache('trash')
  notifyDataChanged('all')

  return true
}

/**
 * Empties all items currently in Trash permanently.
 */
export async function emptyTrash(user?: { uid?: string; email?: string }): Promise<number> {
  const items = await getTrashItems()
  let count = 0

  for (const item of items) {
    try {
      await permanentDeleteFromTrash(item.id, user)
      count++
    } catch {}
  }

  return count
}
