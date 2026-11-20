// API: GET /api/admin/whatsapp/cron
// Automated Daily 10:00 AM IST Cron Job for WhatsApp Trip Reminders on Vercel
// 100% Free - Does not require Firebase Blaze plan or any credit card.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, secureCompare } from '@/lib/admin/auth-check';
import { executeScheduledWhatsAppCron } from '@/lib/whatsapp/twilio-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authorize Vercel Cron (Bearer CRON_SECRET or Header), or Admin session
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const isVercelCronSecretValid =
    Boolean(process.env.CRON_SECRET) &&
    Boolean(bearer) &&
    secureCompare(bearer, process.env.CRON_SECRET!);

  const isVercelSystemHeader = req.headers.get('x-vercel-cron') === '1';

  let authorized = isVercelCronSecretValid || isVercelSystemHeader;

  if (!authorized) {
    const adminCheck = verifyAdminAuth(req);
    authorized = adminCheck.authorized;
  }

  // Also support manual test via secret query param if configured
  const urlSecret = req.nextUrl.searchParams.get('secret');
  if (!authorized && urlSecret && process.env.CRON_SECRET) {
    authorized = secureCompare(urlSecret, process.env.CRON_SECRET);
  }

  if (!authorized) {
    return NextResponse.json(
      { error: 'Unauthorized cron execution. Valid CRON_SECRET or admin authorization required.' },
      { status: 401 }
    );
  }

  try {
    const isDryRun = req.nextUrl.searchParams.get('dryRun') === 'true';
    const forcedDate = req.nextUrl.searchParams.get('date') || undefined;

    console.log(`[WhatsAppCron] Running daily automated trip reminder job at ${new Date().toISOString()}`);

    const result = await executeScheduledWhatsAppCron(forcedDate, isDryRun);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      cronSchedule: '30 4 * * * (10:00 AM IST)',
      ...result,
    });
  } catch (err: any) {
    console.error('[WhatsAppCron] Unhandled error during cron execution:', err);
    return NextResponse.json(
      { error: err?.message || 'Error executing WhatsApp automated cron.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

