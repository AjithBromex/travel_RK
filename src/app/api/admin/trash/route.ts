import { NextResponse, type NextRequest } from 'next/server'
import {
  getTrashItems,
  restoreFromTrash,
  restoreMultipleFromTrash,
  permanentDeleteFromTrash,
  emptyTrash,
} from '@/services/trash.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
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
  try {
    const body = await req.json().catch(() => ({}))
    const trashId = req.nextUrl.searchParams.get('id') || body.trashId
    const col = req.nextUrl.searchParams.get('col') || body.col
    const origId = req.nextUrl.searchParams.get('origId') || body.origId
    const action = req.nextUrl.searchParams.get('action') || body.action

    if (action === 'empty_all') {
      const count = await emptyTrash()
      return NextResponse.json({ ok: true, count, message: `Permanently removed ${count} items` })
    }

    if (trashId) {
      const syntheticItem =
        col && origId
          ? ({ originalCollection: col, originalId: origId, id: trashId } as any)
          : undefined
      await permanentDeleteFromTrash(trashId, undefined, syntheticItem)
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

