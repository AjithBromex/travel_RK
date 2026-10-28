import { getTrips } from "@/services/trips.service";
import { getVehicles } from "@/services/vehicles.service";
import { getExpenses } from "@/services/expenses.service";
import { getPayments } from "@/services/payments.service";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [trips, vehicles, expenses, payments] = await Promise.all([
    getTrips(150),
    getVehicles(100),
    getExpenses(150),
    getPayments(150),
  ]);

  return (
    <ReportsClient
      trips={trips}
      vehicles={vehicles}
      expenses={expenses}
      payments={payments}
    />
  );
}
