import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin/auth-check'
import { deleteAdminBackup, getAdminBackupById } from '@/lib/firebase/server-admin'
import { getBackupById } from '@/services/backup.service'

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
    // First try the server admin REST helper (has full credentials)
    let backup = await getAdminBackupById(id).catch(() => null)
    if (!backup) {
      backup = await getBackupById(id)
    }

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
    const result = await deleteAdminBackup(id)
    return NextResponse.json({
      message: 'Backup snapshot deleted successfully from Cloud Firestore.',
      ...result,
    })
  } catch (err: unknown) {
    console.error(`[DELETE /api/admin/backups/${params}] Error:`, err)
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to delete backup' },
      { status: 500 }
    )
  }
}
