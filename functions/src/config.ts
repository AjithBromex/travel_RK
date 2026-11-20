// Firebase Secret Manager and Configuration for RK Travel Hub Functions
import { defineSecret } from 'firebase-functions/params';

// Firebase Secret Manager definitions for 2nd Generation Functions
export const secretTwilioAccountSid = defineSecret('TWILIO_ACCOUNT_SID');
export const secretTwilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');
export const secretTwilioWhatsappFrom = defineSecret('TWILIO_WHATSAPP_FROM');
export const secretTwilioAdminPhone = defineSecret('TWILIO_ADMIN_PHONE');
export const secretTwilioContentSid = defineSecret('TWILIO_CONTENT_SID');
export const secretTwilioCallbackUrl = defineSecret('TWILIO_STATUS_CALLBACK_URL');

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  adminPhone: string;
  contentSid?: string;
  statusCallbackUrl?: string;
}

/**
 * Safely resolves secret value from Firebase Secret Manager or environment fallback
 */
function resolveSecretValue(secret: { value: () => string }, envKey: string): string {
  try {
    const val = secret.value();
    if (val && val.trim()) return val.trim();
  } catch {
    // Secret not available via Secret Manager runtime; fallback to process.env
  }
  return (process.env[envKey] || '').trim();
}

/**
 * Loads active Twilio credentials with complete sanitization
 */
export function getTwilioConfig(): TwilioConfig {
  return {
    accountSid: resolveSecretValue(secretTwilioAccountSid, 'TWILIO_ACCOUNT_SID'),
    authToken: resolveSecretValue(secretTwilioAuthToken, 'TWILIO_AUTH_TOKEN'),
    whatsappFrom: resolveSecretValue(secretTwilioWhatsappFrom, 'TWILIO_WHATSAPP_FROM'),
    adminPhone: resolveSecretValue(secretTwilioAdminPhone, 'TWILIO_ADMIN_PHONE'),
    contentSid: resolveSecretValue(secretTwilioContentSid, 'TWILIO_CONTENT_SID') || undefined,
    statusCallbackUrl: resolveSecretValue(secretTwilioCallbackUrl, 'TWILIO_STATUS_CALLBACK_URL') || undefined,
  };
}

