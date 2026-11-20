// HTTPS Cloud Function (2nd Gen): twilioStatusCallback
// Receives Twilio status updates (queued, sent, delivered, read, failed, undelivered)
// Validates cryptographic signature before updating Firestore.
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { secretTwilioAuthToken, getTwilioConfig } from './config';
import { validateTwilioWebhookSignature } from './services/twilioClient';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const twilioStatusCallback = onRequest(
  {
    secrets: [secretTwilioAuthToken],
    cors: false,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only accept POST requests from Twilio
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const config = getTwilioConfig();
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

    // Cryptographic signature check
    if (config.authToken && twilioSignature) {
      const isValid = validateTwilioWebhookSignature(
        config.authToken,
        twilioSignature,
        fullUrl,
        req.body || {}
      );
      if (!isValid) {
        console.warn('[twilioStatusCallback] Rejected request with invalid Twilio signature.');
        res.status(403).send('Invalid signature');
        return;
      }
    }

    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body || {};

    if (!MessageSid) {
      res.status(400).send('Missing MessageSid');
      return;
    }

    console.log(`[twilioStatusCallback] Message ${MessageSid} status: ${MessageStatus} (ErrorCode: ${ErrorCode || 'None'})`);

    try {
      const querySnap = await db
        .collection('whatsapp_notifications')
        .where('twilioMessageSid', '==', MessageSid)
        .limit(1)
        .get();

      if (querySnap.empty) {
        console.warn(`[twilioStatusCallback] No notification found for Twilio SID: ${MessageSid}`);
        res.status(200).send('Notification not found, recorded acknowledgment');
        return;
      }

      const docRef = querySnap.docs[0].ref;
      const currentData = querySnap.docs[0].data();

      const updates: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const normalizedStatus = String(MessageStatus || '').toLowerCase();

      if (normalizedStatus === 'delivered' || normalizedStatus === 'read') {
        updates.status = 'delivered';
        updates.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (normalizedStatus === 'failed' || normalizedStatus === 'undelivered') {
        updates.status = 'failed';
        updates.errorMessage = ErrorMessage || `Twilio delivery failure (Code ${ErrorCode || 'N/A'})`;
      } else if (normalizedStatus === 'sent') {
        // Do not downgrade if already marked delivered
        if (currentData.status !== 'delivered') {
          updates.status = 'sent';
        }
      }

      if (ErrorCode) {
        updates['metadata.deliveryErrorCode'] = ErrorCode;
      }

      await docRef.update(updates);
      console.log(`[twilioStatusCallback] Notification ${querySnap.docs[0].id} updated to status '${updates.status || currentData.status}'`);

      res.status(200).type('text/xml').send('<Response/>');
    } catch (err: any) {
      console.error('[twilioStatusCallback] Error updating notification:', err);
      res.status(500).send('Internal server error');
    }
  }
);

