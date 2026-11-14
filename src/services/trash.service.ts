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
  isDeleted,
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
const LOCAL_STORAGE_KEY = 'trash_items'
const PURGED_STORAGE_KEY = 'permanently_purged_ids'

export function markAsPermanentlyPurged(collectionName: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_${PURGED_STORAGE_KEY}`) || localStorage.getItem(PURGED_STORAGE_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const key = `${collectionName}_${id}`
    if (!list.includes(key)) list.push(key)
    if (!list.includes(id)) list.push(id)
    const val = JSON.stringify(list.slice(-500))
    localStorage.setItem(`rk_${PURGED_STORAGE_KEY}`, val)
    localStorage.setItem(PURGED_STORAGE_KEY, val)
  } catch {}
}

export function unmarkPermanentlyPurged(collectionName: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(`rk_${PURGED_STORAGE_KEY}`) || localStorage.getItem(PURGED_STORAGE_KEY)
    if (!raw) return
    const list: string[] = JSON.parse(raw)
    const filtered = list.filter((x) => x !== `${collectionName}_${id}` && x !== id)
    const val = JSON.stringify(filtered)
    localStorage.setItem(`rk_${PURGED_STORAGE_KEY}`, val)
    localStorage.setItem(PURGED_STORAGE_KEY, val)
  } catch {}
}

export function isPermanentlyPurged(collectionName: string, id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(`rk_${PURGED_STORAGE_KEY}`) || localStorage.getItem(PURGED_STORAGE_KEY)
    if (!raw) return false
    const list: string[] = JSON.parse(raw)
    return list.includes(`${collectionName}_${id}`) || list.includes(id)
  } catch {
    return false
  }
}

export function parseTrashIdentifier(
  trashId: string,
  itemParam?: TrashItem | null
): { origCol: string; origId: string } {
  if (itemParam?.originalCollection && itemParam?.originalId) {
    return { origCol: itemParam.originalCollection, origId: itemParam.originalId }
  }

  let clean = trashId
  if (clean.startsWith('trash_')) {
    clean = clean.replace(/^trash_/, '')
  }

  const KNOWN_COLLECTIONS = ['payments', 'expenses', 'trips', 'vehicles', 'reminders', 'cashbook', 'users', 'settings']
  for (const col of KNOWN_COLLECTIONS) {
    if (clean.startsWith(`${col}_`)) {
      return {
        origCol: col,
        origId: clean.slice(col.length + 1),
      }
    }
  }

  const parts = clean.split('_')
  if (parts.length >= 2) {
    return {
      origCol: parts[0],
      origId: parts.slice(1).join('_'),
    }
  }

  return {
    origCol: itemParam?.originalCollection || 'expenses',
    origId: clean,
  }
}

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
  user?: { uid?: string; email?: string; displayName?: string; role?: string },
  existingDataParam?: Record<string, any>
): Promise<string> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const trashDocId = `${collectionName}_${id}`

  // 1. Fetch current document data
  let existingData: Record<string, any> = existingDataParam ? { ...existingDataParam } : {}
  if (!existingData || Object.keys(existingData).length === 0) {
    try {
      const snap = await getDoc(doc(db, collectionName, id))
      if (snap.exists()) {
        existingData = { id: snap.id, ...snap.data() }
      }
    } catch (err) {
      console.warn(`[TrashService] Cloud fetch for ${collectionName}/${id}:`, err)
    }
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

  // REST API fallback for server environments or when client auth token is in exchange
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const updateMaskParams = [
      'updateMask.fieldPaths=id',
      'updateMask.fieldPaths=originalId',
      'updateMask.fieldPaths=originalCollection',
      'updateMask.fieldPaths=recordName',
      'updateMask.fieldPaths=recordType',
      'updateMask.fieldPaths=isDeleted',
      'updateMask.fieldPaths=deletedAt',
      'updateMask.fieldPaths=restored',
      'updateMask.fieldPaths=updatedAt',
    ].join('&')
    const restUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trash/${trashDocId}${API_KEY ? `?key=${API_KEY}&${updateMaskParams}` : `?${updateMaskParams}`}`
    fetch(restUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: trashDocId },
          originalId: { stringValue: id },
          originalCollection: { stringValue: collectionName },
          recordName: { stringValue: recordName },
          recordType: { stringValue: collectionName },
          isDeleted: { booleanValue: true },
          deletedAt: { stringValue: now },
          restored: { booleanValue: false },
          updatedAt: { stringValue: now },
        },
      }),
    }).catch(() => {})
  } catch {}

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
  notifyDataChanged('trash')
  notifyDataChanged('audit_logs')
  notifyDataChanged('backups')
  notifyDataChanged('all')

  return trashDocId
}

/**
 * Retrieves all items currently in Trash.
 */
/**
 * Retrieves all items currently in Trash.
 * Scans both dedicated 'trash' collection and soft-deleted documents across business collections.
 */
export async function getTrashItems(collectionFilter?: string): Promise<TrashItem[]> {
  const itemsMap = new Map<string, TrashItem>()

  // 1. Read from local storage trash cache
  const localItems = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, [])
  for (const item of localItems) {
    if (item && !item.restored && item.isDeleted !== false) {
      const origCol = item.originalCollection || 'expenses'
      const origId = item.originalId || item.id
      if (isPermanentlyPurged(origCol, origId) || isPermanentlyPurged('trash', item.id)) continue
      const canonicalKey = `${origCol}_${origId}`
      if (!itemsMap.has(canonicalKey)) {
        itemsMap.set(canonicalKey, item)
      }
    }
  }

  // 2. Scan local soft-deleted entity caches
  if (typeof window !== 'undefined') {
    const collectionsToScan = ['expenses', 'trips', 'vehicles', 'payments', 'reminders']
    for (const col of collectionsToScan) {
      try {
        const rawDeleted = localStorage.getItem(`rk_deleted_${col}`)
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : []
        const rawEntities = getLocalData<any[]>(col, [])
        for (const entity of rawEntities) {
          if (entity && (entity.isDeleted === true || deletedIds.includes(entity.id))) {
            if (isPermanentlyPurged(col, entity.id)) continue
            const canonicalKey = `${col}_${entity.id}`
            if (!itemsMap.has(canonicalKey)) {
              itemsMap.set(canonicalKey, {
                id: `${col}_${entity.id}`,
                originalId: entity.id,
                originalCollection: col,
                recordName: getRecordDisplayName(col, entity),
                recordType: col,
                data: { ...entity, isDeleted: true },
                isDeleted: true,
                deletedAt: entity.deletedAt || new Date().toISOString(),
                deletedBy: entity.deletedBy || { uid: 'admin', email: 'admin@gmail.com', role: 'admin' },
                deletionReason: entity.deletionReason || 'Manual deletion',
                restored: false,
                createdAt: entity.createdAt || new Date().toISOString(),
                updatedAt: entity.updatedAt || new Date().toISOString(),
              })
            }
          }
        }
      } catch {}
    }
  }

  // 3. Query Firestore 'trash' collection
  try {
    await waitForAuthReady()
    const q = query(collection(db, TRASH_COLLECTION), orderBy('deletedAt', 'desc'), limit(300))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      const data = d.data() as TrashItem
      if (data && !data.restored && data.isDeleted !== false) {
        const origCol = data.originalCollection || 'expenses'
        const origId = data.originalId || d.id
        if (isPermanentlyPurged(origCol, origId) || isPermanentlyPurged('trash', d.id)) continue
        const canonicalKey = `${origCol}_${origId}`
        if (!itemsMap.has(canonicalKey)) {
          itemsMap.set(canonicalKey, { ...data, id: d.id })
        }
      }
    }
  } catch (err) {
    console.warn('[TrashService] Cloud getDocs /trash error:', err)
  }

  // 4. Query Firestore collections for documents with isDeleted: true (expenses, trips, vehicles, payments)
  const targetCols = collectionFilter && collectionFilter !== 'all'
    ? [collectionFilter]
    : ['expenses', 'trips', 'vehicles', 'payments', 'reminders']

  for (const col of targetCols) {
    try {
      const delQuery = query(collection(db, col), where('isDeleted', '==', true), limit(100))
      const delSnap = await getDocs(delQuery)
      for (const d of delSnap.docs) {
        const docData = d.data()
        if (docData.isPermanentlyDeleted === true) continue
        if (isPermanentlyPurged(col, d.id)) continue
        const canonicalKey = `${col}_${d.id}`
        if (!itemsMap.has(canonicalKey)) {
          const item: TrashItem = {
            id: `${col}_${d.id}`,
            originalId: d.id,
            originalCollection: col,
            recordName: getRecordDisplayName(col, { id: d.id, ...docData }),
            recordType: col,
            data: { id: d.id, ...docData },
            isDeleted: true,
            deletedAt: docData.deletedAt || new Date().toISOString(),
            deletedBy: docData.deletedBy || { uid: 'admin', email: 'admin@gmail.com', role: 'admin' },
            deletionReason: docData.deletionReason || 'Manual deletion',
            restored: false,
            createdAt: docData.createdAt || new Date().toISOString(),
            updatedAt: docData.updatedAt || new Date().toISOString(),
          }
          itemsMap.set(canonicalKey, item)
        }
      }
    } catch {}
  }

  // 5. REST API fallback for server-side SSR
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const restUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trash?pageSize=100${API_KEY ? `&key=${API_KEY}` : ''}`
    const restRes = await fetch(restUrl, { cache: 'no-store' })
    if (restRes.ok) {
      const restData = await restRes.json()
      if (restData && restData.documents) {
        for (const d of restData.documents) {
          const docId = d.name.split('/').pop()
          const fields: Record<string, any> = {}
          for (const [k, v] of Object.entries(d.fields || {})) {
            fields[k] = (v as any).stringValue || (v as any).booleanValue || (v as any).integerValue || null
          }
          if (docId && !fields.restored && fields.isDeleted !== false) {
            const origCol = fields.originalCollection || 'expenses'
            const origId = fields.originalId || docId
            if (isPermanentlyPurged(origCol, origId) || isPermanentlyPurged('trash', docId)) continue
            const canonicalKey = `${origCol}_${origId}`
            if (!itemsMap.has(canonicalKey)) {
              itemsMap.set(canonicalKey, {
                id: docId,
                originalId: origId,
                originalCollection: origCol,
                recordName: fields.recordName || `Record #${docId}`,
                recordType: fields.recordType || origCol,
                data: fields,
                isDeleted: true,
                deletedAt: fields.deletedAt || new Date().toISOString(),
                deletedBy: { uid: 'admin', email: 'admin@gmail.com', role: 'admin' },
                restored: false,
                createdAt: fields.createdAt || new Date().toISOString(),
                updatedAt: fields.updatedAt || new Date().toISOString(),
              })
            }
          }
        }
      }
    }
  } catch {}

  const resultList = Array.from(itemsMap.values()).sort(
    (a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
  )

  // Cache to local storage
  if (typeof window !== 'undefined' && resultList.length > 0) {
    setLocalData(LOCAL_STORAGE_KEY, resultList)
  }

  if (collectionFilter && collectionFilter !== 'all') {
    return resultList.filter((t) => t.originalCollection === collectionFilter)
  }

  return resultList
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
  unmarkPermanentlyPurged(originalCollection, originalId)
  if (data.tripNumber) {
    unmarkDeleted(originalCollection, data.tripNumber)
    unmarkPermanentlyPurged(originalCollection, data.tripNumber)
  }
  if (data.registrationNumber) {
    unmarkDeleted(originalCollection, data.registrationNumber)
    unmarkPermanentlyPurged(originalCollection, data.registrationNumber)
  }

  if (originalCollection === 'trips') upsertStoredTrip(restoredPayload as any)
  else if (originalCollection === 'vehicles') upsertStoredVehicle(restoredPayload as any)
  else if (originalCollection === 'payments') upsertStoredPayment(restoredPayload as any)
  else if (originalCollection === 'expenses') {
    upsertStoredExpense(restoredPayload as any)
    try {
      const trips = getStoredTrips()
      const targetTrip = trips.find(t =>
        (data.tripId && (t.id === data.tripId || t.tripNumber === data.tripId)) ||
        (data.tripNumber && (t.id === data.tripNumber || t.tripNumber === data.tripNumber))
      )
      if (targetTrip) {
        const allExpenses = [restoredPayload as any, ...getStoredExpenses().filter(e => e.id !== originalId && !isDeleted('expenses', e.id))]
        const activeTripExpenses = allExpenses.filter(e =>
          (e.tripId && (e.tripId === targetTrip.id || e.tripId === targetTrip.tripNumber)) ||
          (e.tripNumber && (e.tripNumber === targetTrip.id || e.tripNumber === targetTrip.tripNumber))
        )
        const tripExpensesSum = activeTripExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
        const baseFare = Number(targetTrip.baseFare ?? targetTrip.totalFare) || 0
        const totalFare = baseFare + tripExpensesSum
        const customerPaid = Number(targetTrip.customerPaid) || 0
        const customerBalance = Math.max(0, totalFare - customerPaid)

        const tripUpdates = {
          baseFare,
          totalExpenses: tripExpensesSum,
          totalFare,
          customerBalance,
          updatedAt: now,
        }
        upsertStoredTrip({ ...targetTrip, ...tripUpdates })
        updateDoc(doc(db, 'trips', targetTrip.id), tripUpdates).catch(() => {})
      }
    } catch (e) {
      console.warn('[TrashService] Trip reconcile after expense restore error:', e)
    }
  }
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
  notifyDataChanged('trash')
  notifyDataChanged('audit_logs')
  notifyDataChanged('backups')
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
  user?: { uid?: string; email?: string },
  itemParam?: TrashItem | null
): Promise<boolean> {
  await waitForAuthReady()

  // 1. Resolve item and canonical collection + ID
  let item: TrashItem | null = itemParam || null
  const localTrash = getLocalData<TrashItem[]>(LOCAL_STORAGE_KEY, [])
  if (!item) {
    item = localTrash.find((t) => t.id === trashId || t.originalId === trashId) || null
  }

  if (!item) {
    try {
      const snap = await getDoc(doc(db, TRASH_COLLECTION, trashId))
      if (snap.exists()) {
        item = { id: snap.id, ...snap.data() } as TrashItem
      }
    } catch {}
  }

  const { origCol, origId } = parseTrashIdentifier(trashId, item)
  const recordName = item?.recordName || `${origCol} #${origId}`

  // Mark in blacklist immediately so no concurrent query revives it
  markAsPermanentlyPurged(origCol, origId)
  markAsPermanentlyPurged('trash', trashId)

  // 2. Perform all Cloud Firestore SDK & REST deletions in parallel for maximum speed
  const deleteTasks: Promise<any>[] = []

  if (origCol && origId) {
    deleteTasks.push(deleteDoc(doc(db, origCol, origId)).catch(() => {}))
    deleteTasks.push(
      updateDoc(doc(db, origCol, origId), {
        isDeleted: false,
        isPermanentlyDeleted: true,
        deletedAt: null,
      }).catch(() => {})
    )
  }

  const trashIdsToDelete = Array.from(
    new Set(
      [
        trashId,
        `trash_${origCol}_${origId}`,
        `${origCol}_${origId}`,
        origId,
        item?.id,
      ].filter(Boolean)
    )
  ) as string[]

  for (const tid of trashIdsToDelete) {
    deleteTasks.push(deleteDoc(doc(db, TRASH_COLLECTION, tid)).catch(() => {}))
  }

  // REST API deletion tasks (executed in parallel)
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const baseRest = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

    for (const tid of trashIdsToDelete) {
      const restTrashUrl = `${baseRest}/trash/${tid}${API_KEY ? `?key=${API_KEY}` : ''}`
      deleteTasks.push(fetch(restTrashUrl, { method: 'DELETE' }).catch(() => {}))
    }

    if (origCol && origId) {
      const restOrigUrl = `${baseRest}/${origCol}/${origId}${API_KEY ? `?key=${API_KEY}` : ''}`
      deleteTasks.push(fetch(restOrigUrl, { method: 'DELETE' }).catch(() => {}))
    }
  } catch {}

  // Await all network deletions in parallel
  await Promise.allSettled(deleteTasks)

  // 5. Clean up local storage caches completely
  unmarkDeleted(origCol, origId)
  if (item?.data?.tripNumber) unmarkDeleted(origCol, item.data.tripNumber)
  if (item?.data?.registrationNumber) unmarkDeleted(origCol, item.data.registrationNumber)

  if (origCol === 'trips') removeStoredTrip(origId)
  else if (origCol === 'vehicles') removeStoredVehicle(origId)
  else if (origCol === 'payments') removeStoredPayment(origId)
  else if (origCol === 'expenses') removeStoredExpense(origId)
  else if (origCol === 'reminders') removeStoredReminder(origId)

  // Remove from local trash cache
  const updatedTrash = localTrash.filter(
    (t) => t.id !== trashId && t.originalId !== origId && !trashIdsToDelete.includes(t.id)
  )
  setLocalData(LOCAL_STORAGE_KEY, updatedTrash)

  // 6. Log audit event
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
  invalidateCache(origCol)
  notifyDataChanged('trash')
  notifyDataChanged('audit_logs')
  notifyDataChanged('backups')
  notifyDataChanged('all')

  return true
}

/**
 * Empties all items currently in Trash permanently.
 */
export async function emptyTrash(user?: { uid?: string; email?: string }): Promise<number> {
  const items = await getTrashItems()
  const count = items.length

  // Instantly clear local storage & mark blacklist
  setLocalData(LOCAL_STORAGE_KEY, [])
  for (const item of items) {
    const { origCol, origId } = parseTrashIdentifier(item.id, item)
    markAsPermanentlyPurged(origCol, origId)
    markAsPermanentlyPurged('trash', item.id)
  }

  // Execute all permanent deletions in parallel
  await Promise.allSettled(items.map((item) => permanentDeleteFromTrash(item.id, user, item)))

  invalidateCache('trash')
  notifyDataChanged('trash')
  notifyDataChanged('audit_logs')
  notifyDataChanged('backups')
  notifyDataChanged('all')

  return count
}

