// API: POST /api/admin/whatsapp/test
// Safe Test Mode & Dry Run Endpoint (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin/auth-check';
import { getTwilioConfig, sendWhatsAppViaTwilio, saveWhatsAppNotification } from '@/lib/whatsapp/twilio-server';
import { buildReminderDetails, getReminderDocumentId, REMINDER_TYPE_ADMIN_5DAY } from '@/lib/whatsapp/trip-reminder-logic';
import { getStoredTrips } from '@/lib/storage-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const isDryRun = Boolean(body.isDryRun !== false); // default to true for safety
    const overrideRecipient = body.recipientPhone ? String(body.recipientPhone).trim() : undefined;

    // Sample trip payload for testing
    const sampleTrip = {
      id: body.tripId || `test_trip_${Date.now()}`,
      tripNumber: body.tripNumber || 'TRP-TEST-2026',
      receiptNumber: body.receiptNumber || '#TEST-0001',
      customerName: body.customerName || 'Test Customer (Ajith)',
      customerPhone: body.customerPhone || '9876543210',
      tripDate: body.tripDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      from: body.pickupLocation || 'Calicut Airport (CCJ)',
      to: body.destination || 'Wayanad Resorts',
      driverName: body.driverName || 'Suresh Kumar',
      driverPhone: body.driverPhone || '9847012345',
      vehicleName: body.vehicleName || 'Toyota Innova Crysta',
      vehicleNumber: body.vehicleNumber || 'KL 10 AV 4455',
      totalFare: body.tripAmount || 6500,
      isConfirmed: true,
      status: 'scheduled',
    };

    const config = getTwilioConfig();
    const reminderDetails = buildReminderDetails(sampleTrip);

    if (isDryRun) {
      return NextResponse.json({
        success: true,
        mode: 'DRY_RUN (Safe simulation - no WhatsApp message sent)',
        sampleTrip,
        reminderDetails,
        plainTextMessagePreview: reminderDetails.plainTextMessage,
        contentVariables: reminderDetails.contentVariables,
        configuredAdminPhone: config.adminPhone || 'NOT_SET',
        configuredSender: config.whatsappFrom || 'NOT_SET',
        configuredContentSid: config.contentSid || 'NONE (Free-form / Sandbox body mode)',
      });
    }

    // LIVE TEST EXECUTION
    const sendResult = await sendWhatsAppViaTwilio(config, reminderDetails, overrideRecipient);

    const notificationId = `test_${getReminderDocumentId(sampleTrip.id, sampleTrip.tripDate)}`;
    await saveWhatsAppNotification({
      id: notificationId,
      tripId: sampleTrip.id,
      receiptNumber: reminderDetails.receiptNumber,
      customerName: reminderDetails.customerName,
      customerPhone: reminderDetails.customerPhone,
      reminderType: 'admin_5day_test',
      tripDate: sampleTrip.tripDate,
      reminderDate: new Date().toISOString().slice(0, 10),
      recipientPhone: overrideRecipient || config.adminPhone,
      templateSid: config.contentSid || null,
      twilioMessageSid: sendResult.messageSid || null,
      status: sendResult.success ? 'submitted' : 'failed',
      errorMessage: sendResult.errorMessage || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: sendResult.success,
      mode: 'LIVE_TEST',
      messageSid: sendResult.messageSid,
      status: sendResult.status,
      errorMessage: sendResult.errorMessage,
      notificationId,
      preview: reminderDetails.plainTextMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error executing test mode.' },
      { status: 500 }
    );
  }
}

