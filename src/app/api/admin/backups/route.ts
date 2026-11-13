import { NextResponse, type NextRequest } from 'next/server'
import { getBackupHistory, createBackup } from '@/services/backup.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const list = await getBackupHistory(50)
    return NextResponse.json(list)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch backup history' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { type = 'manual', notes, user } = body

    const backup = await createBackup(type, notes, user)
    return NextResponse.json(backup, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to create database backup' },
      { status: 500 }
    )
  }
}
