import { getVehicles } from "@/services/vehicles.service";
import VehiclesClient from "./vehicles-client";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const vehicles = await getVehicles(100);

  return <VehiclesClient initialVehicles={vehicles} />;
}
