import AdminSettingsClient from "./settings-client";
import { listRows } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [users, vehicles, trips, payments, expenses, reminders] = await Promise.all([
    listRows("users"),
    listRows("vehicles"),
    listRows("trips"),
    listRows("payments"),
    listRows("expenses"),
    listRows("reminders"),
  ]);

  return (
    <AdminSettingsClient
      counts={{
        users: users.length,
        vehicles: vehicles.length,
        trips: trips.length,
        payments: payments.length,
        expenses: expenses.length,
        reminders: reminders.length,
      }}
      data={{
        users,
        vehicles,
        trips,
        payments,
        expenses,
        reminders,
      }}
    />
  );
}
