import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import { listRows } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [trips, payments, expenses, cash, reminders, vehicles] = await Promise.all([
    listRows('trips'),
    listRows('payments'),
    listRows('expenses'),
    listRows('cashbook'),
    listRows('reminders'),
    listRows('vehicles'),
  ]);

  return (
    <AdminDashboardClient
      initialData={{
        trips,
        payments,
        expenses,
        cash,
        reminders,
        vehicles,
      }}
    />
  );
}
