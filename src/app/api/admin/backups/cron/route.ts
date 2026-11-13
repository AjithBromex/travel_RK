import { NextResponse, type NextRequest } from 'next/server'
import { createBackup, pruneExpiredBackups, BACKUP_RETENTION_DAYS } from '@/services/backup.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'
import { pruneAdminExpiredAuditLogs } from '@/lib/firebase/server-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized cron execution.' }, { status: 401 })
  }

  try {
    const isWeekly = req.nextUrl.searchParams.get('schedule') === 'weekly'
    const type = isWeekly ? 'scheduled_weekly' : 'scheduled_daily'

    const record = await createBackup(type, `Automated ${isWeekly ? 'weekly' : 'daily'} database backup snapshot.`, {
      uid: 'system_scheduler',
      email: 'cron@rktravelhub.internal',
      displayName: 'System Automated Scheduler',
    })

    // Execute 30-day retention cleanup for both Backups and Audit Logs
    const pruneResult = await pruneExpiredBackups(BACKUP_RETENTION_DAYS, {
      uid: 'system_scheduler',
      email: 'cron@rktravelhub.internal',
    })
    const prunedAuditLogs = await pruneAdminExpiredAuditLogs(30)

    return NextResponse.json({
      ok: true,
      backupId: record.id,
      records: record.totalRecords,
      size: record.sizeFormatted,
      timestamp: record.createdAt,
      retentionPolicyDays: BACKUP_RETENTION_DAYS,
      expiresAt: record.expiresAt,
      prunedExpiredBackups: pruneResult.prunedCount,
      prunedAuditLogs,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Cron automated backup failed' },
      { status: 500 }
    )
  }
}

