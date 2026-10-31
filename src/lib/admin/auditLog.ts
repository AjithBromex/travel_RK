import { getAdminFirestore, hasAdminConfig } from '@/lib/firebase/admin'

export interface AuditLogEntry {
  id?: string
  action: 'ADMIN_LOGIN_SUCCESS' | 'ADMIN_LOGIN_FAILURE' | 'ADMIN_LOGIN_LOCKOUT' | 'ADMIN_LOGOUT'
  email: string
  ip: string
  userAgent?: string
  reason?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Logs an event to the Firestore `audit_logs` collection.
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const timestamp = new Date().toISOString()
  const payload: AuditLogEntry = {
    ...entry,
    timestamp,
  }

  try {
    if (hasAdminConfig()) {
      const db = getAdminFirestore()
      await db.collection('audit_logs').add(payload)
    } else {
      console.warn('[AuditLog:LocalFallback]', JSON.stringify(payload))
    }
  } catch (err) {
    console.error('[AuditLog] Failed to persist audit entry to Firestore:', err)
  }
}
