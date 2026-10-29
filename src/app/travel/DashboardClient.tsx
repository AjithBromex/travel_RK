"use client";

import Link from "next/link";
import {
  Car,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  Wrench,
  Plus,
  ArrowUpRight,
  ChevronRight,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Bell,
  ArrowRight,
} from "lucide-react";
import { formatINR, formatDateShort } from "@/lib/utils";
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
  const trips = initialTrips || [];

  return (
    <div className="space-y-6 pb-8">
      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>OPERATIONS OVERVIEW</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Welcome back, RK Travel Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Fleet operations, active trips, and financial performance at a glance.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/travel/payments"
            prefetch={true}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Payment</span>
          </Link>
          <Link
            href="/travel/trips"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </Link>
        </div>
      </div>

      {/* ─── KEY METRICS OVERVIEW (6 FOCUSED CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Trips */}
        <Link
          href="/travel/trips"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.totalTrips || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Booked Trips</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {metrics.todayTrips || 0} today
            </span>
          </div>
        </Link>

        {/* 2. Total Collection */}
        <Link
          href="/travel/payments"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Collection
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(metrics.totalCollection || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Receipts & Adv.</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Received
            </span>
          </div>
        </Link>

        {/* 3. Total Expenses */}
        <Link
          href="/travel/cashbook"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(metrics.totalExpenses || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Fuel & Ops</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              Operating
            </span>
          </div>
        </Link>

        {/* 4. Net Profit */}
        <Link
          href="/travel/reports"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Net Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono-nums tracking-tight ${
                (metrics.profitLoss || 0) >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              {formatINR(metrics.profitLoss || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Net Margin</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                (metrics.profitLoss || 0) >= 0
                  ? "bg-blue-50 text-blue-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {(metrics.profitLoss || 0) >= 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3" />
                  Positive
                </>
              ) : (
                "Negative"
              )}
            </span>
          </div>
        </Link>

        {/* 5. Pending Customer Payment */}
        <Link
          href="/travel/payments"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Customer Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(metrics.pendingCustomerPayment || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Receivables</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Pending
            </span>
          </div>
        </Link>

        {/* 6. Vehicle Service Due */}
        <Link
          href="/travel/vehicles"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Service Due
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                (metrics.vehicleServiceDue || 0) > 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.vehicleServiceDue || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Vehicles</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (metrics.vehicleServiceDue || 0) > 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {(metrics.vehicleServiceDue || 0) > 0 ? "Action Needed" : "All Clear"}
            </span>
          </div>
        </Link>
      </div>

      {/* ─── MAIN CONTENT SECTION (2 BALANCED COLUMNS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ════ LEFT COLUMN (8 cols): RECENT TRIPS TABLE / FEED ════ */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Trips
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest scheduled and active dispatches from your fleet
                </p>
              </div>
              <Link
                href="/travel/trips"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>View All Trips</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Trips List / Empty State */}
            {trips.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No trips recorded yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Create your first trip booking to track customer fare, vehicle dispatch, and driver settlements.
                </p>
                <Link
                  href="/travel/trips"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Trip</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {trips.map((trip) => {
                  const hasDue = Number(trip.customerBalance) > 0;
                  const statusColors: Record<string, string> = {
                    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                    in_progress: "bg-blue-50 text-blue-700 border-blue-200/60",
                    scheduled: "bg-amber-50 text-amber-700 border-amber-200/60",
                    cancelled: "bg-slate-100 text-slate-600 border-slate-200/60",
                  };
                  const statusLabel: Record<string, string> = {
                    completed: "Completed",
                    in_progress: "In Progress",
                    scheduled: "Scheduled",
                    cancelled: "Cancelled",
                  };

                  return (
                    <div
                      key={trip.id}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Left: Code, Route, Customer */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold font-mono text-slate-900">
                              #{trip.tripNumber || trip.id.slice(0, 7)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                statusColors[trip.status] || statusColors.scheduled
                              }`}
                            >
                              {statusLabel[trip.status] || trip.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateShort(trip.tripDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{trip.from || "Start"}</span>
                            <span className="text-slate-400">→</span>
                            <span className="truncate">{trip.to || "Destination"}</span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{trip.customerName || "Customer"}</span>
                            {trip.vehicleName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">{trip.vehicleName}</span>
                              </>
                            )}
                            {trip.driverName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">Driver: {trip.driverName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare, Due & Quick link */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-bold text-slate-900 font-mono-nums">
                            {formatINR(trip.totalFare || 0)}
                          </div>
                          <div className="mt-0.5">
                            {hasDue ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                                Due {formatINR(trip.customerBalance)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                                Paid Full
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          href="/travel/trips"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                          title="View in Trips"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN (4 cols): FINANCIAL & SHORTCUTS ════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Outstanding Balances Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Outstanding Balances
            </h2>

            <div className="space-y-3">
              {/* Customer Pending */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-amber-800">
                    Customer Receivables
                  </p>
                  <p className="text-base font-extrabold text-amber-950 font-mono-nums mt-0.5">
                    {formatINR(metrics.pendingCustomerPayment || 0)}
                  </p>
                </div>
                <Link
                  href="/travel/payments"
                  className="text-xs font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200/70 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Collect
                </Link>
              </div>

              {/* Driver Pending */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Driver Payables Due
                  </p>
                  <p className="text-base font-extrabold text-slate-900 font-mono-nums mt-0.5">
                    {formatINR(metrics.driverPaymentPending || 0)}
                  </p>
                </div>
                <Link
                  href="/travel/payments"
                  className="text-xs font-semibold text-slate-700 bg-slate-200/70 hover:bg-slate-300/70 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Pay
                </Link>
              </div>
            </div>

            {/* Fleet Status Note */}
            <div className="pt-2 border-t border-slate-100">
              {(metrics.vehicleServiceDue || 0) > 0 ? (
                <div className="flex items-start gap-2.5 text-xs text-rose-700 bg-rose-50/80 p-3 rounded-xl border border-rose-200/60">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Maintenance Attention</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">
                      {metrics.vehicleServiceDue} vehicle(s) require scheduled service or fitness inspection.
                    </p>
                    <Link
                      href="/travel/vehicles"
                      className="text-[11px] font-bold text-rose-800 underline mt-1 inline-block"
                    >
                      View fleet status →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/50">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium text-[11px]">
                    All vehicles up to date on maintenance
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Quick Shortcuts
            </h2>

            <div className="space-y-1.5">
              <Link
                href="/travel/vehicles"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      Vehicles &amp; Fleet
                    </p>
                    <p className="text-[11px] text-slate-400">Track mileage and fitness</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>

              <Link
                href="/travel/cashbook"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                      Cash Book
                    </p>
                    <p className="text-[11px] text-slate-400">Daily expenses &amp; income</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>

              <Link
                href="/travel/reports"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      Reports &amp; Analytics
                    </p>
                    <p className="text-[11px] text-slate-400">Profit &amp; revenue analysis</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>

              <Link
                href="/travel/reminders"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">
                      Document Reminders
                    </p>
                    <p className="text-[11px] text-slate-400">Insurance &amp; permit expiries</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CLEAN FOOTER ─── */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© RK Travel Hub • Fleet &amp; Trip Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
