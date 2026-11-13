import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AuditLogEntry, AuditAction } from '@/types'
import { waitForAuthReady, getLocalData, setLocalData } from '@/lib/storage-sync'

const COLLECTION = 'audit_logs'
const LOCAL_STORAGE_KEY = 'rk_audit_logs'

/**
 * Audit Logs Retention Policy (30 Days)
 * Audit records older than 30 days are automatically deleted from both
 * Cloud Firestore and browser storage to prevent database bloat.
 */
export const AUDIT_RETENTION_DAYS = 30

export function isAuditLogExpired(
  timestamp: string,
  retentionDays = AUDIT_RETENTION_DAYS
): boolean {
  if (!timestamp) return false
  const t = new Date(timestamp).getTime()
  if (isNaN(t)) return false
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return t < cutoff
}

export function getAuditLogExpiryDate(
  timestamp: string,
  retentionDays = AUDIT_RETENTION_DAYS
): string {
  const t = new Date(timestamp).getTime()
  return new Date(t + retentionDays * 24 * 60 * 60 * 1000).toISOString()
}

export function getDaysUntilAuditExpiry(
  timestamp: string,
  retentionDays = AUDIT_RETENTION_DAYS
): number {
  const t = new Date(timestamp).getTime()
  const exp = t + retentionDays * 24 * 60 * 60 * 1000
  const diff = exp - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export async function pruneExpiredAuditLogs(
  retentionDays = AUDIT_RETENTION_DAYS
): Promise<{ prunedCount: number }> {
  let prunedCount = 0

  // 1. Clean from localStorage
  try {
    const local = getLocalData<AuditLogEntry[]>(LOCAL_STORAGE_KEY, [])
    const filtered = local.filter((l) => !isAuditLogExpired(l.timestamp, retentionDays))
    prunedCount += Math.max(0, local.length - filtered.length)
    setLocalData(LOCAL_STORAGE_KEY, filtered)
  } catch {}

  // 2. Call server-admin API to prune from Cloud Firestore
  try {
    const res = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prune', retentionDays }),
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.prunedCount === 'number') {
        prunedCount = Math.max(prunedCount, data.prunedCount)
      }
    }
  } catch (err) {
    console.warn('[AuditService] Failed to trigger server-side audit pruning:', err)
  }

  // 3. Fallback client-side Firestore cleanup
  try {
    await waitForAuthReady()
    const snap = await getDocs(collection(db, COLLECTION))
    for (const d of snap.docs) {
      const data = d.data() as AuditLogEntry
      if (data && isAuditLogExpired(data.timestamp, retentionDays)) {
        try {
          await deleteDoc(doc(db, COLLECTION, d.id))
          prunedCount++
        } catch {}
      }
    }
  } catch {}

  return { prunedCount }
}

export async function logAuditEvent(params: {
  action: AuditAction
  collectionName: string
  recordId: string
  userId?: string
  userEmail?: string
  userRole?: string
  details?: string
  previousState?: Record<string, any>
  newState?: Record<string, any>
  metadata?: Record<string, any>
}): Promise<string> {
  const now = new Date().toISOString()
  const logId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const entry: AuditLogEntry = {
    id: logId,
    action: params.action,
    collectionName: params.collectionName,
    recordId: params.recordId,
    userId: params.userId || 'admin',
    userEmail: params.userEmail || 'admin@gmail.com',
    userRole: params.userRole || 'admin',
    timestamp: now,
    details: params.details || `${params.action} on ${params.collectionName} (${params.recordId})`,
    previousState: params.previousState ? sanitizeState(params.previousState) : undefined,
    newState: params.newState ? sanitizeState(params.newState) : undefined,
    metadata: params.metadata || {},
  }

  // 1. Write to local cache (pruning any expired logs)
  try {
    const local = getLocalData<AuditLogEntry[]>(LOCAL_STORAGE_KEY, [])
    const nonExpired = local.filter((l) => !isAuditLogExpired(l.timestamp, AUDIT_RETENTION_DAYS))
    nonExpired.unshift(entry)
    // Keep last 300 logs locally
    setLocalData(LOCAL_STORAGE_KEY, nonExpired.slice(0, 300))
  } catch {}

  // 2. Persist to Firestore
  try {
    await waitForAuthReady()
    await setDoc(doc(db, COLLECTION, logId), entry)
  } catch (err) {
    console.warn('[AuditService] Cloud audit write fallback to local:', err)
  }

  // 3. REST API fallback
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const updateMask = 'updateMask.fieldPaths=id&updateMask.fieldPaths=action&updateMask.fieldPaths=collectionName&updateMask.fieldPaths=recordId&updateMask.fieldPaths=userId&updateMask.fieldPaths=userEmail&updateMask.fieldPaths=userRole&updateMask.fieldPaths=timestamp&updateMask.fieldPaths=details'
    const restUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/audit_logs/${logId}${API_KEY ? `?key=${API_KEY}&${updateMask}` : `?${updateMask}`}`
    fetch(restUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id: { stringValue: logId },
          action: { stringValue: params.action },
          collectionName: { stringValue: params.collectionName },
          recordId: { stringValue: params.recordId },
          userId: { stringValue: params.userId || 'admin' },
          userEmail: { stringValue: params.userEmail || 'admin@gmail.com' },
          userRole: { stringValue: params.userRole || 'admin' },
          timestamp: { stringValue: now },
          details: { stringValue: entry.details },
        },
      }),
    }).catch(() => {})
  } catch {}

  return logId
}

export async function getAuditLogs(
  limitCount = 150,
  actionFilter?: string
): Promise<AuditLogEntry[]> {
  const logsMap = new Map<string, AuditLogEntry>()

  // 1. Local storage logs (ignoring expired >30d)
  const localLogs = getLocalData<AuditLogEntry[]>(LOCAL_STORAGE_KEY, [])
  for (const l of localLogs) {
    if (l && l.id && !isAuditLogExpired(l.timestamp, AUDIT_RETENTION_DAYS)) {
      logsMap.set(l.id, l)
    }
  }

  // 2. Query Firestore 'audit_logs' collection (ignoring expired >30d)
  try {
    await waitForAuthReady()
    const q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      const data = d.data() as AuditLogEntry
      if (data && d.id && !isAuditLogExpired(data.timestamp, AUDIT_RETENTION_DAYS)) {
        logsMap.set(d.id, { ...data, id: d.id })
      }
    }
  } catch (err) {
    console.warn('[AuditService] Cloud audit read fallback to local:', err)
  }

  // 3. REST API fallback for server-side SSR
  try {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3'
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const restUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/audit_logs?pageSize=100${API_KEY ? `&key=${API_KEY}` : ''}`
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
          if (docId && !logsMap.has(docId) && !isAuditLogExpired(fields.timestamp, AUDIT_RETENTION_DAYS)) {
            logsMap.set(docId, {
              id: docId,
              action: (fields.action as AuditAction) || 'SOFT_DELETE',
              collectionName: fields.collectionName || 'expenses',
              recordId: fields.recordId || docId,
              userId: fields.userId || 'admin',
              userEmail: fields.userEmail || 'admin@gmail.com',
              userRole: fields.userRole || 'admin',
              timestamp: fields.timestamp || new Date().toISOString(),
              details: fields.details || 'Audit event',
            })
          }
        }
      }
    }
  } catch {}

  // 4. Synthesize audit logs from Trash items (ensures every deleted record has an audit log entry)
  const trashItems = getLocalData<any[]>('rk_trash_items', [])
  for (const t of trashItems) {
    if (t && t.originalId) {
      const synthId = `audit_softdel_${t.originalCollection}_${t.originalId}`
      const delTime = t.deletedAt || t.updatedAt || new Date().toISOString()
      if (!logsMap.has(synthId) && !isAuditLogExpired(delTime, AUDIT_RETENTION_DAYS)) {
        logsMap.set(synthId, {
          id: synthId,
          action: 'SOFT_DELETE',
          collectionName: t.originalCollection || 'expenses',
          recordId: t.originalId,
          userId: t.deletedBy?.uid || 'admin',
          userEmail: t.deletedBy?.email || 'admin@gmail.com',
          userRole: t.deletedBy?.role || 'admin',
          timestamp: delTime,
          details: `Moved ${t.recordName || t.originalId} to Trash. Reason: ${t.deletionReason || 'User deletion'}`,
          previousState: t.data,
          metadata: { originalId: t.originalId, collectionName: t.originalCollection },
        })
      }
      if (t.restored) {
        const restoreId = `audit_restore_${t.originalCollection}_${t.originalId}`
        const resTime = t.restoredAt || new Date().toISOString()
        if (!logsMap.has(restoreId) && !isAuditLogExpired(resTime, AUDIT_RETENTION_DAYS)) {
          logsMap.set(restoreId, {
            id: restoreId,
            action: 'RESTORE',
            collectionName: t.originalCollection || 'expenses',
            recordId: t.originalId,
            userId: t.restoredBy?.uid || 'admin',
            userEmail: t.restoredBy?.email || 'admin@gmail.com',
            userRole: 'admin',
            timestamp: resTime,
            details: `Restored ${t.recordName || t.originalId} from Trash back to ${t.originalCollection}.`,
          })
        }
      }
    }
  }

  // 5. Synthesize audit logs from Backups
  const backups = getLocalData<any[]>('rk_backups_list', [])
  for (const b of backups) {
    if (b && b.id) {
      const synthId = `audit_backup_${b.id}`
      const bkpTime = b.createdAt || new Date().toISOString()
      if (!logsMap.has(synthId) && !isAuditLogExpired(bkpTime, AUDIT_RETENTION_DAYS)) {
        logsMap.set(synthId, {
          id: synthId,
          action: 'BACKUP_CREATE',
          collectionName: 'backups',
          recordId: b.id,
          userId: b.createdBy?.uid || 'admin',
          userEmail: b.createdBy?.email || 'admin@gmail.com',
          userRole: 'admin',
          timestamp: bkpTime,
          details: `Created database snapshot: ${b.name || b.id} (${b.sizeFormatted || '0 B'}, ${b.totalRecords || 0} records across 10 collections including trash).`,
          metadata: { backupId: b.id, type: b.type },
        })
      }
    }
  }

  const resultList = Array.from(logsMap.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  )

  if (typeof window !== 'undefined' && resultList.length > 0) {
    setLocalData(LOCAL_STORAGE_KEY, resultList.slice(0, 300))
    // Trigger background auto-pruning to clean Cloud Firestore and local storage
    pruneExpiredAuditLogs(AUDIT_RETENTION_DAYS).catch(() => {})
  }

  if (actionFilter && actionFilter !== 'all') {
    return resultList.filter((l) => l.action === actionFilter).slice(0, limitCount)
  }

  return resultList.slice(0, limitCount)
}

function sanitizeState(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    // Avoid logging sensitive credentials or unbounded blobs
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = val
    }
  }
  return sanitized
}

