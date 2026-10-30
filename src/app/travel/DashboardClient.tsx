"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Bus,
  Car,
  Fuel,
  BarChart3,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  Plus,
  ArrowUpRight,
  ChevronRight,
  MapPin,
  AlertTriangle,
  CheckCircle2,
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
  const reminders = initialReminders || [];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC PANORAMIC OPERATIONS HUB HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-[28px] overflow-hidden shadow-xl min-h-[200px] sm:min-h-[220px] lg:min-h-[235px] flex items-center bg-slate-950">
        {/* Background Scenic Road with Lake and Alpine Mountains */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/dashboard-hero.jpg"
            alt="Scenic Travel Highway"
            fill
            priority
            className="object-cover object-[center_35%]"
          />
          {/* Directional gradient overlay to ensure high contrast and text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20 lg:to-transparent" />
        </div>

        {/* Cursive Art Overlay on Large Screens: "Journey Beyond Borders" */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 select-none pointer-events-none opacity-85 text-right pr-4">
          <p className="font-serif italic text-3xl xl:text-4xl text-white/95 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] tracking-wide">
            Journey
          </p>
          <p className="font-serif italic text-2xl xl:text-3xl text-white/90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] font-light pl-6 -mt-1">
            Beyond Borders
          </p>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between h-full gap-4">
          {/* Top Quick Actions Floating Bar */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap w-full order-last sm:order-first">
            <Link
              href="/travel/reminders"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/60 shadow-md font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Reminders</span>
              {reminders.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                  {reminders.length}
                </span>
              )}
            </Link>

            <Link
              href="/travel/payments"
              prefetch={true}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/60 shadow-md font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-600" />
              <span>Record Payment</span>
            </Link>

            <Link
              href="/travel/trips"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-lg shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.75]" />
              <span>New Trip</span>
            </Link>
          </div>

          {/* Operations Hub Welcome Text */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-300 uppercase mb-1.5 drop-shadow">
              <span>OPERATIONS HUB</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              Welcome back, <br className="hidden sm:inline" />
              <span className="text-white">RK Travel </span>
              <span className="text-[#60A5FA]">Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow">
              Fleet operations, active trips, compliance alerts, and financial daybook.
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 EXECUTIVE METRIC CARDS (Spacious Single Row)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL TRIPS */}
        <Link
          href="/travel/trips"
          className="group bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between relative overflow-hidden min-h-[145px]"
        >
          {/* Subtle Wave Decoration Background */}
          <div className="absolute right-0 bottom-0 w-36 h-14 pointer-events-none opacity-40">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-blue-400 stroke-2">
              <path d="M0 30 Q 25 15, 50 25 T 100 10" />
            </svg>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    TOTAL TRIPS
                  </span>
                  <span className="text-2xl sm:text-[30px] font-extrabold text-slate-900 font-mono tracking-tight leading-tight block mt-0.5">
                    {metrics.totalTrips || 0}
                  </span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-blue-50/70 text-blue-500 flex items-center justify-center shrink-0">
                <Car className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100 relative z-10">
            <span className="text-[11px] text-slate-500 font-medium">Booked Trips</span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50/90 px-3 py-0.5 rounded-full border border-blue-100">
              {metrics.todayTrips || 0} today
            </span>
          </div>
        </Link>

        {/* CARD 2: COLLECTION */}
        <Link
          href="/travel/payments"
          className="group bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between relative overflow-hidden min-h-[145px]"
        >
          {/* Subtle Wave Decoration Background */}
          <div className="absolute right-0 bottom-0 w-36 h-14 pointer-events-none opacity-40">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-emerald-400 stroke-2">
              <path d="M0 35 Q 25 20, 50 30 T 100 12" />
            </svg>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60 font-black text-xl">
                  ₹
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    COLLECTION
                  </span>
                  <span className="text-2xl sm:text-[30px] font-extrabold text-slate-900 font-mono tracking-tight leading-tight block mt-0.5">
                    {formatINR(metrics.totalCollection || 0)}
                  </span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-emerald-50/70 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100 relative z-10">
            <span className="text-[11px] text-slate-500 font-medium">Receipts &amp; Adv.</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50/90 px-3 py-0.5 rounded-full border border-emerald-100">
              Received
            </span>
          </div>
        </Link>

        {/* CARD 3: EXPENSES */}
        <Link
          href="/travel/expenses"
          className="group bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between relative overflow-hidden min-h-[145px]"
        >
          {/* Subtle Wave Decoration Background */}
          <div className="absolute right-0 bottom-0 w-36 h-14 pointer-events-none opacity-40">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-amber-400 stroke-2">
              <path d="M0 32 Q 30 18, 60 28 T 100 8" />
            </svg>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    EXPENSES
                  </span>
                  <span className="text-2xl sm:text-[30px] font-extrabold text-slate-900 font-mono tracking-tight leading-tight block mt-0.5">
                    {formatINR(metrics.totalExpenses || 0)}
                  </span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-amber-50/70 text-amber-600 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100 relative z-10">
            <span className="text-[11px] text-slate-500 font-medium">Fuel &amp; Outlays</span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50/90 px-3 py-0.5 rounded-full border border-amber-100">
              Operating
            </span>
          </div>
        </Link>

        {/* CARD 4: NET PROFIT */}
        <Link
          href="/travel/reports"
          className="group bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between relative overflow-hidden min-h-[145px]"
        >
          {/* Subtle Wave Decoration Background */}
          <div className="absolute right-0 bottom-0 w-36 h-14 pointer-events-none opacity-40">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none stroke-indigo-400 stroke-2">
              <path d="M0 28 Q 30 12, 60 22 T 100 6" />
            </svg>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    NET PROFIT
                  </span>
                  <span
                    className={`text-2xl sm:text-[30px] font-extrabold font-mono tracking-tight leading-tight block mt-0.5 ${
                      (metrics.profitLoss || 0) >= 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {formatINR(metrics.profitLoss || 0)}
                  </span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-indigo-50/70 text-indigo-600 flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100 relative z-10">
            <span className="text-[11px] text-slate-500 font-medium">Net Surplus</span>
            <span
              className={`text-[11px] font-bold px-3 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                (metrics.profitLoss || 0) >= 0
                  ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                  : "bg-rose-50 text-rose-700 border-rose-100"
              }`}
            >
              {(metrics.profitLoss || 0) >= 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                  <span>Positive</span>
                </>
              ) : (
                "Deficit"
              )}
            </span>
          </div>
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN OPERATIONAL HUB: 3-COLUMN BALANCED LAYOUT
             Column 1 (6 cols on lg): Recent Trips
             Column 2 (3 cols on lg): Reminders
             Column 3 (3 cols on lg): Balances & Health
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* ════ COLUMN 1 (6 cols on lg): RECENT TRIPS & DISPATCH ════ */}
        <div className="md:col-span-12 lg:col-span-6 space-y-4">
          <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col justify-between min-h-[380px]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Recent Trips
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Latest client bookings and route dispatches
                  </p>
                </div>
              </div>
              <Link
                href="/travel/trips"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-all"
              >
                <span>View All Trips</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>

            {/* Empty State / Populated Trips */}
            {trips.length === 0 ? (
              <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center my-auto">
                <div className="relative w-44 h-24 mb-3">
                  <Image
                    src="/images/dashboard-empty-trips-hd.png"
                    alt="No trips recorded yet"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  No trips recorded yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">
                  Create your first trip booking to track customer fare, vehicle dispatch, and driver settlements.
                </p>
                <Link
                  href="/travel/trips"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                  <span>Create First Trip</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {trips.slice(0, 5).map((trip) => {
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
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Left: Code, Route, Customer */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
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

                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{trip.from || "Start"}</span>
                            <span className="text-slate-400">→</span>
                            <span className="truncate">{trip.to || "Destination"}</span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{trip.customerName || "Customer"}</span>
                            {trip.vehicleName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 font-medium">
                                  {trip.vehicleName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare & Due */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-bold text-slate-900 font-mono">
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

        {/* ════ COLUMN 2 (3 cols on lg): REMINDERS & COMPLIANCE ════ */}
        <div className="md:col-span-6 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4 flex flex-col justify-between min-h-[380px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-4 h-4 fill-amber-500/10" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Reminders
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Vehicle &amp; compliance
                    </p>
                  </div>
                </div>
                <Link
                  href="/travel/reminders"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </Link>
              </div>

              {/* Items List / Empty State */}
              <div className="pt-3">
                {reminders.length === 0 ? (
                  <div className="py-6 px-3 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <div className="relative w-16 h-12 mb-2">
                      <Image
                        src="/images/dashboard-empty-reminders-hd.png"
                        alt="Compliances Up to Date"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Compliances Up to Date
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      No active maintenance or license alerts.
                    </p>
                    <Link
                      href="/travel/reminders"
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>Schedule</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {reminders.slice(0, 4).map((rem) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const isOverdue =
                        rem.status === "overdue" ||
                        (rem.status === "pending" && rem.dueDate < todayStr);

                      return (
                        <div
                          key={rem.id}
                          className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mb-1 ${
                                rem.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isOverdue
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {rem.status === "completed"
                                ? "COMPLETED"
                                : isOverdue
                                ? "OVERDUE"
                                : "UPCOMING"}
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {rem.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Due: {formatDate(rem.dueDate)}
                            </p>
                          </div>
                          <Link
                            href="/travel/reminders"
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 pt-1"
                          >
                            Manage →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Link */}
            <Link
              href="/travel/reminders"
              className="w-full mt-3 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-xs font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors"
            >
              <span>View All Reminders</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* ════ COLUMN 3 (3 cols on lg): OUTSTANDING BALANCES & HEALTH ════ */}
        <div className="md:col-span-6 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4 flex flex-col justify-between min-h-[380px]">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Balances &amp; Health
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Receivables &amp; Fleet Status
                  </p>
                </div>
              </div>

              {/* Sub-cards */}
              <div className="space-y-3 pt-3">
                {/* Customer Dues */}
                <div className="p-3.5 rounded-2xl bg-[#FFF9EE] border border-amber-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      CUSTOMER DUES
                    </p>
                    <p className="text-xl font-black text-amber-950 font-mono mt-0.5">
                      {formatINR(metrics.pendingCustomerPayment || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="text-xs font-bold text-amber-900 hover:bg-amber-200/80 px-3 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 transition-colors"
                  >
                    Collect →
                  </Link>
                </div>

                {/* Driver Payables */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      DRIVER PAYABLES
                    </p>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatINR(metrics.driverPaymentPending || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="text-xs font-bold text-slate-800 hover:bg-slate-300 px-3 py-1.5 rounded-full bg-slate-200/80 border border-slate-300/60 transition-colors"
                  >
                    Pay →
                  </Link>
                </div>

                {/* Fleet Health Alert Banner */}
                <div className="pt-0.5">
                  {(metrics.vehicleServiceDue || 0) > 0 ? (
                    <div className="flex items-start gap-2.5 text-xs text-rose-700 bg-rose-50/80 p-3 rounded-2xl border border-rose-200/70">
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
                    <div className="flex items-center gap-2.5 text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-[11px]">
                        All vehicles up to date on maintenance
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Link */}
            <Link
              href="/travel/payments"
              className="w-full mt-3 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-xs font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors"
            >
              <span>Manage Cash &amp; Ledger</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CLEAN EXECUTIVE FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© RK Travel Hub • Fleet &amp; Trip Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-600">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
