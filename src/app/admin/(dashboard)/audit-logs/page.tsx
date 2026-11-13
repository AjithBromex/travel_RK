import { getAuditLogs } from '@/services/audit.service'
import AuditLogsClient from './audit-logs-client'

export const dynamic = 'force-dynamic'

export default async function AuditLogsPage() {
  const initialLogs = await getAuditLogs(150).catch(() => [])

  return <AuditLogsClient initialLogs={initialLogs} />
}

