// Core Reminder Processor with Firestore Atomic Idempotency Locks
import * as admin from 'firebase-admin';
import { getTwilioConfig } from '../config';
import { sendTwilioTripReminder } from './twilioClient';

// Ensure Firebase Admin is initialized once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const TIMEZONE_IST = 'Asia/Kolkata';
export const REMINDER_TYPE_ADMIN_5DAY = 'admin_5day';

/**
 * Returns date parts in Asia/Kolkata timezone
 */
export function getKolkataDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, dateStr };
}

/**
 * Calculates target trip date 5 calendar days ahead in Asia/Kolkata
 */
export function getTargetTripDateKolkata(daysAhead = 5, baseDate: Date = new Date()): string {
  const { year, month, day } = getKolkataDateParts(baseDate);
  const target = new Date(Date.UTC(year, month - 1, day + daysAhead, 12, 0, 0));
  return getKolkataDateParts(target).dateStr;
}

/**
 * Extracts and formats all parameters for the 5-day admin trip reminder according to Requirement 5.
 */
export function buildReminderDetails(
  trip: Record<string, any>,
  vehicle?: Record<string, any> | null
) {
  const receiptNumber = String(
    trip.receiptNumber || trip.tripNumber || trip.id || 'N/A'
  ).trim();

  const customerName = String(
    trip.customerName || trip.customer || 'Valued Customer'
  ).trim();

  const customerPhone = String(
    trip.customerPhone || trip.phone || 'N/A'
  ).trim();

  const tripDate = String(trip.tripDate || trip.startDate || 'N/A').trim();

  const pickupLocation = String(trip.from || trip.pickupLocation || 'N/A').trim();
  const destination = String(trip.to || trip.destination || 'N/A').trim();

  const driverName = String(trip.driverName || trip.driver || 'Unassigned').trim();
  const driverPhone = String(trip.driverPhone || 'N/A').trim();

  let vehicleName = String(vehicle?.name || trip.vehicleName || trip.vehicle || '').trim();
  let vehicleNumber = String(vehicle?.registrationNumber || '').trim();

  if (!vehicleNumber && trip.vehicle) {
    const match = String(trip.vehicle).match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      if (!vehicleName) vehicleName = match[1].trim();
      vehicleNumber = match[2].trim();
    } else {
      vehicleNumber = String(trip.vehicle);
    }
  }

  if (!vehicleName) vehicleName = 'Standard Fleet';
  if (!vehicleNumber) vehicleNumber = 'Pending Assignment';

  const rawAmount = Number(trip.totalFare || trip.baseFare || 0);
  const tripAmount = `₹${rawAmount.toLocaleString('en-IN')}`;

  const plainTextMessage = [
    'Hello Admin,',
    '',
    'A trip is scheduled in 5 days!',
    '',
    'TRIP DETAILS',
    '',
    `Receipt Number: ${receiptNumber}`,
    '',
    `Customer Name: ${customerName}`,
    '',
    `Customer Phone: ${customerPhone}`,
    '',
    `Trip Date: ${tripDate}`,
    '',
    `Pickup Location: ${pickupLocation}`,
    '',
    `Destination: ${destination}`,
    '',
    `Assigned Driver: ${driverName}`,
    '',
    `Driver Phone: ${driverPhone}`,
    '',
    `Vehicle: ${vehicleName}`,
    '',
    `Vehicle Registration: ${vehicleNumber}`,
    '',
    `Trip Amount: ${tripAmount}`,
    '',
    'Please verify the vehicle, driver and trip arrangements before departure.',
    '',
    'Regards,',
    'RK Travel Hub.',
  ].join('\n');

  const contentVariables: Record<string, string> = {
    '1': receiptNumber,
    '2': customerName,
    '3': customerPhone,
    '4': tripDate,
    '5': pickupLocation,
    '6': destination,
    '7': driverName,
    '8': driverPhone,
    '9': vehicleName,
    '10': vehicleNumber,
    '11': tripAmount,
    receiptNumber,
    customerName,
    customerPhone,
    tripDate,
    pickupLocation,
    destination,
    driverName,
    driverPhone,
    vehicleName,
    vehicleNumber,
    tripAmount,
  };

  return {
    receiptNumber,
    customerName,
    customerPhone,
    tripDate,
    pickupLocation,
    destination,
    driverName,
    driverPhone,
    vehicleName,
    vehicleNumber,
    tripAmount,
    plainTextMessage,
    contentVariables,
  };
}

export interface ProcessRemindersResult {
  targetDate: string;
  totalTripsFound: number;
  eligibleCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  details: { tripId: string; status: string; messageSid?: string; error?: string }[];
}

/**
 * Main scheduled execution: processes all 5-day automated trip reminders with atomic lock protection
 */
export async function processAdminTripReminders(
  forcedTargetDate?: string,
  isDryRun = false
): Promise<ProcessRemindersResult> {
  const config = getTwilioConfig();
  const todayStr = getKolkataDateParts().dateStr;
  const targetDate = forcedTargetDate || getTargetTripDateKolkata(5);

  console.log(`[TripReminders] Running automated 5-day reminder job. Today (IST): ${todayStr}, Target Trip Date: ${targetDate}`);

  // Query eligible trips from Firestore
  const tripsRef = db.collection('trips');
  const snapshot = await tripsRef
    .where('tripDate', '==', targetDate)
    .get();

  const totalTripsFound = snapshot.size;
  let eligibleCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const details: ProcessRemindersResult['details'] = [];

  for (const docSnap of snapshot.docs) {
    const trip = docSnap.data();
    const tripId = docSnap.id;

    // 1. Re-validate latest trip document state
    if (trip.isDeleted || trip.deletedAt) {
      console.log(`[TripReminders] Trip ${tripId} is deleted/soft-deleted. Skipping.`);
      skippedCount++;
      details.push({ tripId, status: 'skipped_deleted' });
      continue;
    }

    const tripStatus = String(trip.status || 'scheduled').toLowerCase();
    if (tripStatus === 'cancelled' || tripStatus === 'completed') {
      console.log(`[TripReminders] Trip ${tripId} status is '${tripStatus}'. Skipping.`);
      skippedCount++;
      details.push({ tripId, status: `skipped_${tripStatus}` });
      continue;
    }

    if (!trip.isConfirmed) {
      console.log(`[TripReminders] Trip ${tripId} is not confirmed by admin. Skipping.`);
      skippedCount++;
      details.push({ tripId, status: 'skipped_unconfirmed' });
      continue;
    }

    eligibleCount++;

    // 2. Resolve vehicle if vehicleId exists
    let vehicleData: Record<string, any> | null = null;
    if (trip.vehicleId) {
      try {
        const vSnap = await db.collection('vehicles').doc(trip.vehicleId).get();
        if (vSnap.exists) {
          vehicleData = vSnap.data() || null;
        }
      } catch (err) {
        console.warn(`[TripReminders] Error fetching vehicle ${trip.vehicleId}:`, err);
      }
    }

    const reminderDetails = buildReminderDetails(trip, vehicleData);
    const cleanDate = targetDate.replace(/[^0-9-]/g, '');
    const notificationId = `${tripId}_${REMINDER_TYPE_ADMIN_5DAY}_${cleanDate}`;
    const notifRef = db.collection('whatsapp_notifications').doc(notificationId);

    // 3. Atomic Firestore Transaction for Idempotent Lock
    const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let canProceed = false;

    try {
      canProceed = await db.runTransaction(async (transaction) => {
        const notifSnap = await transaction.get(notifRef);

        if (notifSnap.exists) {
          const existing = notifSnap.data() || {};
          const currentStatus = existing.status;

          // Never send duplicate if already submitted, sent, delivered, or missed
          if (['submitted', 'sent', 'delivered', 'missed'].includes(currentStatus)) {
            console.log(`[TripReminders] Notification ${notificationId} already in terminal state '${currentStatus}'. Skipping.`);
            return false;
          }

          // If currently processing, check lock freshness (15-minute lease)
          if (currentStatus === 'processing') {
            const updatedAtMs = existing.updatedAt?.toMillis ? existing.updatedAt.toMillis() : Date.now();
            const ageMs = Date.now() - updatedAtMs;
            if (ageMs < 15 * 60 * 1000) {
              console.log(`[TripReminders] Notification ${notificationId} is currently being processed by another worker. Skipping.`);
              return false;
            }
            console.warn(`[TripReminders] Stale processing lock on ${notificationId} (${ageMs}ms old). Re-acquiring lock.`);
          }
        }

        // Acquire processing lock
        transaction.set(
          notifRef,
          {
            id: notificationId,
            tripId,
            receiptNumber: reminderDetails.receiptNumber,
            customerName: reminderDetails.customerName,
            customerPhone: reminderDetails.customerPhone,
            reminderType: REMINDER_TYPE_ADMIN_5DAY,
            tripDate: targetDate,
            reminderDate: todayStr,
            recipientPhone: config.adminPhone,
            templateSid: config.contentSid || null,
            status: 'processing',
            errorMessage: null,
            metadata: {
              pickupLocation: reminderDetails.pickupLocation,
              destination: reminderDetails.destination,
              driverName: reminderDetails.driverName,
              driverPhone: reminderDetails.driverPhone,
              vehicleName: reminderDetails.vehicleName,
              vehicleNumber: reminderDetails.vehicleNumber,
              tripAmount: reminderDetails.tripAmount,
              lockToken,
              isDryRun,
            },
            createdAt: notifSnap.exists ? notifSnap.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });
    } catch (txnErr) {
      console.error(`[TripReminders] Transaction lock error on ${notificationId}:`, txnErr);
      failedCount++;
      details.push({ tripId, status: 'lock_error', error: String(txnErr) });
      continue;
    }

    if (!canProceed) {
      skippedCount++;
      details.push({ tripId, status: 'skipped_locked_or_sent' });
      continue;
    }

    // 4. In dry-run mode, simulate without calling external Twilio API
    if (isDryRun) {
      await notifRef.update({
        status: 'submitted',
        twilioMessageSid: `DRY_RUN_SM${Date.now()}`,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      submittedCount++;
      details.push({ tripId, status: 'dry_run_success', messageSid: `DRY_RUN_SM${Date.now()}` });
      continue;
    }

    // 5. Send WhatsApp Message via Twilio
    const sendResult = await sendTwilioTripReminder(config, reminderDetails);

    if (sendResult.success) {
      await notifRef.update({
        status: 'submitted',
        twilioMessageSid: sendResult.messageSid,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        errorMessage: null,
      });
      console.log(`[TripReminders] Successfully sent reminder for Trip ${tripId}. MessageSid: ${sendResult.messageSid}`);
      submittedCount++;
      details.push({ tripId, status: 'submitted', messageSid: sendResult.messageSid });
    } else {
      await notifRef.update({
        status: 'failed',
        errorMessage: sendResult.errorMessage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.error(`[TripReminders] Failed to send reminder for Trip ${tripId}: ${sendResult.errorMessage}`);
      failedCount++;
      details.push({ tripId, status: 'failed', error: sendResult.errorMessage });
    }
  }

  // 6. Handle Trip Date Changes (invalidate stale pending reminders)
  try {
    const staleSnapshot = await db
      .collection('whatsapp_notifications')
      .where('reminderType', '==', REMINDER_TYPE_ADMIN_5DAY)
      .where('status', 'in', ['pending', 'processing'])
      .get();

    for (const notifDoc of staleSnapshot.docs) {
      const data = notifDoc.data();
      if (!data.tripId) continue;
      const tSnap = await db.collection('trips').doc(data.tripId).get();
      if (tSnap.exists) {
        const liveTrip = tSnap.data() || {};
        if (liveTrip.tripDate && liveTrip.tripDate !== data.tripDate) {
          console.log(`[TripReminders] Trip ${data.tripId} date changed from ${data.tripDate} to ${liveTrip.tripDate}. Invalidating old reminder.`);
          await notifDoc.ref.update({
            status: 'missed',
            errorMessage: `Trip date was rescheduled from ${data.tripDate} to ${liveTrip.tripDate}.`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  } catch (staleErr) {
    console.warn('[TripReminders] Error checking stale rescheduled reminders:', staleErr);
  }

  return {
    targetDate,
    totalTripsFound,
    eligibleCount,
    submittedCount,
    skippedCount,
    failedCount,
    details,
  };
}

