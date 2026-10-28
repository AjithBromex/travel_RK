"use client";

import Link from "next/link";
import {
  Car,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  UserCheck,
  Wrench,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Compass,
  PlusCircle,
  Eye,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatINR, formatDate } from "@/lib/utils";
import type { DashboardMetrics, Trip } from "@/types";

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  initialTrips: Trip[];
}

export default function DashboardClient({
  initialMetrics,
  initialTrips,
}: DashboardClientProps) {
  const metrics = initialMetrics;
  const recentTrips = initialTrips;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="RK Travel Hub Trip Management"
          subtitle="Manage Trips, Vehicles, Payments and More..."
        />
        <div className="flex items-center gap-3">
          <Link
            href="/travel/trips"
            prefetch={true}
            className="btn btn-primary shadow-sm hover:shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Trip</span>
          </Link>
          <Link
            href="/travel/payments"
            prefetch={true}
            className="btn btn-secondary shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 */}
        <StatCard
          label="Total Trips"
          value={metrics.totalTrips}
          icon={Car}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="All completed & active trips"
        />
        <StatCard
          label="Total Collection"
          value={formatINR(metrics.totalCollection)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Customer receipts & advances"
        />
        <StatCard
          label="Total Expenses"
          value={formatINR(metrics.totalExpenses)}
          icon={Receipt}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          subtitle="Fuel, maintenance & operations"
        />
        <StatCard
          label="Profit / Loss"
          value={formatINR(metrics.profitLoss)}
          icon={Wallet}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle={metrics.profitLoss >= 0 ? "Net positive margin" : "Net deficit"}
          trend={{
            value: metrics.profitLoss >= 0 ? "Profitable" : "Deficit",
            positive: metrics.profitLoss >= 0,
          }}
        />

        {/* Row 2 */}
        <StatCard
          label="Pending Customer Payment"
          value={formatINR(metrics.pendingCustomerPayment)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle="Outstanding customer receivables"
        />
        <StatCard
          label="Driver Payment Pending"
          value={formatINR(metrics.driverPaymentPending)}
          icon={UserCheck}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          subtitle="Payable to drivers"
        />
        <StatCard
          label="Vehicle Service Due"
          value={metrics.vehicleServiceDue}
          icon={Wrench}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          subtitle="Vehicles requiring maintenance"
        />
        <StatCard
          label="Today Trips"
          value={metrics.todayTrips}
          icon={Calendar}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          subtitle="Scheduled for today"
        />
      </div>

      {/* Executive Fleet Banner with Ambient Light and Glass Depth */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E3A8A] text-white p-7 sm:p-9 lg:p-10 shadow-xl border border-slate-700/60">
        {/* Ambient interior glowing light orbs */}
        <div className="absolute top-0 right-1/3 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold tracking-wide uppercase text-blue-200 mb-4 border border-white/20 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>RK Enterprise — Premium Fleet</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white mb-2">
            Safe Journeys, Stronger Connections
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm font-normal mb-6">
            Comfort <span className="text-slate-500">|</span> Safety <span className="text-slate-500">|</span> Reliability
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/travel/trips"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Schedule Trip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/travel/vehicles"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all backdrop-blur-md border border-white/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Fleet Overview</span>
            </Link>
          </div>
        </div>

        {/* Decorative backdrop elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none flex items-center justify-center">
          <Car className="w-96 h-96 -rotate-12 translate-x-20 text-white" />
        </div>
      </div>

      {/* Recent Trips Section */}
      <div className="card">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Recent Trips</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Latest bookings and active travel dispatches
            </p>
          </div>
          <Link
            href="/travel/trips"
            className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 group"
          >
            <span>View All Trips</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {recentTrips.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No trips recorded yet</p>
            <p className="text-xs mt-1">Click &ldquo;New Trip&rdquo; above to record your first dispatch.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th className="text-right">Total Fare</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-semibold text-primary font-mono text-xs">
                      {trip.tripNumber || trip.id.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatDate(trip.tripDate)}</td>
                    <td>
                      <div className="font-medium text-text-primary">{trip.customerName}</div>
                      {trip.customerPhone && (
                        <div className="text-[11px] text-text-muted">{trip.customerPhone}</div>
                      )}
                    </td>
                    <td>
                      <span className="text-text-primary font-medium">{trip.from}</span>
                      <span className="text-text-muted mx-1.5">→</span>
                      <span className="text-text-primary font-medium">{trip.to}</span>
                    </td>
                    <td className="text-xs text-text-secondary">
                      {trip.vehicleName || "Fleet Vehicle"}
                    </td>
                    <td>
                      <StatusBadge status={trip.status} variant="trip" />
                    </td>
                    <td className="text-right font-medium font-mono-nums">
                      {formatINR(trip.totalFare)}
                    </td>
                    <td className={`text-right font-medium font-mono-nums ${
                      trip.customerBalance > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {trip.customerBalance > 0 ? formatINR(trip.customerBalance) : "Paid"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/travel/trips?id=${trip.id}`}
                        prefetch={true}
                        className="btn btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
