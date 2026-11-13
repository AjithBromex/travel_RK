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
import { logAuditEvent, getAuditLogs } from './audit.service'
import { getTrashItems } from './trash.service'
import { invalidateCache } from '@/lib/cache'

const BACKUPS_COLLECTION = 'backups'
const LOCAL_STORAGE_KEY = 'rk_backups_list'

export const BACKUP_RETENTION_DAYS = 30

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

/**
 * Calculates the exact expiry timestamp for a backup based on retention days (30 days).
 */
export function getBackupExpiryDate(createdAt: string, retentionDays = BACKUP_RETENTION_DAYS): string {
  const date = new Date(createdAt)
  date.setDate(date.getDate() + retentionDays)
  return date.toISOString()
}

/**
 * Returns true if a backup is older than the retention threshold (30 days).
 */
export function isBackupExpired(createdAt: string, retentionDays = BACKUP_RETENTION_DAYS): boolean {
  if (!createdAt) return false
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs > retentionDays * 24 * 60 * 60 * 1000
}

/**
 * Returns the number of days remaining before this backup expires (0 to 30).
 */
export function getDaysUntilExpiry(createdAt: string, retentionDays = BACKUP_RETENTION_DAYS): number {
  if (!createdAt) return 0
  const expiryTime = new Date(createdAt).getTime() + retentionDays * 24 * 60 * 60 * 1000
  const diffMs = expiryTime - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

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
    let docs: Record<string, any>[] = []
    try {
      const snap = await getDocs(collection(db, colName))
      docs = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }))
    } catch (err) {
      console.warn(`[BackupService] Error reading collection ${colName}:`, err)
      const local = getLocalData<any[]>(colName, [])
      docs = local.map((d) => ({ _docId: d.id || d._docId, ...d }))
    }

    if (colName === 'trash') {
      try {
        const trashItems = await getTrashItems()
        const existingIds = new Set(docs.map((d: any) => d.id || d._docId))
        for (const t of trashItems) {
          if (!existingIds.has(t.id)) {
            docs.push({ _docId: t.id, ...t })
          }
        }
      } catch {}
    } else if (colName === 'audit_logs') {
      try {
        const auditLogs = await getAuditLogs(200)
        const existingIds = new Set(docs.map((d: any) => d.id || d._docId))
        for (const a of auditLogs) {
          if (!existingIds.has(a.id)) {
            docs.push({ _docId: a.id, ...a })
          }
        }
      } catch {}
    }

    collectionsData[colName] = docs
    collectionCounts[colName] = docs.length
    totalDocs += docs.length
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
    retentionDays: BACKUP_RETENTION_DAYS,
    expiresAt: getBackupExpiryDate(now, BACKUP_RETENTION_DAYS),
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
  notifyDataChanged('backups')
  notifyDataChanged('audit_logs')
  notifyDataChanged('trash')
  notifyDataChanged('all')

  // Auto-prune any backups older than 30 days
  pruneExpiredBackups(BACKUP_RETENTION_DAYS).catch((pruneErr) =>
    console.warn('[BackupService] Background prune error:', pruneErr)
  )

  return record
}

/**
 * Lists all previous backups from newest to oldest within the 30-day retention window.
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
      // Filter out backups older than 30 days
      const validList = list.filter((b) => !isBackupExpired(b.createdAt, BACKUP_RETENTION_DAYS))
      if (validList.length !== list.length) {
        pruneExpiredBackups(BACKUP_RETENTION_DAYS).catch(() => {})
      }
      setLocalData(LOCAL_STORAGE_KEY, validList)
      return validList
    }
  } catch (err) {
    console.warn('[BackupService] Cloud getBackupHistory fallback to local:', err)
  }

  // REST API fallback for server-side SSR
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const restUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/backups?pageSize=50${API_KEY ? `&key=${API_KEY}` : ''}`
    const restRes = await fetch(restUrl, { cache: 'no-store' })
    if (restRes.ok) {
      const restData = await restRes.json()
      if (restData && restData.documents) {
        const restList: BackupRecord[] = restData.documents.map((d: any) => {
          const docId = d.name.split('/').pop()
          const fields: Record<string, any> = {}
          for (const [k, v] of Object.entries(d.fields || {})) {
            fields[k] = (v as any).stringValue || (v as any).booleanValue || (v as any).integerValue || null
          }
          return { id: docId, ...fields } as BackupRecord
        })
        const validRest = restList.filter((b) => !isBackupExpired(b.createdAt, BACKUP_RETENTION_DAYS))
        if (validRest.length > 0) {
          return validRest
        }
      }
    }
  } catch {}

  return localFallback.filter((b) => !isBackupExpired(b.createdAt, BACKUP_RETENTION_DAYS))
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
  notifyDataChanged('backups')
  notifyDataChanged('audit_logs')
  notifyDataChanged('trash')
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

/**
 * Automatically prunes any backup archives older than the 30-day retention threshold.
 * Removes obsolete records from Firestore and local cache, and records an audit log.
 */
export async function pruneExpiredBackups(
  retentionDays: number = BACKUP_RETENTION_DAYS,
  user?: { uid?: string; email?: string }
): Promise<{ prunedCount: number; prunedIds: string[] }> {
  await waitForAuthReady()
  const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const prunedIds: string[] = []

  try {
    const snap = await getDocs(collection(db, BACKUPS_COLLECTION))
    for (const d of snap.docs) {
      const data = d.data() as BackupRecord
      if (data.createdAt && data.createdAt < cutoffTime) {
        try {
          await deleteDoc(doc(db, BACKUPS_COLLECTION, d.id))
          prunedIds.push(d.id)
        } catch (delErr) {
          console.warn(`[BackupService] Failed to delete expired backup doc ${d.id}:`, delErr)
        }
      }
    }
  } catch (err) {
    console.warn('[BackupService] Cloud check during prune error:', err)
  }

  // Also clean local storage cache
  try {
    const local = getLocalData<BackupRecord[]>(LOCAL_STORAGE_KEY, [])
    const beforeCount = local.length
    const remaining = local.filter((b) => !b.createdAt || b.createdAt >= cutoffTime)
    if (remaining.length !== beforeCount) {
      setLocalData(LOCAL_STORAGE_KEY, remaining)
    }
  } catch {}

  if (prunedIds.length > 0) {
    logAuditEvent({
      action: 'BACKUP_DELETE',
      collectionName: 'backups',
      recordId: 'retention_prune_30d',
      userId: user?.uid || 'system_retention',
      userEmail: user?.email || 'system@rk-travel.com',
      details: `30-Day Retention Policy: Pruned ${prunedIds.length} expired backup snapshot(s) older than 30 days.`,
      metadata: { retentionDays, cutoffTime, prunedIds, count: prunedIds.length },
    }).catch(() => {})

    invalidateCache('backups')
    notifyDataChanged('all')
  }

  return { prunedCount: prunedIds.length, prunedIds }
}

