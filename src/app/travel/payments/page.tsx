import { getPayments } from "@/services/payments.service";
import { getTrips } from "@/services/trips.service";
import PaymentsClient from "./payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, trips] = await Promise.all([
    getPayments(100),
    getTrips(100),
  ]);

  return <PaymentsClient initialPayments={payments} trips={trips} />;
}
