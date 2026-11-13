import { NextResponse, type NextRequest } from 'next/server'
import { getBackupById, deleteBackup } from '@/services/backup.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const backup = await getBackupById(id)
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    return NextResponse.json(backup)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to retrieve backup' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await deleteBackup(id)
    return NextResponse.json({ ok: true, message: 'Backup deleted successfully' })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to delete backup' },
      { status: 500 }
    )
  }
}

