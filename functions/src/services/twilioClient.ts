// Twilio WhatsApp API Client for RK Travel Hub Cloud Functions
import twilio from 'twilio';
import type { TwilioConfig } from '../config';

export interface SendReminderResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  errorMessage?: string;
}

export interface ReminderPayload {
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  tripDate: string;
  pickupLocation: string;
  destination: string;
  driverName: string;
  driverPhone: string;
  vehicleName: string;
  vehicleNumber: string;
  tripAmount: string;
  plainTextMessage: string;
  contentVariables: Record<string, string>;
}

/**
 * Normalizes a phone number to Twilio WhatsApp recipient format (whatsapp:+...)
 */
export function formatTwilioWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = String(phone).trim();
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace(/^whatsapp:/, '').trim();
  }
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `whatsapp:+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `whatsapp:+${digits}`;
  }
  if (hasPlus) {
    return `whatsapp:+${digits}`;
  }
  return digits.length >= 10 ? `whatsapp:+${digits}` : '';
}

/**
 * Sends the automated 5-day WhatsApp trip reminder to the configured RK Travel Hub Admin
 */
export async function sendTwilioTripReminder(
  config: TwilioConfig,
  reminder: ReminderPayload,
  overrideRecipientPhone?: string
): Promise<SendReminderResult> {
  const { accountSid, authToken, whatsappFrom, adminPhone, contentSid, statusCallbackUrl } = config;

  if (!accountSid || !authToken) {
    return {
      success: false,
      errorMessage: 'Twilio Account SID or Auth Token is not configured in secrets.',
    };
  }

  const rawRecipient = overrideRecipientPhone || adminPhone;
  const to = formatTwilioWhatsAppPhone(rawRecipient);
  const from = formatTwilioWhatsAppPhone(whatsappFrom);

  if (!to) {
    return {
      success: false,
      errorMessage: `Invalid admin recipient WhatsApp number: "${rawRecipient}". Must be valid international format.`,
    };
  }

  if (!from) {
    return {
      success: false,
      errorMessage: `Invalid Twilio WhatsApp sender number: "${whatsappFrom}". Must be valid international format.`,
    };
  }

  try {
    const client = twilio(accountSid, authToken);

    const messageOpts: any = {
      from,
      to,
    };

    if (statusCallbackUrl && statusCallbackUrl.startsWith('http')) {
      messageOpts.statusCallback = statusCallbackUrl;
    }

    // 1. If an approved Twilio Content Template SID is provided, use Content API
    if (contentSid && contentSid.startsWith('HX')) {
      messageOpts.contentSid = contentSid;
      messageOpts.contentVariables = JSON.stringify(reminder.contentVariables);
    } else {
      // 2. Otherwise fall back to pre-approved Sandbox or free-form text body
      messageOpts.body = reminder.plainTextMessage;
    }

    const message = await client.messages.create(messageOpts);

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown Twilio API error';
    return {
      success: false,
      errorMessage: `Twilio API Error [${err?.code || 'N/A'}]: ${errorMsg}`,
    };
  }
}

/**
 * Validates incoming Twilio Status Callback HTTP POST request signature
 */
export function validateTwilioWebhookSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, any>
): boolean {
  if (!authToken || !twilioSignature || !url) return false;
  try {
    return twilio.validateRequest(authToken, twilioSignature, url, params);
  } catch {
    return false;
  }
}

