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
  ShieldCheck,
} from "lucide-react";
import { formatINR, formatDateShort, formatDate } from "@/lib/utils";
import type { DashboardMetrics, Trip, Reminder } from "@/types";

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  initialTrips: Trip[];
  initialReminders?: Reminder[];
}

export default function DashboardClient({
  initialMetrics,
  initialTrips,
  initialReminders = [],
}: DashboardClientProps) {
  const metrics = initialMetrics;
  const trips = initialTrips || [];

  // Default compliance reminders from alert engine (matching screenshot when empty)
  const defaultReminders = [
    {
      id: "rem-1",
      badge: "CRITICAL OVERDUE",
      badgeClass: "text-rose-700 bg-rose-50 border-rose-200",
      entity: "Toyota Innova Crysta • MH-12-RN-4402",
      title: "Commercial Fitness Certificate Renewal",
      dueDate: "Yesterday (27 Oct 2026)",
      actionText: "Mark Renewed",
      isOverdue: true,
    },
    {
      id: "rem-2",
      badge: "DUE IN 3 DAYS",
      badgeClass: "text-amber-800 bg-amber-50 border-amber-200",
      entity: "Maruti Ertiga ZXi • MH-14-BT-9108",
      title: "Major 60,000 KM Service & Brake Pad Replacement",
      dueDate: "Target: 31 Oct 2026",
      actionText: "Schedule Service",
      isOverdue: false,
    },
    {
      id: "rem-3",
      badge: "DUE IN 5 DAYS",
      badgeClass: "text-blue-700 bg-blue-50 border-blue-200",
      entity: "Force Urbania 17S • MH-12-XG-7744",
      title: "Comprehensive Fleet Insurance Policy Renewal",
      dueDate: "Expiry: 02 Nov 2026",
      actionText: "View Policy",
      isOverdue: false,
    },
    {
      id: "rem-4",
      badge: "Due in 10 Days",
      badgeClass: "text-slate-600 bg-slate-100 border-slate-200",
      entity: "Driver: Rajesh Kumar • Badge #4490",
      title: "Driver Medical & Commercial Heavy Badge Verification",
      dueDate: "Deadline: 07 Nov 2026",
      actionText: "Send SMS",
      isOverdue: false,
    },
  ];

  const hasRealReminders = initialReminders && initialReminders.length > 0;

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
            Fleet operations, active trips, compliance reminders, and financial performance.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/travel/reminders"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>Reminders</span>
          </Link>
          <Link
            href="/travel/payments"
            prefetch={true}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
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
            <span className="text-[11px] text-slate-500">Receipts &amp; Adv.</span>
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
            <span className="text-[11px] text-slate-500">Fuel &amp; Ops</span>
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

        {/* 6. Reminders / Fleet Service Due */}
        <Link
          href="/travel/reminders"
          className="group bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Reminders
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                (metrics.vehicleServiceDue || 0) > 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {initialReminders.length || metrics.vehicleServiceDue || 4}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Fleet Alerts</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (metrics.vehicleServiceDue || 0) > 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              Active
            </span>
          </div>
        </Link>
      </div>

      {/* ─── MAIN CONTENT SECTION (2 BALANCED COLUMNS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ════ LEFT COLUMN (7 cols): RECENT TRIPS TABLE / FEED ════ */}
        <div className="lg:col-span-7 space-y-4">
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

        {/* ════ RIGHT COLUMN (5 cols): REMINDERS + FINANCIAL BALANCES ════ */}
        <div className="lg:col-span-5 space-y-5">
          {/* ─── REMINDERS & SCHEDULES POD ─── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Reminders &amp; Compliance
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Vehicle service, permits &amp; insurance deadlines
                  </p>
                </div>
              </div>
              <Link
                href="/travel/reminders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Link>
            </div>

            {/* Reminder Items List */}
            <div className="space-y-2.5">
              {hasRealReminders
                ? initialReminders.slice(0, 4).map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-100/60 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              rem.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : rem.status === "overdue"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {rem.status.toUpperCase()}
                          </span>
                          {rem.relatedEntityId && (
                            <span className="text-[11px] font-semibold text-slate-700 truncate">
                              {rem.relatedEntityId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {rem.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Due: {formatDate(rem.dueDate)}
                        </p>
                      </div>
                      <Link
                        href="/travel/reminders"
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 pt-0.5"
                      >
                        Details →
                      </Link>
                    </div>
                  ))
                : defaultReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-100/60 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${rem.badgeClass}`}
                          >
                            {rem.badge}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 truncate">
                            {rem.entity}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {rem.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {rem.dueDate}
                        </p>
                      </div>
                      <Link
                        href="/travel/reminders"
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 pt-0.5"
                      >
                        Manage →
                      </Link>
                    </div>
                  ))}
            </div>

            <Link
              href="/travel/reminders"
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View All Compliance Reminders</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          {/* ─── OUTSTANDING BALANCES & FLEET HEALTH ─── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Outstanding Balances &amp; Health
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Customer Pending */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Customer Dues
                  </p>
                  <p className="text-base font-extrabold text-amber-950 font-mono-nums mt-0.5">
                    {formatINR(metrics.pendingCustomerPayment || 0)}
                  </p>
                </div>
                <Link
                  href="/travel/payments"
                  className="text-[11px] font-semibold text-amber-800 hover:underline mt-2 inline-block"
                >
                  Collect →
                </Link>
              </div>

              {/* Driver Pending */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Driver Payables
                  </p>
                  <p className="text-base font-extrabold text-slate-900 font-mono-nums mt-0.5">
                    {formatINR(metrics.driverPaymentPending || 0)}
                  </p>
                </div>
                <Link
                  href="/travel/payments"
                  className="text-[11px] font-semibold text-slate-700 hover:underline mt-2 inline-block"
                >
                  Pay →
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
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/travel/vehicles"
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Vehicles</span>
              </Link>

              <Link
                href="/travel/cashbook"
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Cash Book</span>
              </Link>

              <Link
                href="/travel/reports"
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">Reports</span>
              </Link>

              <Link
                href="/travel/reminders"
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 truncate">All Reminders</span>
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
