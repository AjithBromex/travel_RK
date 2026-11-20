import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/lib/admin/auth-check';
import { getWhatsAppNotifications } from '@/lib/whatsapp/twilio-server';
import WhatsAppRemindersClient from './whatsapp-reminders-client';

export const dynamic = 'force-dynamic';

export default async function WhatsAppRemindersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('rk_admin')?.value;

  // Strict administrative role verification
  if (!verifyAdminSessionToken(token)) {
    redirect('/admin/login');
  }

  const initialNotifications = await getWhatsAppNotifications('all').catch(() => []);

  return <WhatsAppRemindersClient initialNotifications={initialNotifications} />;
}

