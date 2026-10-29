import { getCashBookEntries } from "@/services/cashbook.service";
import { getTrips } from "@/services/trips.service";
import CashBookClient from "./cashbook-client";

export const dynamic = "force-dynamic";

export default async function CashBookPage() {
  const [entries, trips] = await Promise.all([
    getCashBookEntries(),
    getTrips(100),
  ]);

  return <CashBookClient initialEntries={entries} trips={trips} />;
}
