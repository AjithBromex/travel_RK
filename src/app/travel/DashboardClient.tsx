"use client";

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
    <div className="font-sans max-w-[1440px] mx-auto pb-10">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER
             Expanded bottom padding so the 4 KPI cards float halfway
             over the asphalt road and van, exactly as in the mockup!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[290px] sm:min-h-[320px] lg:min-h-[350px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Photographic Panoramic Highway Background with Van & Alpine Lake */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/dashboard-scenic-hero.jpg')",
            backgroundPosition: "70% 62%",
          }}
        >
          <Image
            src="/images/dashboard-scenic-hero.jpg"
            alt="Scenic Travel Highway with Passenger Van"
            fill
            priority
            unoptimized
            className="object-cover object-[70%_62%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the vehicle on the right 100% bright */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent pointer-events-none" />
        </div>

        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop) */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 flex-wrap w-full">
          <Link
            href="/travel/reminders"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            <span>Record Payment</span>
          </Link>

          <Link
            href="/travel/trips"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>New Trip</span>
          </Link>
        </div>

        {/* Operations Hub Welcome Title with Official 3D RK Emblem */}
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-1">
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
            Welcome back, <br className="hidden sm:inline" />
            <span>RK Travel </span>
            <span className="text-[#38BDF8]">Hub</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1 max-w-md drop-shadow line-clamp-1 sm:line-clamp-none">
            Fleet operations, active trips, compliance alerts, and financial daybook.
          </p>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
             Positioned with -mt-10 sm:-mt-12 lg:-mt-14 relative z-20
             to float halfway over the bottom of the scenic road & van!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {/* CARD 1: TOTAL TRIPS */}
        <Link
          href="/travel/trips"
          className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-blue-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]"
        >
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20 L 100 40 L 0 40 Z" fill="url(#waveBlueGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#EAF2FD] text-[#1A68F8] flex items-center justify-center shrink-0">
              <Bus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                TOTAL TRIPS
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {metrics.totalTrips || 0}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Booked Trips
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full shrink-0 relative z-10">
            <div className="w-6 h-6 rounded-full bg-[#EEF5FE] text-[#1A68F8] flex items-center justify-center">
              <Car className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-extrabold text-[#1A68F8] bg-[#EEF5FE] px-3 py-0.5 rounded-full border border-blue-100/70">
              {metrics.todayTrips || 0} today
            </span>
          </div>
        </Link>

        {/* CARD 2: COLLECTION */}
        <Link
          href="/travel/payments"
          className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-emerald-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]"
        >
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 32 C 20 30, 42 16, 60 18 C 75 20, 85 26, 100 16" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 32 C 20 30, 42 16, 60 18 C 75 20, 85 26, 100 16 L 100 40 L 0 40 Z" fill="url(#waveGreenGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0 font-black text-2xl">
              ₹
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                COLLECTION
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {formatINR(metrics.totalCollection || 0)}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Receipts &amp; Adv.
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full shrink-0 relative z-10">
            <div className="w-6 h-6 rounded-full bg-[#E6F8EF] text-[#10B981] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-extrabold text-[#10B981] bg-[#E6F8EF] px-3 py-0.5 rounded-full border border-emerald-100/70">
              Received
            </span>
          </div>
        </Link>

        {/* CARD 3: EXPENSES */}
        <Link
          href="/travel/expenses"
          className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-amber-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]"
        >
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveAmberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 30 C 25 28, 48 18, 65 20 C 80 22, 88 28, 100 22" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 30 C 25 28, 48 18, 65 20 C 80 22, 88 28, 100 22 L 100 40 L 0 40 Z" fill="url(#waveAmberGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#FEF5E7] text-[#F59E0B] flex items-center justify-center shrink-0">
              <Fuel className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                EXPENSES
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {formatINR(metrics.totalExpenses || 0)}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Fuel &amp; Outlays
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full shrink-0 relative z-10">
            <div className="w-6 h-6 rounded-full bg-[#FEF3D6] text-[#D97706] flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-extrabold text-[#D97706] bg-[#FEF3D6] px-3 py-0.5 rounded-full border border-amber-200/70">
              Operating
            </span>
          </div>
        </Link>

        {/* CARD 4: NET PROFIT */}
        <Link
          href="/travel/reports"
          className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-indigo-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]"
        >
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wavePurpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 32 C 20 30, 42 14, 58 16 C 74 18, 86 26, 100 18" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 32 C 20 30, 42 14, 58 16 C 74 18, 86 26, 100 18 L 100 40 L 0 40 Z" fill="url(#wavePurpleGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#EEF0FE] text-[#6366F1] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                NET PROFIT
              </span>
              <span
                className={`text-2xl sm:text-[26px] font-black font-mono tracking-tight leading-none mt-1 block ${
                  (metrics.profitLoss || 0) >= 0 ? "text-slate-900" : "text-rose-600"
                }`}
              >
                {formatINR(metrics.profitLoss || 0)}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Net Surplus
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full shrink-0 relative z-10">
            <div className="w-6 h-6 rounded-full bg-[#EAEBFE] text-[#6366F1] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span
              className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full border inline-flex items-center gap-0.5 ${
                (metrics.profitLoss || 0) >= 0
                  ? "bg-[#EAEBFE] text-[#4F46E5] border-indigo-100/70"
                  : "bg-rose-50 text-rose-700 border-rose-100"
              }`}
            >
              {(metrics.profitLoss || 0) >= 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 stroke-[2.75]" />
                  <span>Positive</span>
                </>
              ) : (
                "Deficit"
              )}
            </span>
          </div>
        </Link>
      </motion.div>

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
          <div className="bg-white rounded-[22px] border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col justify-between flex-1 min-h-[300px]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[14px] bg-[#E8F1FC] text-[#1A68F8] flex items-center justify-center">
                  <Bus className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    Recent Trips
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Latest client bookings and route dispatches
                  </p>
                </div>
              </div>
              <Link
                href="/travel/trips"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A68F8] hover:text-blue-700 bg-[#EEF4FB] hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-all"
              >
                <span>View All Trips</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>

            {/* Empty State / Populated Trips */}
            {trips.length === 0 ? (
              <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center my-auto">
                <div className="relative w-44 h-20 sm:h-24 mb-2">
                  <Image
                    src="/images/dashboard-empty-trips-hd.png"
                    alt="No trips recorded yet"
                    fill
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                  <span>Create First Trip</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {trips.slice(0, 4).map((trip) => {
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
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
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
        <div className="md:col-span-6 lg:col-span-3 flex flex-col">
          <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] space-y-3 flex flex-col justify-between flex-1 min-h-[300px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[14px] bg-[#FEF5E7] text-[#F59E0B] flex items-center justify-center">
                    <Bell className="w-4 h-4 fill-amber-500/10" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Reminders
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Vehicle &amp; compliance
                    </p>
                  </div>
                </div>
                <Link
                  href="/travel/reminders"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A68F8] hover:text-blue-700 bg-[#EEF4FB] hover:bg-blue-100 px-3 py-1 rounded-full transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add</span>
                </Link>
              </div>

              {/* Items List / Empty State */}
              <div className="pt-2">
                {reminders.length === 0 ? (
                  <div className="py-5 px-3 text-center flex flex-col items-center justify-center">
                    <div className="relative w-14 h-12 mb-2">
                      <Image
                        src="/images/dashboard-empty-reminders-hd.png"
                        alt="Compliances Up to Date"
                        fill
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
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mb-0.5 ${
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
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 shrink-0 pt-1"
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

            {/* Bottom Full-Width Soft Gray Bar */}
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
          <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(15,23,42,0.03)] space-y-3 flex flex-col justify-between flex-1 min-h-[300px]">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-[14px] bg-[#E8F1FC] text-[#1A68F8] flex items-center justify-center">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Balances &amp; Health
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Receivables &amp; Fleet Status
                  </p>
                </div>
              </div>

              {/* Sub-cards */}
              <div className="space-y-2.5 pt-2">
                {/* Customer Dues */}
                <div className="p-3 rounded-xl bg-[#FFF9EE] border border-[#FDE6BA] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#92400E]">
                      CUSTOMER DUES
                    </p>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatINR(metrics.pendingCustomerPayment || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="text-xs font-bold text-[#92400E] hover:bg-[#FCD34D] px-3 py-1 rounded-full bg-[#FDE6BA] transition-colors"
                  >
                    Collect →
                  </Link>
                </div>

                {/* Driver Payables */}
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#475569]">
                      DRIVER PAYABLES
                    </p>
                    <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatINR(metrics.driverPaymentPending || 0)}
                    </p>
                  </div>
                  <Link
                    href="/travel/payments"
                    className="text-xs font-bold text-[#334155] hover:bg-[#CBD5E1] px-3 py-1 rounded-full bg-[#E2E8F0] transition-colors"
                  >
                    Pay →
                  </Link>
                </div>

                {/* Fleet Health Alert Banner */}
                <div className="pt-0.5">
                  {(metrics.vehicleServiceDue || 0) > 0 ? (
                    <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200/70">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px]">Maintenance Attention</p>
                        <p className="text-[10px] text-rose-600 truncate">
                          {metrics.vehicleServiceDue} vehicle(s) require service.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[#065F46] bg-[#ECFDF5] p-2.5 rounded-xl border border-[#A7F3D0]">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span className="font-semibold text-[11px] truncate">
                        All vehicles up to date on maintenance
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Full-Width Soft Gray Bar */}
            <Link
              href="/travel/payments"
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
