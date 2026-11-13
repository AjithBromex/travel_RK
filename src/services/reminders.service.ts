import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Reminder, ReminderStatus } from '@/types'
import { withCache, invalidateCache } from '@/lib/cache'
import {
  waitForAuthReady,
  getStoredReminders,
  saveStoredReminders,
  upsertStoredReminder,
  removeStoredReminder,
  notifyDataChanged,
  isDeleted,
  markAsDeleted,
} from '@/lib/storage-sync'
import { moveToTrash } from './trash.service'

const COLLECTION = 'reminders'

export async function getReminders(limitCount = 100): Promise<Reminder[]> {
  const localFallback = getStoredReminders()

  return withCache(
    `reminders:list:${limitCount}`,
    async () => {
      await waitForAuthReady()
      const q = query(collection(db, COLLECTION), orderBy('dueDate', 'asc'), limit(limitCount))
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Reminder))
        .filter(
          r =>
            !r.isDeleted &&
            !isDeleted('reminders', r.id) &&
            !['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].includes(r.id)
        )

      saveStoredReminders(list)
      return list
    },
    { fallback: localFallback }
  )
}

export async function getActiveReminders(): Promise<Reminder[]> {
  const localFallback = getStoredReminders().filter(r => r.status !== 'completed')

  return withCache(
    'reminders:active',
    async () => {
      await waitForAuthReady()
      const q = query(
        collection(db, COLLECTION),
        where('status', 'in', ['pending', 'upcoming', 'overdue']),
        orderBy('dueDate', 'asc')
      )
      const snap = await getDocs(q)
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Reminder))
        .filter(
          r =>
            !r.isDeleted &&
            !isDeleted('reminders', r.id) &&
            !['rem-1', 'rem-2', 'rem-3', 'rem-4', 'rem-5', 'rem-6'].includes(r.id)
        )

      return list
    },
    { fallback: localFallback }
  )
}

export async function createReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  let docId = `rem-${Date.now()}`
  try {
    await waitForAuthReady()
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    docId = docRef.id
  } catch (err) {
    console.warn('[RemindersService] Firestore addDoc failed, saved locally:', err)
  }

  const created: Reminder = {
    id: docId,
    ...data,
    createdAt: now,
    updatedAt: now,
  }
  upsertStoredReminder(created)
  invalidateCache('reminders')
  notifyDataChanged('all')
  return docId
}

export async function updateReminder(id: string, data: Partial<Reminder>): Promise<void> {
  const stored = getStoredReminders().find(r => r.id === id)
  if (stored) {
    upsertStoredReminder({ ...stored, ...data, updatedAt: new Date().toISOString() })
  }
  try {
    await waitForAuthReady()
    await updateDoc(doc(db, COLLECTION, id), {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[RemindersService] Firestore updateDoc failed, updated locally:', err)
  }
  invalidateCache('reminders')
  notifyDataChanged('all')
}

export async function toggleReminderStatus(id: string, currentStatus: ReminderStatus): Promise<void> {
  const isCompleted = currentStatus === 'completed'
  const newStatus: ReminderStatus = isCompleted ? 'pending' : 'completed'
  const updateData: Partial<Reminder> = {
    status: newStatus,
    completedAt: isCompleted ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const stored = getStoredReminders().find(r => r.id === id)
  if (stored) {
    upsertStoredReminder({ ...stored, ...updateData })
  }
  try {
    await waitForAuthReady()
    await updateDoc(doc(db, COLLECTION, id), updateData)
  } catch (err) {
    console.warn('[RemindersService] Firestore toggleReminderStatus failed, updated locally:', err)
  }
  invalidateCache('reminders')
  notifyDataChanged('all')
}

export async function deleteReminder(id: string): Promise<void> {
  removeStoredReminder(id)
  markAsDeleted('reminders', id)
  try {
    await waitForAuthReady()
    await moveToTrash('reminders', id, 'Reminder deleted')
  } catch (err) {
    console.warn('[RemindersService] moveToTrash failed, removed locally:', err)
  }
  invalidateCache('reminders')
  notifyDataChanged('all')
}
