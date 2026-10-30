"use client";

import Link from "next/link";
import {
  Car,
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
  Compass,
  Route,
  Navigation,
  Activity,
  Calendar,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { formatINR, formatDateShort, formatDate } from "@/lib/utils";
import type { DashboardMetrics, Trip, Reminder } from "@/types";

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  initialTrips: Trip[];
  initialReminders?: Reminder[];
}

// Framer Motion Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export default function DashboardClient({
  initialMetrics,
  initialTrips,
  initialReminders = [],
}: DashboardClientProps) {
  const metrics = initialMetrics;
  const trips = initialTrips || [];
  const reminders = initialReminders || [];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. LUXURY TRAVEL HERO BANNER ─── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-6 sm:p-8 shadow-xl shadow-slate-900/10 border border-slate-800/80"
      >
        {/* Travel Coordinate & Route Lines Ambient SVG Backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="hero-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
            {/* Elegant curved flight / transit paths */}
            <path
              d="M -100 240 C 200 40, 600 280, 1400 80"
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            <path
              d="M 100 -50 C 400 180, 800 60, 1600 320"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
          </svg>
        </div>

        {/* Soft Radial Ambient Lights inside Hero */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Content Grid */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title & Status */}
          <div className="space-y-3 max-w-2xl">
            {/* Top Badge Strip */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-500/15 text-blue-300 border border-blue-400/25 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OPERATIONS HUB • LIVE</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 backdrop-blur-md">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>18°31&apos;N 73°51&apos;E • Pune Base</span>
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white font-display">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-300">
                  RK Travel Hub
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-normal mt-1.5 leading-relaxed max-w-xl">
                Fleet operations command, active passenger dispatches, compliance
                telemetry, and financial daybook.
              </p>
            </div>
          </div>

          {/* Right Action Ribbon */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            <Link
              href="/travel/reminders"
              prefetch={true}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 shadow-sm transition-all backdrop-blur-md hover:scale-[1.02]"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Reminders</span>
              {reminders.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                  {reminders.length}
                </span>
              )}
            </Link>

            <Link
              href="/travel/payments"
              prefetch={true}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 shadow-sm transition-all backdrop-blur-md hover:scale-[1.02]"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Record Payment</span>
            </Link>

            <Link
              href="/travel/trips"
              prefetch={true}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Trip</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. 6 FOCUSED DYNAMIC KPI CARDS (FRAMER MOTION STAGGERED) ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {/* 1. Total Trips */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/trips"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Trips
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Car className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {metrics.totalTrips || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Booked Trips</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {metrics.todayTrips || 0} today
              </span>
            </div>
          </Link>
        </motion.div>

        {/* 2. Total Collection */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/payments"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Collection
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatINR(metrics.totalCollection || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Receipts &amp; Adv.</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Received
              </span>
            </div>
          </Link>
        </motion.div>

        {/* 3. Total Expenses */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/expenses"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Expenses
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatINR(metrics.totalExpenses || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Fuel &amp; Outlays</span>
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Operating
              </span>
            </div>
          </Link>
        </motion.div>

        {/* 4. Net Profit */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/reports"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Net Profit
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span
                className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                  (metrics.profitLoss || 0) >= 0
                    ? "text-blue-600"
                    : "text-rose-600"
                }`}
              >
                {formatINR(metrics.profitLoss || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Net Surplus</span>
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
                  "Deficit"
                )}
              </span>
            </div>
          </Link>
        </motion.div>

        {/* 5. Customer Dues */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/payments"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Customer Dues
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatINR(metrics.pendingCustomerPayment || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Receivables</span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                Pending
              </span>
            </div>
          </Link>
        </motion.div>

        {/* 6. Reminders / Fleet Service Due */}
        <motion.div variants={itemVariants}>
          <Link
            href="/travel/reminders"
            className="group block bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between h-full"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Reminders
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                  reminders.length > 0
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <Bell className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {reminders.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Fleet Alerts</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  reminders.length > 0
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {reminders.length > 0
                  ? `${reminders.length} Active`
                  : "All Clear"}
              </span>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* ─── 3. MAIN OPERATIONAL HUBS (2 BALANCED COLUMNS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ════ LEFT COLUMN (7 cols): RECENT TRIPS FEED ════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="lg:col-span-7 space-y-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Route className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Recent Trips &amp; Dispatch
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest client bookings and active route schedules
                  </p>
                </div>
              </div>
              <Link
                href="/travel/trips"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all"
              >
                <span>View All Trips</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Trips List / Empty State */}
            {trips.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/60 flex items-center justify-center text-blue-600 mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  No trips recorded yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Create your first trip booking to track passenger route,
                  vehicle assignment, and settlement daybook.
                </p>
                <Link
                  href="/travel/trips"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create First Trip</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {trips.slice(0, 6).map((trip) => {
                  const hasDue = Number(trip.customerBalance) > 0;
                  const statusColors: Record<string, string> = {
                    completed:
                      "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                    in_progress:
                      "bg-blue-50 text-blue-700 border-blue-200/60",
                    scheduled:
                      "bg-amber-50 text-amber-700 border-amber-200/60",
                    cancelled:
                      "bg-slate-100 text-slate-600 border-slate-200/60",
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
                                statusColors[trip.status] ||
                                statusColors.scheduled
                              }`}
                            >
                              {statusLabel[trip.status] || trip.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateShort(trip.tripDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                            <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">
                              {trip.from || "Origin"}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="truncate">
                              {trip.to || "Destination"}
                            </span>
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
                            {trip.driverName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">
                                  Driver: {trip.driverName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare, Due & Quick link */}
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
        </motion.div>

        {/* ════ RIGHT COLUMN (5 cols): REMINDERS + FINANCIAL BALANCES ════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="lg:col-span-5 space-y-5"
        >
          {/* ─── REMINDERS & COMPLIANCE POD ─── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Reminders &amp; Compliance
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Vehicle service, permits &amp; insurance deadlines
                  </p>
                </div>
              </div>
              <Link
                href="/travel/reminders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Link>
            </div>

            {/* Reminder Items List */}
            <div className="space-y-2.5">
              {reminders.length === 0 ? (
                <div className="py-7 px-4 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    All Compliances Up to Date
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No active vehicle maintenance, fitness, or license alerts.
                  </p>
                  <Link
                    href="/travel/reminders"
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>Schedule Reminder</span>
                  </Link>
                </div>
              ) : (
                reminders.slice(0, 4).map((rem) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isOverdue =
                    rem.status === "overdue" ||
                    (rem.status === "pending" && rem.dueDate < todayStr);

                  return (
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
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {rem.title}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Due: {formatDate(rem.dueDate)}
                          {rem.notes ? ` • ${rem.notes}` : ""}
                        </p>
                      </div>
                      <Link
                        href="/travel/reminders"
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 pt-0.5"
                      >
                        Manage →
                      </Link>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              href="/travel/reminders"
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View All Compliance Reminders</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          {/* ─── OUTSTANDING BALANCES & FLEET HEALTH ─── */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Outstanding Balances &amp; Health
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Customer Pending */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Customer Dues
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-amber-950 font-mono mt-0.5">
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Driver Payables
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-0.5">
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
                      {metrics.vehicleServiceDue} vehicle(s) require scheduled
                      service or fitness inspection.
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
        </motion.div>
      </div>

      {/* ─── CLEAN EXECUTIVE FOOTER ─── */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© RK Travel Hub • Fleet Logistics &amp; Trip Dispatch Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-600">All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
