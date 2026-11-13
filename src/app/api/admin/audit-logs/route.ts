import { NextResponse, type NextRequest } from 'next/server'
import { getAuditLogs } from '@/services/audit.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'

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
