import { getBackupHistory } from '@/services/backup.service'
import BackupsClient from './backups-client'

export const dynamic = 'force-dynamic'

export default async function BackupsPage() {
  const initialBackups = await getBackupHistory(50).catch(() => [])

  return <BackupsClient initialBackups={initialBackups} />
}

