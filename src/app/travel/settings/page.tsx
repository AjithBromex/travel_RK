import { getTrips } from "@/services/trips.service";
import { getVehicles } from "@/services/vehicles.service";
import { getPayments } from "@/services/payments.service";
import { getExpenses } from "@/services/expenses.service";
import { getReminders } from "@/services/reminders.service";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [trips, vehicles, payments, expenses, reminders] = await Promise.all([
    getTrips(200),
    getVehicles(100),
    getPayments(200),
    getExpenses(200),
    getReminders(100),
  ]);

  return (
    <SettingsClient
      trips={trips}
      vehicles={vehicles}
      payments={payments}
      expenses={expenses}
      reminders={reminders}
    />
  );
}
