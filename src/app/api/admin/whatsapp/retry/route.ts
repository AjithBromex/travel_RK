// API: POST /api/admin/whatsapp/retry
// Controlled manual retry for failed WhatsApp notifications with duplicate protection (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin/auth-check';
import { retryNotification } from '@/lib/whatsapp/twilio-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    const result = await retryNotification(id);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error during retry.' },
      { status: 500 }
    );
  }
}

