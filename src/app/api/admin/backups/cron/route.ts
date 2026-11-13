import { NextResponse, type NextRequest } from 'next/server'
import { createBackup } from '@/services/backup.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const isWeekly = req.nextUrl.searchParams.get('schedule') === 'weekly'
    const type = isWeekly ? 'scheduled_weekly' : 'scheduled_daily'

    const record = await createBackup(type, `Automated ${isWeekly ? 'weekly' : 'daily'} database backup snapshot.`, {
      uid: 'system_scheduler',
      email: 'cron@rktravelhub.internal',
      displayName: 'System Automated Scheduler',
    })

    return NextResponse.json({
      ok: true,
      backupId: record.id,
      records: record.totalRecords,
      size: record.sizeFormatted,
      timestamp: record.createdAt,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Cron automated backup failed' },
      { status: 500 }
    )
  }
}
