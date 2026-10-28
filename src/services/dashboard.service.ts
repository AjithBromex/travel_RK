import { getTrips } from './trips.service'
import { getVehicles } from './vehicles.service'
import { getPayments } from './payments.service'
import { getExpenses } from './expenses.service'
import type { DashboardMetrics, Trip } from '@/types'

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function getDashboardData(): Promise<{
  metrics: DashboardMetrics
  recentTrips: Trip[]
}> {
  try {
    const [trips, vehicles, payments, expenses] = await Promise.all([
      withTimeout(getTrips(100), 2000, []),
      withTimeout(getVehicles(100), 2000, []),
      withTimeout(getPayments(100), 2000, []),
      withTimeout(getExpenses(100), 2000, []),
    ])

    const todayStr = new Date().toISOString().split('T')[0]
    const todayTrips = trips.filter(t => t.tripDate === todayStr)

    // Total Collection = payments from customers (advance + received)
    const totalCollection = payments
      .filter(p => p.type === 'customer_received')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) +
      trips.reduce((sum, t) => sum + (Number(t.advanceReceived) || 0), 0)

    // Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    // Driver Payments
    const totalDriverPaid = payments
      .filter(p => p.type === 'driver_payment')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Profit / Loss = Collection - Expenses - Driver Payments
    const profitLoss = totalCollection - totalExpenses - totalDriverPaid

    // Pending customer payments
    const pendingCustomerPayment = trips.reduce(
      (sum, t) => sum + (Number(t.customerBalance) > 0 ? Number(t.customerBalance) : 0),
      0
    )

    // Pending driver payments
    const driverPaymentPending = trips.reduce(
      (sum, t) => sum + (Number(t.driverBalance) > 0 ? Number(t.driverBalance) : 0),
      0
    )

    // Vehicles with service due or inactive
    const vehicleServiceDue = vehicles.filter(
      v => v.status === 'service_due' || (v.nextServiceKm && v.currentKm >= v.nextServiceKm)
    ).length

    const metrics: DashboardMetrics = {
      totalTrips: trips.length,
      totalCollection,
      totalExpenses,
      profitLoss,
      pendingCustomerPayment,
      driverPaymentPending,
      vehicleServiceDue,
      todayTrips: todayTrips.length,
    }

    return {
      metrics,
      recentTrips: trips.slice(0, 7),
    }
  } catch (error) {
    console.error('Error calculating dashboard data:', error)
    return {
      metrics: {
        totalTrips: 0,
        totalCollection: 0,
        totalExpenses: 0,
        profitLoss: 0,
        pendingCustomerPayment: 0,
        driverPaymentPending: 0,
        vehicleServiceDue: 0,
        todayTrips: 0,
      },
      recentTrips: [],
    }
  }
}
