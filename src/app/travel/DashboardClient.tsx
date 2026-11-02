"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { formatINR, formatDateShort, formatDate } from "@/lib/utils";
import type { DashboardMetrics, Trip, Reminder } from "@/types";
import { getDashboardData } from "@/services/dashboard.service";
import { subscribeDataChanged } from "@/lib/storage-sync";

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
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [trips, setTrips] = useState<Trip[]>(initialTrips || []);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders || []);

  useEffect(() => {
    const refreshDashboard = () => {
      getDashboardData()
        .then((data) => {
          if (data && data.metrics) {
            setMetrics(data.metrics);
            if (data.recentTrips) setTrips(data.recentTrips);
            if (data.reminders) setReminders(data.reminders);
          }
        })
        .catch((err) => {
          console.warn("[Dashboard] Client data hydration error:", err);
        });
    };

    refreshDashboard();

    const unsubscribe = subscribeDataChanged(() => {
      refreshDashboard();
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-10">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER
             Mobile: Features top glass badges (OPERATIONS HUB + 3 Reminders),
             centered welcome title, and dedicated action button bar
             ([+ New Trip] and [Record Payment]).
             Desktop: Preserves clean horizontal layout with right-aligned CTAs.
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[340px] sm:min-h-[320px] lg:min-h-[350px] flex flex-col justify-between p-4 sm:p-7 lg:p-9 pb-4 sm:pb-28 lg:pb-32 bg-slate-900"
      >
        {/* Photographic Panoramic Highway Background with Van & Alpine Lake */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/dashboard-scenic-hero.jpg"
            alt="Scenic Travel Highway with Passenger Van"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 1500px"
            className="object-cover object-[70%_62%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20 sm:bg-gradient-to-r sm:from-slate-950/80 sm:via-slate-950/35 sm:to-transparent pointer-events-none" />
        </div>

        {/* Top Badges / Floating Actions */}
        <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap w-full">
          {/* Mobile Operations Hub Pill */}
          <div className="inline-flex sm:hidden items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
            <div className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase">OPERATIONS HUB</span>
          </div>

          {/* Reminders Badge */}
          <Link
            href="/travel/reminders"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-2 rounded-full bg-[#F59E0B] text-slate-950 hover:bg-amber-400 font-extrabold text-[11px] sm:text-xs shadow-md transition-all active:scale-95"
          >
            <Bell className="w-3 h-3 fill-slate-950" />
            <span>{reminders.length || 0} Reminders</span>
          </Link>

          {/* Desktop-only Action Buttons (Preserved) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/travel/payments"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-600" />
              <span>Record Payment</span>
            </Link>

            <Link
              href="/travel/trips"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0284C7] hover:bg-[#0369a1] text-white font-bold text-xs shadow-md shadow-sky-600/35 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
              <span>New Trip</span>
            </Link>
          </div>
        </div>

        {/* Hero Title & Mobile Bottom Action Bar */}
        <div className="relative z-10 w-full mt-10 sm:mt-0">
          <div className="hidden sm:flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-slate-900/80 backdrop-blur-md border border-white/20 p-0.5 relative shrink-0 shadow-sm">
              <Image
                src="/images/rk-logo.png"
                alt="RK Travel Hub"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
              OPERATIONS HUB
            </p>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black tracking-tight text-white leading-tight drop-shadow-md">
            Welcome back, <br />
            <span>RK Travel </span>
            <span className="text-[#38BDF8]">Hub</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1 max-w-md drop-shadow">
            Fleet operations, active trips &amp; financial daybook.
          </p>

          {/* MOBILE ACTION BUTTONS BAR (Directly from reference screenshot: [New Trip] solid blue, [Record Payment] white outline) */}
          <div className="flex sm:hidden items-center gap-2.5 mt-5 pt-3 border-t border-white/15">
            <Link
              href="/travel/trips"
              prefetch={true}
              className="flex-1 py-2.5 px-3 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-950/40 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Trip</span>
            </Link>
            <Link
              href="/travel/payments"
              prefetch={true}
              className="flex-1 py-2.5 px-3 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-600" />
              <span>Record Payment</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE KEY METRICS (2x2 Grid on Mobile, 4-col on Desktop)
             Matches reference image with colored bottom accent bars:
             - Total Trips: Cyan / Blue bar
             - Collection: Emerald bar
             - Expenses: Amber bar
             - Net Profit: Purple / Indigo bar
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-5 sm:mt-0">
        {/* Mobile Section Header */}
        <div className="flex items-center justify-between px-1 mb-2.5 sm:hidden">
          <span className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
            LIVE KEY METRICS
          </span>
          <span className="text-[10px] font-bold text-[#0284C7]">
            Updated now
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="relative z-20 px-0 sm:px-2 sm:-mt-10 lg:-mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
        >
          {/* CARD 1: TOTAL TRIPS */}
          <Link
            href="/travel/trips"
            className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[12px] bg-[#EAF2FD] text-[#0284C7] flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[9.5px] sm:text-[10px] font-black text-[#0284C7] bg-[#EEF5FE] px-2 sm:px-2.5 py-0.5 rounded-full border border-blue-100">
                {metrics.todayTrips || 0} today
              </span>
            </div>

            <div className="mt-2.5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
                TOTAL TRIPS
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {metrics.totalTrips || 0}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5">
                Booked Trips
              </span>
            </div>

            {/* Bottom Color Indicator Bar */}
            <div className="w-10 sm:w-12 h-1 rounded-full bg-[#0284C7] mt-3" />
          </Link>

          {/* CARD 2: COLLECTION */}
          <Link
            href="/travel/payments"
            className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[12px] bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0 font-black text-base sm:text-lg">
                ₹
              </div>
              <span className="text-[9.5px] sm:text-[10px] font-black text-[#10B981] bg-[#E6F8EF] px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-100">
                Received
              </span>
            </div>

            <div className="mt-2.5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
                COLLECTION
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block truncate">
                {formatINR(metrics.totalCollection || 0)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5">
                Receipts &amp; Adv.
              </span>
            </div>

            {/* Bottom Color Indicator Bar */}
            <div className="w-10 sm:w-12 h-1 rounded-full bg-[#10B981] mt-3" />
          </Link>

          {/* CARD 3: EXPENSES */}
          <Link
            href="/travel/expenses"
            className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[12px] bg-[#FEF5E7] text-[#F59E0B] flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[9.5px] sm:text-[10px] font-black text-[#D97706] bg-[#FEF3D6] px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-200">
                Operating
              </span>
            </div>

            <div className="mt-2.5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
                EXPENSES
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block truncate">
                {formatINR(metrics.totalExpenses || 0)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5">
                Fuel &amp; Outlays
              </span>
            </div>

            {/* Bottom Color Indicator Bar */}
            <div className="w-10 sm:w-12 h-1 rounded-full bg-[#F59E0B] mt-3" />
          </Link>

          {/* CARD 4: NET PROFIT */}
          <Link
            href="/travel/reports"
            className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[12px] bg-[#EEF0FE] text-[#6366F1] flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span
                className={`text-[9.5px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full border ${
                  (metrics.profitLoss || 0) >= 0
                    ? "bg-[#EAEBFE] text-[#4F46E5] border-indigo-100"
                    : "bg-rose-50 text-rose-700 border-rose-100"
                }`}
              >
                {(metrics.profitLoss || 0) >= 0 ? "Positive" : "Deficit"}
              </span>
            </div>

            <div className="mt-2.5">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
                NET PROFIT
              </span>
              <span
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mt-1 block truncate ${
                  (metrics.profitLoss || 0) >= 0 ? "text-slate-900" : "text-rose-600"
                }`}
              >
                {formatINR(metrics.profitLoss || 0)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5">
                Net Surplus
              </span>
            </div>

            {/* Bottom Color Indicator Bar */}
            <div className="w-10 sm:w-12 h-1 rounded-full bg-[#6366F1] mt-3" />
          </Link>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT: SYMMETRICAL 3-COLUMN OPERATIONAL HUB
             Column 1: Recent Trips (~48% width)
             Column 2: Reminders (~24% width)
             Column 3: Balances & Health (~24% width)
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-4 sm:mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch"
      >
        {/* ════ COLUMN 1 (6 cols on lg): RECENT TRIPS & DISPATCH ════ */}
        <div className="md:col-span-12 lg:col-span-6 flex flex-col">
          <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col justify-between flex-1 min-h-[300px]">
            {/* Header matching Screenshot: cyan/blue square icon, RECENT TRIPS, subtitle, and View All link */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[14px] bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
                  <Bus className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-base font-black text-slate-900 tracking-tight uppercase sm:capitalize">
                    RECENT TRIPS
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    Latest client bookings &amp; dispatches
                  </p>
                </div>
              </div>
              <Link
                href="/travel/trips"
                className="inline-flex items-center gap-1 text-xs font-black text-[#0284C7] hover:text-sky-700 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>

            {/* Empty State / Populated Trips */}
            {trips.length === 0 ? (
              <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center my-auto">
                <div className="relative w-56 sm:w-64 h-32 sm:h-36 mb-2">
                  <Image
                    src="/images/dashboard-empty-trips-clean.jpg"
                    alt="No trips recorded yet"
                    fill
                    priority
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  No trips recorded yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
                  Create your first trip booking to track customer fare, vehicle dispatch, and driver settlements.
                </p>
                <Link
                  href="/travel/trips"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                  <span>Create First Trip</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {trips.slice(0, 4).map((trip) => {
                  const hasDue = Number(trip.customerBalance) > 0;
                  const statusColors: Record<string, string> = {
                    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                    in_progress: "bg-blue-50 text-blue-700 border-blue-200/60",
                    scheduled: "bg-[#FEF3C7] text-[#92400E] border-amber-200/60",
                    cancelled: "bg-slate-100 text-slate-600 border-slate-200/60",
                  };
                  const statusLabel: Record<string, string> = {
                    completed: "Completed",
                    in_progress: "In Progress",
                    scheduled: "Scheduled",
                    cancelled: "Cancelled",
                  };

                  return (
                    <Link
                      key={trip.id}
                      href="/travel/trips"
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Left: Round icon, Trip # + Scheduled pill, Date, Customer & Route */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5 group-hover:bg-[#E0F2FE] group-hover:text-[#0284C7] transition-colors">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900 font-mono tracking-tight">
                              #{trip.tripNumber || trip.id.slice(0, 7)}
                            </span>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                statusColors[trip.status] || statusColors.scheduled
                              }`}
                            >
                              {statusLabel[trip.status] || trip.status}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {formatDateShort(trip.tripDate)}
                          </p>

                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mt-1 truncate">
                            <MapPin className="w-3 h-3 text-[#0284C7] shrink-0" />
                            <span className="truncate">{trip.from || "Start"}</span>
                            <span className="text-slate-300">→</span>
                            <span className="truncate">{trip.to || "Destination"}</span>
                          </div>

                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {trip.customerName || "Customer"}
                            {trip.vehicleName ? ` • ${trip.vehicleName}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Right: Fare, Payment Badge, Chevron */}
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                            {formatINR(trip.totalFare || 0)}
                          </div>
                          <div className="mt-1">
                            {hasDue ? (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 block">
                                Pending
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block">
                                Paid Full
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0284C7] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════ COLUMN 2 (3 cols on lg): REMINDERS & COMPLIANCE ════ */}
        <div className="md:col-span-6 lg:col-span-3 flex flex-col">
          <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] space-y-3 flex flex-col justify-between flex-1 min-h-[300px]">
            <div>
              {/* Header matching screenshot */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[12px] bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 fill-amber-500/10" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                      REMINDERS
                    </h2>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Vehicle &amp; legal compliance
                    </p>
                  </div>
                </div>
                <Link
                  href="/travel/reminders"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[#0284C7] bg-[#E0F2FE] hover:bg-sky-100 px-3 py-1 rounded-full transition-all"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Add</span>
                </Link>
              </div>

              {/* Items List / Empty State */}
              <div className="pt-2">
                {reminders.length === 0 ? (
                  <div className="py-5 px-3 text-center flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2">
                      <Image
                        src="/images/dashboard-empty-reminders-clean.jpg"
                        alt="Compliances Up to Date"
                        fill
                        priority
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Compliances Up to Date
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      No active maintenance or license alerts.
                    </p>
                    <Link
                      href="/travel/reminders"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                      <span>Schedule</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminders.slice(0, 3).map((rem) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const isOverdue =
                        rem.status === "overdue" ||
                        (rem.status === "pending" && rem.dueDate < todayStr);

                      return (
                        <div
                          key={rem.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isOverdue
                              ? "bg-[#FFF5F5] border-rose-200"
                              : "bg-[#FFFBEB] border-amber-200/80"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  isOverdue
                                    ? "bg-rose-600 text-white"
                                    : "bg-[#F59E0B] text-slate-950"
                                }`}
                              >
                                {isOverdue ? "OVERDUE" : "UPCOMING"}
                              </span>
                              <span className="text-xs font-black text-slate-900 truncate">
                                {rem.title}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono-nums">
                              Due: {formatDate(rem.dueDate)}
                            </p>
                          </div>
                          <Link
                            href="/travel/reminders"
                            className="inline-flex items-center gap-0.5 text-[11px] font-black text-[#0284C7] hover:underline shrink-0"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3 h-3" />
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
              className="w-full py-2.5 rounded-xl bg-[#F0F4F8] hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors mt-auto"
            >
              <span>View All Reminders</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* ════ COLUMN 3 (3 cols on lg): OUTSTANDING BALANCES & HEALTH ════ */}
        <div className="md:col-span-6 lg:col-span-3 flex flex-col">
          <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.04)] space-y-3 flex flex-col justify-between flex-1 min-h-[300px]">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-[12px] bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
                    BALANCES &amp; HEALTH
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Receivables &amp; Fleet Status
                  </p>
                </div>
              </div>

              {/* Sub-cards */}
              <div className="space-y-2.5 pt-2">
                {/* Customer Dues */}
                <div className="p-3.5 rounded-2xl bg-[#FFFDF5] border border-[#FEF3C7] flex items-center justify-between">
                  <div>
                    <p className="text-[9.5px] font-black uppercase tracking-wider text-[#92400E]">
                      CUSTOMER DUES
                    </p>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                      {formatINR(metrics.pendingCustomerPayment || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="inline-flex items-center gap-0.5 text-xs font-black text-[#92400E] hover:bg-[#FDE68A] px-3.5 py-1.5 rounded-full bg-[#FEF3C7] border border-amber-200/60 transition-colors"
                  >
                    <span>Collect</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Driver Payables */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-[9.5px] font-black uppercase tracking-wider text-[#475569]">
                      DRIVER PAYABLES
                    </p>
                    <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                      {formatINR(metrics.driverPaymentPending || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="inline-flex items-center gap-0.5 text-xs font-black text-[#334155] hover:bg-[#CBD5E1] px-3.5 py-1.5 rounded-full bg-[#E2E8F0] border border-slate-300/60 transition-colors"
                  >
                    <span>Pay</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Fleet Health Alert Banner */}
                <div className="pt-0.5">
                  {(metrics.vehicleServiceDue || 0) > 0 ? (
                    <Link
                      href="/travel/vehicles"
                      className="flex items-start gap-2 text-xs text-rose-700 bg-[#FFF5F5] hover:bg-rose-100/80 p-3 rounded-2xl border border-rose-200 transition-colors cursor-pointer group"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px] flex items-center justify-between">
                          <span>Maintenance Attention</span>
                          <span className="text-[10px] text-rose-600 font-normal underline">View Fleet →</span>
                        </p>
                        <p className="text-[10px] text-rose-600 truncate">
                          {metrics.vehicleServiceDue} vehicle(s) require service.
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <Link
                      href="/travel/vehicles"
                      className="flex items-center gap-2 text-xs text-[#065F46] bg-[#ECFDF5] hover:bg-emerald-100/60 p-3 rounded-2xl border border-[#A7F3D0] transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span className="font-bold text-[11px] truncate">
                        All vehicles up to date on maintenance
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Soft Gray Bar */}
            <Link
              href="/travel/cashbook"
              className="w-full py-2.5 rounded-xl bg-[#F0F4F8] hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors mt-auto"
            >
              <span>Manage Cash &amp; Ledger</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          4. CLEAN EXECUTIVE FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400">
        <p>© RK Travel Hub • Fleet &amp; Trip Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-600">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
