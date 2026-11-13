import { NextResponse, type NextRequest } from 'next/server'
import { getAuditLogs } from '@/services/audit.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const limitCount = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10)
    const action = req.nextUrl.searchParams.get('action') || undefined

    const logs = await getAuditLogs(limitCount, action)
    return NextResponse.json(logs)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
