// API: POST /api/webhooks/twilio
// Receives Twilio status callbacks (queued, sent, delivered, read, failed, undelivered) on Next.js / Vercel
// Validates cryptographic signature before updating Firestore.

import { NextRequest, NextResponse } from 'next/server';
import { getTwilioConfig, validateTwilioSignature, saveWhatsAppNotification, getWhatsAppNotifications } from '@/lib/whatsapp/twilio-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const config = getTwilioConfig();
    const signature = req.headers.get('x-twilio-signature') || '';

    // Read form data from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((val, key) => {
      params[key] = String(val);
    });

    // Validate signature if auth token and signature are present
    if (config.authToken && signature) {
      const fullUrl = req.url;
      const isValid = validateTwilioSignature(config.authToken, signature, fullUrl, params);
      if (!isValid) {
        console.warn('[TwilioWebhookNext] Invalid Twilio cryptographic signature.');
        return new NextResponse('Invalid signature', { status: 403 });
      }
    }

    const messageSid = params.MessageSid;
    const messageStatus = String(params.MessageStatus || '').toLowerCase();
    const errorCode = params.ErrorCode;
    const errorMessage = params.ErrorMessage;

    if (!messageSid) {
      return new NextResponse('Missing MessageSid', { status: 400 });
    }

    console.log(`[TwilioWebhookNext] Message ${messageSid} status: ${messageStatus}`);

    // Locate matching notification
    const allNotifications = await getWhatsAppNotifications('all');
    const matched = allNotifications.find((n) => n.twilioMessageSid === messageSid);

    if (matched) {
      const updates: any = {
        id: matched.id,
        updatedAt: new Date().toISOString(),
      };

      if (messageStatus === 'delivered' || messageStatus === 'read') {
        updates.status = 'delivered';
        updates.deliveredAt = new Date().toISOString();
      } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
        updates.status = 'failed';
        updates.errorMessage = errorMessage || `Twilio delivery failed (Error ${errorCode || 'N/A'})`;
      } else if (messageStatus === 'sent') {
        if (matched.status !== 'delivered') {
          updates.status = 'sent';
        }
      }

      await saveWhatsAppNotification(updates);
    }

    return new NextResponse('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err: any) {
    console.error('[TwilioWebhookNext] Error processing webhook:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}

