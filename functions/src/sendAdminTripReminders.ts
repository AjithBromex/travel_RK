// Scheduled Cloud Function (2nd Gen): sendAdminTripReminders
// Schedule: 0 10 * * * (Every day at 10:00 AM IST)
// Timezone: Asia/Kolkata
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  secretTwilioAccountSid,
  secretTwilioAuthToken,
  secretTwilioWhatsappFrom,
  secretTwilioAdminPhone,
  secretTwilioContentSid,
  secretTwilioCallbackUrl,
} from './config';
import { processAdminTripReminders } from './services/reminderProcessor';

export const sendAdminTripReminders = onSchedule(
  {
    schedule: '0 10 * * *',
    timeZone: 'Asia/Kolkata',
    secrets: [
      secretTwilioAccountSid,
      secretTwilioAuthToken,
      secretTwilioWhatsappFrom,
      secretTwilioAdminPhone,
      secretTwilioContentSid,
      secretTwilioCallbackUrl,
    ],
    memory: '256MiB',
    timeoutSeconds: 300,
    retryCount: 0, // Idempotency lock prevents duplicates, avoid infinite scheduler retries
  },
  async (event) => {
    console.log(`[sendAdminTripReminders] Triggered at ${new Date().toISOString()} for Asia/Kolkata.`);
    try {
      const summary = await processAdminTripReminders();
      console.log('[sendAdminTripReminders] Run complete:', JSON.stringify(summary));
    } catch (err: any) {
      console.error('[sendAdminTripReminders] Unhandled error during scheduled execution:', err);
      throw err;
    }
  }
);

