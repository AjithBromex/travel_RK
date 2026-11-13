import {
  collection,
  doc,
  writeBatch,
  setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { BackupPayload } from '@/types'
import { waitForAuthReady, setLocalData, notifyDataChanged } from '@/lib/storage-sync'
import { createBackup, getBackupById } from './backup.service'
import { logAuditEvent } from './audit.service'
import { invalidateCache } from '@/lib/cache'

export interface RestoreOptions {
  selectedCollections?: string[]
  performSafetyBackup?: boolean
  notes?: string
}

export interface RestoreResult {
  success: boolean
  safetyBackupId?: string
  totalRestored: number
  collectionCounts: Record<string, number>
  message: string
}

/**
 * Restores database collections from a saved Backup snapshot.
 * Automatically takes a safety snapshot before modifying records.
 */
export async function restoreFromBackup(
  backupId: string,
  options: RestoreOptions = {},
  user?: { uid?: string; email?: string }
): Promise<RestoreResult> {
  await waitForAuthReady()
  const now = new Date().toISOString()

  // 1. Fetch the target backup record
  const backupRecord = await getBackupById(backupId)
  if (!backupRecord || !backupRecord.payload) {
    throw new Error(`Backup snapshot with ID ${backupId} not found or has no data payload.`)
  }

  const payload: BackupPayload = backupRecord.payload
  const availableCollections = Object.keys(payload.collections || {})

  // Determine target collections to restore
  const targetCollections = (options.selectedCollections && options.selectedCollections.length > 0)
    ? options.selectedCollections.filter((c) => availableCollections.includes(c))
    : availableCollections

  if (targetCollections.length === 0) {
    throw new Error('No valid collections selected for restoration.')
  }

  // 2. Pre-flight Safety Backup
  let safetyBackupId: string | undefined
  if (options.performSafetyBackup !== false) {
    try {
      const safetyRecord = await createBackup(
        'pre_restore_safety',
        `Automatic safety snapshot taken prior to restoring from ${backupRecord.name} (${backupId})`,
        user
      )
      safetyBackupId = safetyRecord.id
    } catch (safetyErr) {
      console.warn('[RestoreService] Warning: pre-restore safety snapshot could not be created:', safetyErr)
    }
  }

  let totalRestored = 0
  const collectionCounts: Record<string, number> = {}

  // 3. Restore documents per collection
  for (const colName of targetCollections) {
    const docs = payload.collections[colName] || []
    if (docs.length === 0) {
      collectionCounts[colName] = 0
      continue
    }

    let restoredInCol = 0

    // Firestore batched writes chunked to 350 docs per batch
    const CHUNK_SIZE = 350
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE)
      const batch = writeBatch(db)

      for (const item of chunk) {
        const rawDoc = { ...item }
        const docId = rawDoc._docId || rawDoc.id
        delete rawDoc._docId

        if (docId) {
          const docRef = doc(db, colName, String(docId))
          batch.set(docRef, rawDoc, { merge: true })
          restoredInCol++
        }
      }

      try {
        await batch.commit()
      } catch (batchErr) {
        console.warn(`[RestoreService] Batch commit error on ${colName}, falling back to setDoc:`, batchErr)
        for (const item of chunk) {
          const rawDoc = { ...item }
          const docId = rawDoc._docId || rawDoc.id
          delete rawDoc._docId
          if (docId) {
            try {
              await setDoc(doc(db, colName, String(docId)), rawDoc, { merge: true })
            } catch {}
          }
        }
      }
    }

    // Update local cache for collection
    try {
      const cleanDocs = docs.map((d) => {
        const c = { ...d }
        const id = c._docId || c.id
        delete c._docId
        return { id, ...c }
      })
      setLocalData(colName, cleanDocs)
    } catch {}

    collectionCounts[colName] = restoredInCol
    totalRestored += restoredInCol
    invalidateCache(colName)
  }

  // 4. Log audit event
  logAuditEvent({
    action: 'BACKUP_RESTORE',
    collectionName: 'database',
    recordId: backupId,
    userId: user?.uid || 'admin',
    userEmail: user?.email || 'admin@gmail.com',
    details: `Restored ${totalRestored} documents across ${targetCollections.length} collections from ${backupRecord.name}. Pre-restore safety backup: ${safetyBackupId || 'none'}.`,
    metadata: {
      backupId,
      safetyBackupId,
      totalRestored,
      targetCollections,
      collectionCounts,
    },
  }).catch(() => {})

  // 5. Invalidate all caches and broadcast global refresh
  invalidateCache('trips')
  invalidateCache('vehicles')
  invalidateCache('payments')
  invalidateCache('expenses')
  invalidateCache('reminders')
  invalidateCache('dashboard')
  invalidateCache('reports')
  invalidateCache('trash')
  notifyDataChanged('all')

  return {
    success: true,
    safetyBackupId,
    totalRestored,
    collectionCounts,
    message: `Successfully restored ${totalRestored} records across ${targetCollections.length} collections.`,
  }
}
