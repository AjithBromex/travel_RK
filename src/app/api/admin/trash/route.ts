import { NextResponse, type NextRequest } from 'next/server'
import {
  getTrashItems,
  restoreFromTrash,
  restoreMultipleFromTrash,
  permanentDeleteFromTrash,
  emptyTrash,
} from '@/services/trash.service'
import { verifyAdminAuth } from '@/lib/admin/auth-check'
import {
  emptyAdminTrash,
  deleteAdminTrashItem,
  deleteMultipleAdminTrash,
} from '@/lib/firebase/server-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 })
  }

  try {
    const col = req.nextUrl.searchParams.get('collection') || undefined
    const items = await getTrashItems(col)
    return NextResponse.json(items)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch trash items' },
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
    const body = await req.json()
    const { action, trashId, trashIds, user } = body

    if (action === 'restore' && trashId) {
      await restoreFromTrash(trashId, user)
      return NextResponse.json({ ok: true, message: 'Record restored successfully' })
    }

    if (action === 'restore_multiple' && Array.isArray(trashIds)) {
      const res = await restoreMultipleFromTrash(trashIds, user)
      return NextResponse.json({ ok: true, ...res })
    }

    return NextResponse.json({ error: 'Invalid restore action' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to restore record' },
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
    const trashId = req.nextUrl.searchParams.get('id') || body.trashId
    const col = req.nextUrl.searchParams.get('col') || body.col
    const origId = req.nextUrl.searchParams.get('origId') || body.origId
    const action = req.nextUrl.searchParams.get('action') || body.action

    if (action === 'empty_all' || action === 'delete_all') {
      const count = await emptyAdminTrash()
      return NextResponse.json({ ok: true, count, message: `Permanently removed ${count} items` })
    }

    if (action === 'delete_multiple' && Array.isArray(body.trashIds)) {
      const count = await deleteMultipleAdminTrash(body.trashIds)
      return NextResponse.json({ ok: true, count, message: `Permanently deleted ${count} items` })
    }

    if (trashId) {
      await deleteAdminTrashItem(trashId, col, origId)
      return NextResponse.json({ ok: true, message: 'Record permanently deleted' })
    }

    return NextResponse.json({ error: 'Missing trashId' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to permanently delete record' },
      { status: 500 }
    )
  }
}
