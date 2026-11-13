import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AuditLogEntry, AuditAction } from '@/types'
import { waitForAuthReady, getLocalData, setLocalData } from '@/lib/storage-sync'

const COLLECTION = 'audit_logs'
const LOCAL_STORAGE_KEY = 'rk_audit_logs'

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

  // 1. Write to local cache
  try {
    const local = getLocalData<AuditLogEntry[]>(LOCAL_STORAGE_KEY, [])
    local.unshift(entry)
    // Keep last 300 logs locally
    setLocalData(LOCAL_STORAGE_KEY, local.slice(0, 300))
  } catch {}

  // 2. Persist to Firestore
  try {
    await waitForAuthReady()
    await setDoc(doc(db, COLLECTION, logId), entry)
  } catch (err) {
    console.warn('[AuditService] Cloud audit write fallback to local:', err)
  }

  return logId
}

export async function getAuditLogs(
  limitCount = 100,
  actionFilter?: string
): Promise<AuditLogEntry[]> {
  const localFallback = getLocalData<AuditLogEntry[]>(LOCAL_STORAGE_KEY, [])

  try {
    await waitForAuthReady()
    const q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry))

    if (list.length > 0) {
      setLocalData(LOCAL_STORAGE_KEY, list)
      if (actionFilter && actionFilter !== 'all') {
        return list.filter((l) => l.action === actionFilter)
      }
      return list
    }
  } catch (err) {
    console.warn('[AuditService] Cloud audit read fallback to local:', err)
  }

  if (actionFilter && actionFilter !== 'all') {
    return localFallback.filter((l) => l.action === actionFilter)
  }
  return localFallback.slice(0, limitCount)
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

