// Persistent IndexedDB Storage for Full Backup Payloads
// Prevents 5MB localStorage quota limits and ensures large backups (>1MB) are safely preserved offline

import type { BackupPayload } from '@/types'

const DB_NAME = 'rk_travels_backups_db'
const DB_VERSION = 1
const STORE_NAME = 'backup_payloads'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'))
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'backupId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Stores a full backup payload into IndexedDB.
 */
export async function saveBackupPayload(backupId: string, payload: BackupPayload): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const putReq = store.put({
        backupId,
        payload,
        savedAt: new Date().toISOString(),
      })
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    })
  } catch (err) {
    console.warn('[BackupDB] Could not cache backup payload to IndexedDB:', err)
  }
}

/**
 * Retrieves a full backup payload from IndexedDB by backup ID.
 */
export async function getBackupPayload(backupId: string): Promise<BackupPayload | null> {
  if (typeof window === 'undefined') return null
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(backupId)
      getReq.onsuccess = () => {
        resolve(getReq.result?.payload || null)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  } catch (err) {
    console.warn('[BackupDB] Could not read backup payload from IndexedDB:', err)
    return null
  }
}

/**
 * Removes a cached backup payload from IndexedDB.
 */
export async function deleteBackupPayload(backupId: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const delReq = store.delete(backupId)
      delReq.onsuccess = () => resolve()
      delReq.onerror = () => reject(delReq.error)
    })
  } catch (err) {
    console.warn('[BackupDB] Could not delete backup payload from IndexedDB:', err)
  }
}
