import { getExpenses } from "@/services/expenses.service";
import { getTrips } from "@/services/trips.service";
import ExpensesClient from "./expenses-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses | RK Travel Hub",
  description: "Track trip costs, fuel, and operating outlays.",
};

export default async function ExpensesPage() {
  const [expenses, trips] = await Promise.all([
    getExpenses(200),
    getTrips(100),
  ]);

  return <ExpensesClient initialExpenses={expenses} trips={trips} />;
}
