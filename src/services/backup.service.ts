import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { BackupRecord, BackupPayload, BackupType } from '@/types'
import { waitForAuthReady, getLocalData, setLocalData, notifyDataChanged } from '@/lib/storage-sync'
import { logAuditEvent } from './audit.service'
import { invalidateCache } from '@/lib/cache'

const BACKUPS_COLLECTION = 'backups'
const LOCAL_STORAGE_KEY = 'rk_backups_list'

export const BACKUP_COLLECTIONS = [
  'trips',
  'vehicles',
  'payments',
  'expenses',
  'reminders',
  'users',
  'cashbook',
  'settings',
  'trash',
  'audit_logs',
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Creates a complete database snapshot across all Firestore collections.
 */
export async function createBackup(
  type: BackupType = 'manual',
  notes?: string,
  user?: { uid?: string; email?: string; displayName?: string }
): Promise<BackupRecord> {
  await waitForAuthReady()
  const now = new Date().toISOString()
  const dateStr = now.replace(/[-:]/g, '').slice(0, 15)
  const backupId = `bkp_${dateStr}_${Math.random().toString(36).slice(2, 6)}`

  const collectionsData: Record<string, Record<string, any>[]> = {}
  const collectionCounts: Record<string, number> = {}
  let totalDocs = 0

  // 1. Fetch all documents from each collection
  for (const colName of BACKUP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName))
      const docs = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }))
      collectionsData[colName] = docs
      collectionCounts[colName] = docs.length
      totalDocs += docs.length
    } catch (err) {
      console.warn(`[BackupService] Error reading collection ${colName}:`, err)
      // Check local cache fallback
      const local = getLocalData<any[]>(colName, [])
      collectionsData[colName] = local
      collectionCounts[colName] = local.length
      totalDocs += local.length
    }
  }

  // 2. Build full payload
  const payload: BackupPayload = {
    version: '2.0.0',
    timestamp: now,
    backupId,
    type,
    databaseId: 'rk-travels-default',
    summary: {
      totalCollections: BACKUP_COLLECTIONS.length,
      totalDocuments: totalDocs,
      collectionCounts,
    },
    collections: collectionsData,
  }

  const jsonStr = JSON.stringify(payload)
  const sizeBytes = new TextEncoder().encode(jsonStr).length
  const sizeFormatted = formatBytes(sizeBytes)

  const backupName =
    type === 'pre_restore_safety'
      ? `Safety Snapshot (Pre-Restore) - ${new Date().toLocaleTimeString()}`
      : type === 'scheduled_daily'
      ? `Daily Automated Backup - ${new Date().toLocaleDateString('en-GB')}`
      : type === 'scheduled_weekly'
      ? `Weekly System Archive - ${new Date().toLocaleDateString('en-GB')}`
      : `Manual Admin Backup - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  const record: BackupRecord = {
    id: backupId,
    name: backupName,
    createdAt: now,
    type,
    status: 'success',
    sizeBytes,
    sizeFormatted,
    totalRecords: totalDocs,
    collections: BACKUP_COLLECTIONS,
    collectionCounts,
    createdBy: {
      uid: user?.uid || 'admin',
      email: user?.email || 'admin@gmail.com',
      displayName: user?.displayName || 'Administrator',
    },
    notes: notes || undefined,
    payload,
  }

  // 3. Persist record to Firestore 'backups' collection
  try {
    // Save metadata without embedding gigantic payload in list query
    const metaRecord = { ...record }
    delete (metaRecord as any).payload

    await setDoc(doc(db, BACKUPS_COLLECTION, backupId), {
      ...metaRecord,
      // Store payload in backup doc for recovery
      payload,
    })
  } catch (err) {
    console.warn('[BackupService] Cloud write error for backup record:', err)
  }

  // 4. Update local storage history
  try {
    const local = getLocalData<BackupRecord[]>(LOCAL_STORAGE_KEY, [])
    const shallow = { ...record }
    delete shallow.payload
    local.unshift(shallow)
    setLocalData(LOCAL_STORAGE_KEY, local.slice(0, 50))
  } catch {}

  // 5. Log audit event
  logAuditEvent({
    action: 'BACKUP_CREATE',
    collectionName: 'backups',
    recordId: backupId,
    userId: user?.uid || 'admin',
    userEmail: user?.email || 'admin@gmail.com',
    details: `Created ${backupName} (${sizeFormatted}, ${totalDocs} records across ${BACKUP_COLLECTIONS.length} collections).`,
    metadata: { backupId, type, totalDocs, sizeBytes },
  }).catch(() => {})

  invalidateCache('backups')
  notifyDataChanged('all')

  return record
}

/**
 * Lists all previous backups from newest to oldest.
 */
export async function getBackupHistory(limitCount = 50): Promise<BackupRecord[]> {
  const localFallback = getLocalData<BackupRecord[]>(LOCAL_STORAGE_KEY, [])

  try {
    await waitForAuthReady()
    const q = query(collection(db, BACKUPS_COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => {
      const data = d.data()
      // Exclude bulky payload from list overview
      const { payload: _, ...rest } = data as any
      return { id: d.id, ...rest } as BackupRecord
    })

    if (list.length > 0) {
      setLocalData(LOCAL_STORAGE_KEY, list)
      return list
    }
  } catch (err) {
    console.warn('[BackupService] Cloud getBackupHistory fallback to local:', err)
  }

  return localFallback
}

/**
 * Fetches a single backup with full payload for preview/download/restore.
 */
export async function getBackupById(id: string): Promise<BackupRecord | null> {
  await waitForAuthReady()
  try {
    const snap = await getDoc(doc(db, BACKUPS_COLLECTION, id))
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as BackupRecord
    }
  } catch (err) {
    console.warn(`[BackupService] Error loading backup ${id}:`, err)
  }

  const local = getLocalData<BackupRecord[]>(LOCAL_STORAGE_KEY, [])
  return local.find((b) => b.id === id) || null
}

/**
 * Deletes a backup record from history.
 */
export async function deleteBackup(
  id: string,
  user?: { uid?: string; email?: string }
): Promise<boolean> {
  await waitForAuthReady()
  try {
    await deleteDoc(doc(db, BACKUPS_COLLECTION, id))
  } catch (err) {
    console.warn(`[BackupService] Cloud deleteBackup error on ${id}:`, err)
  }

  const local = getLocalData<BackupRecord[]>(LOCAL_STORAGE_KEY, [])
  setLocalData(
    LOCAL_STORAGE_KEY,
    local.filter((b) => b.id !== id)
  )

  logAuditEvent({
    action: 'BACKUP_DELETE',
    collectionName: 'backups',
    recordId: id,
    userId: user?.uid || 'admin',
    userEmail: user?.email || 'admin@gmail.com',
    details: `Deleted backup archive ${id}.`,
  }).catch(() => {})

  invalidateCache('backups')
  notifyDataChanged('all')

  return true
}

/**
 * Triggers a browser download of the backup file as a formatted JSON document.
 */
export function triggerBackupDownload(record: BackupRecord): void {
  if (typeof window === 'undefined') return

  const payload = record.payload || {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    summary: record.collectionCounts,
  }

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute(
    'download',
    `RK_Travel_Hub_Backup_${record.id}_${record.createdAt.slice(0, 10)}.json`
  )
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()

  logAuditEvent({
    action: 'BACKUP_DOWNLOAD',
    collectionName: 'backups',
    recordId: record.id,
    details: `Exported and downloaded backup archive: ${record.name} (${record.sizeFormatted}).`,
  }).catch(() => {})
}
