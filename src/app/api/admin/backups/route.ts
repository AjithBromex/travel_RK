import { NextResponse, type NextRequest } from 'next/server'
import { getBackupHistory, createBackup, pruneExpiredBackups, BACKUP_RETENTION_DAYS } from '@/services/backup.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const list = await getBackupHistory(50)
    return NextResponse.json({
      backups: list,
      retentionPolicyDays: BACKUP_RETENTION_DAYS,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch backup history' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))

    if (body.action === 'prune') {
      const result = await pruneExpiredBackups(BACKUP_RETENTION_DAYS, body.user)
      return NextResponse.json({
        ok: true,
        message: `Pruned ${result.prunedCount} expired backup(s) older than ${BACKUP_RETENTION_DAYS} days.`,
        prunedCount: result.prunedCount,
      })
    }

    const { type = 'manual', notes, user } = body
    const backup = await createBackup(type, notes, user)
    return NextResponse.json(backup, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process backup request' },
      { status: 500 }
    )
  }
}
