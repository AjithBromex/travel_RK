import { getBackupHistory } from '@/services/backup.service'
import BackupsClient from './backups-client'

export const dynamic = 'force-dynamic'

export default async function BackupsPage() {
  const initialBackups = await Promise.race([
    getBackupHistory(50),
    new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 350)),
  ]).catch(() => [])

  return <BackupsClient initialBackups={initialBackups} />
}

