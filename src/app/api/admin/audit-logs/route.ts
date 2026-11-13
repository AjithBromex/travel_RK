import { NextResponse, type NextRequest } from 'next/server'
import { getAuditLogs, AUDIT_RETENTION_DAYS } from '@/services/audit.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'
import {
  pruneAdminExpiredAuditLogs,
  deleteAdminAuditLog,
} from '@/lib/firebase/server-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '150', 10)
    const action = req.nextUrl.searchParams.get('action') || undefined
    const logs = await getAuditLogs(limitParam, action)
    return NextResponse.json(logs)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch audit logs' },
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
    const action = body.action || req.nextUrl.searchParams.get('action')

    if (action === 'prune') {
      const days =
        typeof body.retentionDays === 'number' && body.retentionDays > 0
          ? body.retentionDays
          : AUDIT_RETENTION_DAYS
      const prunedCount = await pruneAdminExpiredAuditLogs(days)
      return NextResponse.json({
        ok: true,
        prunedCount,
        message: `Pruned ${prunedCount} audit log(s) older than ${days} days.`,
      })
    }

    return NextResponse.json({ error: 'Invalid action requested' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process audit logs request' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const logId = req.nextUrl.searchParams.get('id') || body.id

    if (!logId) {
      return NextResponse.json({ error: 'Missing log ID' }, { status: 400 })
    }

    const ok = await deleteAdminAuditLog(logId)
    return NextResponse.json({ ok, message: `Audit log ${logId} deleted.` })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to delete audit log' },
      { status: 500 }
    )
  }
}

