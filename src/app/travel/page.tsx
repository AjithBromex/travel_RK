import { getDashboardData } from "@/services/dashboard.service";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function TravelDashboardPage() {
  const { metrics, recentTrips, reminders } = await getDashboardData();

  return (
    <DashboardClient
      initialMetrics={metrics}
      initialTrips={recentTrips}
      initialReminders={reminders}
    />
  );
}
