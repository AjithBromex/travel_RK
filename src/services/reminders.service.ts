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

const COLLECTION = 'reminders'

export async function getReminders(limitCount = 100): Promise<Reminder[]> {
  return withCache(
    `reminders:list:${limitCount}`,
    async () => {
      const q = query(collection(db, COLLECTION), orderBy('dueDate', 'asc'), limit(limitCount))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reminder))
    },
    { fallback: [] }
  )
}

export async function getActiveReminders(): Promise<Reminder[]> {
  return withCache(
    'reminders:active',
    async () => {
      const q = query(
        collection(db, COLLECTION),
        where('status', 'in', ['pending', 'upcoming', 'overdue']),
        orderBy('dueDate', 'asc')
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reminder))
    },
    { fallback: [] }
  )
}

export async function createReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  invalidateCache('reminders')
  return docRef.id
}

export async function updateReminder(id: string, data: Partial<Reminder>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  })
  invalidateCache('reminders')
}

export async function toggleReminderStatus(id: string, currentStatus: ReminderStatus): Promise<void> {
  const isCompleted = currentStatus === 'completed'
  const newStatus: ReminderStatus = isCompleted ? 'pending' : 'completed'
  const updateData: Partial<Reminder> = {
    status: newStatus,
    completedAt: isCompleted ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await updateDoc(doc(db, COLLECTION, id), updateData)
  invalidateCache('reminders')
}

export async function deleteReminder(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  invalidateCache('reminders')
}
