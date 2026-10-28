import { getReminders } from "@/services/reminders.service";
import { getTrips } from "@/services/trips.service";
import { getVehicles } from "@/services/vehicles.service";
import RemindersClient from "./reminders-client";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const [reminders, trips, vehicles] = await Promise.all([
    getReminders(100),
    getTrips(50),
    getVehicles(50),
  ]);

  return (
    <RemindersClient
      initialReminders={reminders}
      trips={trips}
      vehicles={vehicles}
    />
  );
}
