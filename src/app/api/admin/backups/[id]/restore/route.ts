import { NextResponse, type NextRequest } from 'next/server'
import { restoreFromBackup } from '@/services/restore.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { selectedCollections, performSafetyBackup = true, confirmationCode, user } = body

    if (confirmationCode !== 'RESTORE') {
      return NextResponse.json(
        { error: 'Confirmation phrase "RESTORE" is strictly required to execute database recovery.' },
        { status: 400 }
      )
    }

    const result = await restoreFromBackup(
      id,
      {
        selectedCollections,
        performSafetyBackup,
      },
      user
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to restore database from backup' },
      { status: 500 }
    )
  }
}
