import { getTrips } from "@/services/trips.service";
import { getVehicles } from "@/services/vehicles.service";
import TripsClient from "./trips-client";

export const dynamic = "force-dynamic";

export default async function TravelTripsPage() {
  const [trips, vehicles] = await Promise.all([
    getTrips(100),
    getVehicles(100),
  ]);

  return <TripsClient initialTrips={trips} vehicles={vehicles} />;
}
