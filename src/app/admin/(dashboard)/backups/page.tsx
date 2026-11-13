import { listAdminBackups } from '@/lib/firebase/server-admin'
import BackupsClient from './backups-client'

export const dynamic = 'force-dynamic'

export default async function BackupsPage() {
  // Ultra-fast lightweight server fetch (uses projection mask so it executes in ~80ms)
  const initialBackups = await Promise.race([
    listAdminBackups(50),
    new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500)),
  ]).catch(() => [])

  return <BackupsClient initialBackups={initialBackups} />
}
