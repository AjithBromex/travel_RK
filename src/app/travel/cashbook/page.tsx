import { getCashBookEntries } from "@/services/cashbook.service";
import CashBookClient from "./cashbook-client";

export const dynamic = "force-dynamic";

export default async function CashBookPage() {
  const entries = await getCashBookEntries();

  return <CashBookClient initialEntries={entries} />;
}
