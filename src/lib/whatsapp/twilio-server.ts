// Server-side Twilio WhatsApp API & Notification Management Service
// Strictly handles credentials securely server-side without exposing keys to clients

import { createHmac } from 'crypto';
import { getAdminToken } from '@/lib/firebase/server-admin';
import type { WhatsAppNotificationRecord, WhatsAppNotificationStatus } from '@/types';
import {
  formatWhatsAppRecipient,
  buildReminderDetails,
  getReminderDocumentId,
  getKolkataDateParts,
  getTargetTripDateKolkata,
  REMINDER_TYPE_ADMIN_5DAY,
} from './trip-reminder-logic';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  adminPhone: string;
  contentSid?: string;
  statusCallbackUrl?: string;
}

/**
 * Resolves active Twilio configuration from server environment secrets
 */
export function getTwilioConfig(): TwilioConfig {
  let rawFrom = (process.env.TWILIO_WHATSAPP_FROM || '').trim();

  // Safeguard: Twilio trial accounts receive a voice/SMS number (+1 737-250-8034) which CANNOT send WhatsApp messages.
  // The WhatsApp Sandbox strictly requires sending from '+14155238886'.
  // If unset or accidentally set to the SMS trial number, safeguard by routing to the official WhatsApp Sandbox sender.
  if (!rawFrom || rawFrom.includes('7372508034') || rawFrom.includes('737250')) {
    rawFrom = 'whatsapp:+14155238886';
  }

  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
    whatsappFrom: rawFrom,
    adminPhone: (process.env.TWILIO_ADMIN_PHONE || '+919809207080').trim(),
    contentSid: (process.env.TWILIO_CONTENT_SID || '').trim() || undefined,
    statusCallbackUrl: (process.env.TWILIO_STATUS_CALLBACK_URL || '').trim() || undefined,
  };
}

/**
 * Validates Twilio cryptographic signature (X-Twilio-Signature)
 * Formula: Base64(HMAC-SHA1(authToken, fullUrl + sortedKeyValues))
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string> = {}
): boolean {
  if (!authToken || !signature || !url) return false;

  let data = url;
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    data += key + params[key];
  }

  const expected = createHmac('sha1', authToken).update(data).digest('base64');
  return expected === signature;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageSid?: string;
  status?: string;
  errorMessage?: string;
  payloadSent?: Record<string, any>;
}

/**
 * Sends a WhatsApp trip reminder via Twilio REST API
 */
export async function sendWhatsAppViaTwilio(
  config: TwilioConfig,
  reminder: ReturnType<typeof buildReminderDetails>,
  overrideRecipientPhone?: string
): Promise<SendWhatsAppResponse> {
  const { accountSid, authToken, whatsappFrom, adminPhone, contentSid, statusCallbackUrl } = config;

  if (!accountSid || !authToken) {
    return {
      success: false,
      errorMessage: 'Twilio Account SID or Auth Token is missing from server configuration.',
    };
  }

  const rawRecipient = overrideRecipientPhone || adminPhone;
  const to = formatWhatsAppRecipient(rawRecipient);
  const from = formatWhatsAppRecipient(whatsappFrom);

  if (!to) {
    return {
      success: false,
      errorMessage: `Invalid admin recipient WhatsApp number: "${rawRecipient}".`,
    };
  }

  if (!from) {
    return {
      success: false,
      errorMessage: `Invalid Twilio WhatsApp sender number: "${whatsappFrom}".`,
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formParams = new URLSearchParams();
  formParams.append('From', from);
  formParams.append('To', to);

  if (statusCallbackUrl && statusCallbackUrl.startsWith('http')) {
    formParams.append('StatusCallback', statusCallbackUrl);
  }

  // 1. If an approved Content Template SID is provided, use Twilio Content API format
  if (contentSid && contentSid.startsWith('HX')) {
    formParams.append('ContentSid', contentSid);
    formParams.append('ContentVariables', JSON.stringify(reminder.contentVariables));
  } else {
    // 2. Otherwise use the standard formatted text body (for Sandbox and free-form windows)
    formParams.append('Body', reminder.plainTextMessage);
  }

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
      cache: 'no-store',
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.message || json?.error_message || `HTTP ${res.status} ${res.statusText}`;
      return {
        success: false,
        errorMessage: `Twilio Error [${json?.code || res.status}]: ${errMsg}`,
        payloadSent: Object.fromEntries(formParams.entries()),
      };
    }

    return {
      success: true,
      messageSid: json.sid,
      status: json.status,
      payloadSent: Object.fromEntries(formParams.entries()),
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: `Network error connecting to Twilio API: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Helper to encode values for Firestore REST API
 */
function encodeFirestoreField(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeFirestoreField) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = encodeFirestoreField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Decodes Firestore REST document to normal JS object
 */
function decodeFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields as Record<string, any>)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = parseInt(v.integerValue, 10);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('timestampValue' in v) out[k] = v.timestampValue;
    else if ('nullValue' in v) out[k] = null;
    else if ('mapValue' in v) out[k] = decodeFirestoreDoc({ fields: v.mapValue?.fields || {} });
    else out[k] = v;
  }
  if (doc.name) {
    out.id = doc.name.split('/').pop();
  }
  return out;
}

/**
 * Reads all WhatsApp notifications from Firestore with optional filtering
 */
export async function getWhatsAppNotifications(
  filterStatus?: string
): Promise<WhatsAppNotificationRecord[]> {
  try {
    const token = await getAdminToken();
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whatsapp_notifications?pageSize=100`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[WhatsAppServer] Firestore query failed: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const docs = (data.documents || [])
      .map(decodeFirestoreDoc)
      .filter(Boolean) as WhatsAppNotificationRecord[];

    docs.sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0).getTime() -
        new Date(a.createdAt || a.updatedAt || 0).getTime()
    );

    if (filterStatus && filterStatus !== 'all') {
      return docs.filter((d) => d.status === filterStatus);
    }

    return docs;
  } catch (err) {
    console.warn('[WhatsAppServer] Error fetching notifications:', err);
    return [];
  }
}

/**
 * Persists or updates a notification record in Firestore
 */
export async function saveWhatsAppNotification(
  record: Partial<WhatsAppNotificationRecord> & { id: string }
): Promise<boolean> {
  try {
    const token = await getAdminToken();
    const docId = record.id;
    const fields: Record<string, any> = {};
    const fieldMasks: string[] = [];

    for (const [k, v] of Object.entries(record)) {
      if (k !== 'id' && v !== undefined) {
        fields[k] = encodeFirestoreField(v);
        fieldMasks.push(`updateMask.fieldPaths=${encodeURIComponent(k)}`);
      }
    }

    const maskQuery = fieldMasks.length > 0 ? `?${fieldMasks.join('&')}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whatsapp_notifications/${docId}${maskQuery}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
      cache: 'no-store',
    });

    return res.ok;
  } catch (err) {
    console.error('[WhatsAppServer] Error saving notification:', err);
    return false;
  }
}

/**
 * Retries a failed notification with duplicate protection
 */
export async function retryNotification(notificationId: string): Promise<{
  success: boolean;
  message: string;
  status: WhatsAppNotificationStatus;
  messageSid?: string;
}> {
  const token = await getAdminToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whatsapp_notifications/${notificationId}`;

  const fetchRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!fetchRes.ok) {
    return {
      success: false,
      message: `Notification record "${notificationId}" was not found.`,
      status: 'failed',
    };
  }

  const notif = decodeFirestoreDoc(await fetchRes.json()) as WhatsAppNotificationRecord;

  // Duplicate protection: prevent retrying already-delivered or submitted notifications
  if (notif.status === 'delivered') {
    return {
      success: true,
      message: 'This reminder was already delivered successfully.',
      status: 'delivered',
      messageSid: notif.twilioMessageSid || undefined,
    };
  }

  // Acquire processing lock
  await saveWhatsAppNotification({
    id: notificationId,
    status: 'processing',
    updatedAt: new Date().toISOString(),
  });

  // Re-fetch latest trip data
  let tripData: Record<string, any> | null = null;
  if (notif.tripId) {
    try {
      const tripUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trips/${notif.tripId}`;
      const tripRes = await fetch(tripUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (tripRes.ok) {
        tripData = decodeFirestoreDoc(await tripRes.json());
      }
    } catch {}
  }

  const config = getTwilioConfig();
  const reminderDetails = buildReminderDetails(tripData || notif);

  const sendResult = await sendWhatsAppViaTwilio(config, reminderDetails);

  if (sendResult.success) {
    await saveWhatsAppNotification({
      id: notificationId,
      status: 'submitted',
      twilioMessageSid: sendResult.messageSid,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    });

    return {
      success: true,
      message: `Manual retry succeeded! Twilio Message SID: ${sendResult.messageSid}`,
      status: 'submitted',
      messageSid: sendResult.messageSid,
    };
  } else {
    await saveWhatsAppNotification({
      id: notificationId,
      status: 'failed',
      errorMessage: sendResult.errorMessage,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: false,
      message: `Manual retry failed: ${sendResult.errorMessage}`,
      status: 'failed',
    };
  }
}

/**
 * Executes the automated 5-day WhatsApp trip reminders on Next.js / Vercel (Cron)
 */
export async function executeScheduledWhatsAppCron(
  forcedTargetDate?: string,
  isDryRun = false
): Promise<{
  targetDate: string;
  totalTripsFound: number;
  eligibleCount: number;
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
  details: { tripId: string; status: string; messageSid?: string; error?: string }[];
}> {
  const config = getTwilioConfig();
  const todayStr = getKolkataDateParts().dateStr;
  const targetDate = forcedTargetDate || getTargetTripDateKolkata(5);

  console.log(`[WhatsAppCron] Running automated 5-day reminder job. Today (IST): ${todayStr}, Target: ${targetDate}`);

  const token = await getAdminToken();
  const tripsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trips?pageSize=200`;

  const tripsRes = await fetch(tripsUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!tripsRes.ok) {
    throw new Error(`Failed to query trips from Firestore: HTTP ${tripsRes.status}`);
  }

  const tripsJson = await tripsRes.json();
  const allTrips = (tripsJson.documents || []).map(decodeFirestoreDoc).filter(Boolean);

  let eligibleCount = 0;
  let submittedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const details: { tripId: string; status: string; messageSid?: string; error?: string }[] = [];

  const targetTrips = allTrips.filter((t: any) => {
    const tDate = String(t.tripDate || t.startDate || '').trim();
    return tDate === targetDate;
  });

  const totalTripsFound = targetTrips.length;

  for (const trip of targetTrips) {
    const tripId = trip.id;

    // Check soft-delete
    if (trip.isDeleted || trip.deletedAt) {
      skippedCount++;
      details.push({ tripId, status: 'skipped_deleted' });
      continue;
    }

    const status = String(trip.status || 'scheduled').toLowerCase();
    if (status === 'cancelled' || status === 'completed') {
      skippedCount++;
      details.push({ tripId, status: `skipped_${status}` });
      continue;
    }

    if (!trip.isConfirmed) {
      skippedCount++;
      details.push({ tripId, status: 'skipped_unconfirmed' });
      continue;
    }

    eligibleCount++;

    // Fetch vehicle if vehicleId exists
    let vehicleData: Record<string, any> | null = null;
    if (trip.vehicleId) {
      try {
        const vUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/vehicles/${trip.vehicleId}`;
        const vRes = await fetch(vUrl, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (vRes.ok) {
          vehicleData = decodeFirestoreDoc(await vRes.json());
        }
      } catch {}
    }

    const reminderDetails = buildReminderDetails(trip, vehicleData);
    const cleanDate = targetDate.replace(/[^0-9-]/g, '');
    const notificationId = `${tripId}_${REMINDER_TYPE_ADMIN_5DAY}_${cleanDate}`;

    // Check existing notification
    const notifUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whatsapp_notifications/${notificationId}`;
    const checkRes = await fetch(notifUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (checkRes.ok) {
      const existing = decodeFirestoreDoc(await checkRes.json());
      if (['submitted', 'sent', 'delivered', 'missed'].includes(existing?.status)) {
        skippedCount++;
        details.push({ tripId, status: `skipped_already_${existing.status}` });
        continue;
      }

      if (existing?.status === 'processing') {
        const updatedMs = new Date(existing.updatedAt || 0).getTime();
        if (Date.now() - updatedMs < 15 * 60 * 1000) {
          skippedCount++;
          details.push({ tripId, status: 'skipped_currently_processing' });
          continue;
        }
      }
    }

    // Acquire lock
    await saveWhatsAppNotification({
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
      metadata: {
        pickupLocation: reminderDetails.pickupLocation,
        destination: reminderDetails.destination,
        driverName: reminderDetails.driverName,
        driverPhone: reminderDetails.driverPhone,
        vehicleName: reminderDetails.vehicleName,
        vehicleNumber: reminderDetails.vehicleNumber,
        tripAmount: reminderDetails.tripAmount,
        isDryRun,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (isDryRun) {
      await saveWhatsAppNotification({
        id: notificationId,
        status: 'submitted',
        twilioMessageSid: `DRY_RUN_${Date.now()}`,
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      submittedCount++;
      details.push({ tripId, status: 'dry_run_success' });
      continue;
    }

    // Dispatch via Twilio
    const sendRes = await sendWhatsAppViaTwilio(config, reminderDetails);

    if (sendRes.success) {
      await saveWhatsAppNotification({
        id: notificationId,
        status: 'submitted',
        twilioMessageSid: sendRes.messageSid,
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: null,
      });
      submittedCount++;
      details.push({ tripId, status: 'submitted', messageSid: sendRes.messageSid });
    } else {
      await saveWhatsAppNotification({
        id: notificationId,
        status: 'failed',
        errorMessage: sendRes.errorMessage,
        updatedAt: new Date().toISOString(),
      });
      failedCount++;
      details.push({ tripId, status: 'failed', error: sendRes.errorMessage });
    }
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

