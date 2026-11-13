import {
  collection,
  doc,
  writeBatch,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { BackupPayload } from '@/types'
import {
  waitForAuthReady,
  setLocalData,
  notifyDataChanged,
  unmarkDeleted,
  clearDeletedMarkers,
  saveStoredTrips,
  saveStoredVehicles,
  saveStoredPayments,
  saveStoredExpenses,
  saveStoredReminders,
} from '@/lib/storage-sync'
import { unmarkPermanentlyPurged } from './trash.service'
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
  if (!backupRecord) {
    throw new Error(`Backup snapshot with ID "${backupId}" was not found.`)
  }

  const collections = backupRecord.payload?.collections || {}
  const availableCollections = Object.keys(collections)

  if (!backupRecord.payload || availableCollections.length === 0) {
    throw new Error(
      `Backup snapshot "${backupRecord.name || backupId}" has no stored data payload. This snapshot was created before chunked storage rules were deployed. Please delete this record and click "+ Create Backup Now" to create a fresh, restorable backup.`
    )
  }

  const payload: BackupPayload = backupRecord.payload

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

    // A. Wipe any stale deletion masks in localStorage for this collection
    clearDeletedMarkers(colName)

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

          const sanitizedDoc: Record<string, any> = {
            ...rawDoc,
            id: String(docId),
          }

          if (colName !== 'trash') {
            sanitizedDoc.isDeleted = false
            delete sanitizedDoc.deletedAt
            delete sanitizedDoc.deletedBy
            delete sanitizedDoc.deletionReason
            delete sanitizedDoc.purgeScheduledAt
          }

          batch.set(docRef, sanitizedDoc)

          // If restoring into an active collection, eliminate any matching soft-delete entry from 'trash'
          if (colName !== 'trash') {
            batch.delete(doc(db, 'trash', `trash_${colName}_${docId}`))
            batch.delete(doc(db, 'trash', String(docId)))
          }

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
            const sanitizedDoc: Record<string, any> = {
              ...rawDoc,
              id: String(docId),
            }
            if (colName !== 'trash') {
              sanitizedDoc.isDeleted = false
              delete sanitizedDoc.deletedAt
              delete sanitizedDoc.deletedBy
              delete sanitizedDoc.deletionReason
              delete sanitizedDoc.purgeScheduledAt
            }
            try {
              await setDoc(doc(db, colName, String(docId)), sanitizedDoc)
              if (colName !== 'trash') {
                await deleteDoc(doc(db, 'trash', `trash_${colName}_${docId}`)).catch(() => {})
                await deleteDoc(doc(db, 'trash', String(docId))).catch(() => {})
              }
            } catch {}
          }
        }
      }
    }

    // B. Clean local storage and unmark deletion masks for each restored document
    const cleanDocs = docs.map((d) => {
      const c = { ...d }
      const id = String(c._docId || c.id)
      delete c._docId
      const finalDoc = {
        ...c,
        id,
        isDeleted: colName === 'trash' ? (c.isDeleted ?? true) : false,
      }
      if (colName !== 'trash') {
        unmarkDeleted(colName, id)
        unmarkPermanentlyPurged(colName, id)
        if (c.tripNumber) {
          unmarkDeleted(colName, String(c.tripNumber))
          unmarkPermanentlyPurged(colName, String(c.tripNumber))
        }
        if (c.registrationNumber) {
          unmarkDeleted(colName, String(c.registrationNumber))
          unmarkPermanentlyPurged(colName, String(c.registrationNumber))
        }
      }
      return finalDoc
    })

    setLocalData(colName, cleanDocs)

    // C. Populate specific typed storage helpers
    if (colName === 'trips') {
      saveStoredTrips(cleanDocs as any)
    } else if (colName === 'vehicles') {
      saveStoredVehicles(cleanDocs as any)
    } else if (colName === 'payments') {
      saveStoredPayments(cleanDocs as any)
    } else if (colName === 'expenses') {
      saveStoredExpenses(cleanDocs as any)
    } else if (colName === 'reminders') {
      saveStoredReminders(cleanDocs as any)
    }

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

  // 5. Invalidate all caches and broadcast global refresh across tabs
  clearDeletedMarkers()
  invalidateCache()
  notifyDataChanged('all')
  notifyDataChanged('trips')
  notifyDataChanged('vehicles')
  notifyDataChanged('payments')
  notifyDataChanged('expenses')
  notifyDataChanged('reminders')
  notifyDataChanged('cashbook')
  notifyDataChanged('dashboard')
  notifyDataChanged('reports')
  notifyDataChanged('trash')

  return {
    success: true,
    safetyBackupId,
    totalRestored,
    collectionCounts,
    message: `Successfully restored ${totalRestored} records across ${targetCollections.length} collections.`,
  }
}

