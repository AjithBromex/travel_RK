// API: GET /api/admin/whatsapp/reminders
// Lists and filters automated WhatsApp trip reminders (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin/auth-check';
import { getWhatsAppNotifications } from '@/lib/whatsapp/twilio-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';
  const search = (searchParams.get('q') || '').trim().toLowerCase();

  try {
    let notifications = await getWhatsAppNotifications(status);

    if (search) {
      notifications = notifications.filter((n) => {
        const text = [
          n.receiptNumber,
          n.customerName,
          n.tripDate,
          n.reminderDate,
          n.twilioMessageSid,
          n.status,
          n.recipientPhone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(search);
      });
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch WhatsApp notifications.' },
      { status: 500 }
    );
  }
}

