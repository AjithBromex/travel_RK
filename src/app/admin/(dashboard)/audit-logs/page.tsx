import { getAuditLogs } from '@/services/audit.service'
import AuditLogsClient from './audit-logs-client'

export const dynamic = 'force-dynamic'

export default async function AuditLogsPage() {
  const initialLogs = await Promise.race([
    getAuditLogs(150),
    new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 350)),
  ]).catch(() => [])

  return <AuditLogsClient initialLogs={initialLogs} />
}

