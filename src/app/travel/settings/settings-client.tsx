"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  User,
  Building2,
  LogOut,
  Download,
  CheckCircle2,
  Shield,
  Phone,
  MapPin,
  Pencil,
  Lock,
  Globe,
  ChevronDown,
  X,
  Check,
  QrCode,
  Sliders,
  Bus,
  Activity,
  ArrowRight,
  TrendingUp,
  Receipt,
  Bell,
  Clock,
} from "lucide-react";
import { capitalizeWords } from "@/lib/utils";
import { getLocalData } from "@/lib/storage-sync";
import type { Trip, Vehicle, Payment, Expense, Reminder } from "@/types";

interface SettingsClientProps {
  trips: Trip[];
  vehicles: Vehicle[];
  payments: Payment[];
  expenses: Expense[];
  reminders: Reminder[];
}

export default function SettingsClient({
  trips,
  vehicles,
  payments,
  expenses,
  reminders,
}: SettingsClientProps) {
  const router = useRouter();
  const { user, userProfile, signOut } = useAuth();

  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  // Currency & Language
  const [currency, setCurrency] = useState("INR (₹) Indian Rupee");
  const [language, setLanguage] = useState("English");

  // Export Data JSON snapshot
  const handleExportData = () => {
    try {
      const activeTrips = trips?.length ? trips : getLocalData<Trip[]>("trips", []);
      const activeVehicles = vehicles?.length ? vehicles : getLocalData<Vehicle[]>("vehicles", []);
      const activePayments = payments?.length ? payments : getLocalData<Payment[]>("payments", []);
      const activeExpenses = expenses?.length ? expenses : getLocalData<Expense[]>("expenses", []);

      const backupPayload = {
        agency: "RK Travel Hub",
        exportedAt: new Date().toISOString(),
        counts: {
          trips: activeTrips.length,
          vehicles: activeVehicles.length,
          payments: activePayments.length,
          expenses: activeExpenses.length,
          reminders: reminders?.length || 0,
        },
        collections: {
          trips: activeTrips,
          vehicles: activeVehicles,
          payments: activePayments,
          expenses: activeExpenses,
          reminders,
        },
      };

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute(
        "download",
        `RK_Travel_Backup_${dateStr}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        message: "Data backup downloaded successfully.",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      setFeedback({
        message: "Failed to download backup: " + ((err as Error)?.message || ""),
        type: "error",
      });
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm("Are you sure you want to log out of RK Travel?")) {
      return;
    }
    setLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("rk_login_username");
      }
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      setLoggingOut(false);
      setFeedback({
        message: "Failed to sign out. Please try again.",
        type: "error",
      });
    }
  };

  const rawDisplayName =
    (typeof window !== "undefined" && localStorage.getItem("rk_login_username")) ||
    user?.email?.split("@")[0] ||
    userProfile?.userId ||
    userProfile?.displayName ||
    "ADMIN";
  const displayName = rawDisplayName.toUpperCase();
  const userEmail = user?.email || "admin@gmail.com";
  const userRole = (userProfile?.role || "Staff").toUpperCase();

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER
             With Airplane over Alpine lake & Coach bus on highway
             Bottom padding allows cards to overlap halfway!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[300px] sm:min-h-[330px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Image: Airplane taking off over mountains, lake & luxury coach bus on highway */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/settings-scenic-hero.jpg')",
            backgroundPosition: "center 45%",
          }}
        >
          <Image
            src="/images/settings-scenic-hero.jpg"
            alt="RK Travel Flight & Highway Fleet"
            fill
            priority
            unoptimized
            className="object-cover object-[center_45%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the bus & plane bright */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent pointer-events-none" />
        </div>

        {/* Hero Top Bar & Right Cursive Script */}
        <div className="relative z-10 flex items-start justify-between w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
              SETTINGS
            </p>
          </div>

          {/* Right Cursive Script: "Travel Smarter, Manage Better" (matching mockup) */}
          <div className="hidden lg:block select-none pointer-events-none text-right pr-4 pt-1">
            <p className="font-serif italic text-3xl xl:text-[38px] leading-tight text-white/95 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] tracking-wide -rotate-3">
              Travel Smarter,
              <br />
              <span className="font-serif italic text-slate-100">Manage Better</span>
            </p>
          </div>
        </div>

        {/* Left Side: Main Title & Subtitle */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black tracking-tight text-white leading-tight drop-shadow-md">
            Setting<span className="text-[#38BDF8]">s</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-md drop-shadow leading-relaxed">
            Manage your account profile, agency details, and system preferences.
          </p>
        </div>
      </motion.div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. CARDS SECTION (Hero Overlap Layout with -mt-10 to -mt-14)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 space-y-5">
        {/* ════ ROW 1: Account Profile (Left ~35%) + Agency Profile (Right ~65%) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ── CARD 1: Account Profile ── */}
          <div className="lg:col-span-4 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Account Profile
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Currently active user session
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            {/* Profile Highlight Card with subtle gradient / wave effect */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/40 border border-blue-100/60 shadow-2xs flex items-center gap-3.5">
              {/* Subtle background abstract shape */}
              <div className="absolute right-0 top-0 bottom-0 w-28 pointer-events-none opacity-30">
                <svg viewBox="0 0 100 80" className="w-full h-full fill-blue-300">
                  <path d="M0 0 C 40 20, 60 60, 100 80 L 100 0 Z" />
                </svg>
              </div>

              {/* Big Initial Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#0D62FE] text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 z-10">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 z-10 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 truncate uppercase">
                    {displayName}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#EBF3FE] text-[#1A68F8] border border-blue-200/60 tracking-wider uppercase">
                    {userRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Access Level & Authentication Rows */}
            <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between py-1.5 text-slate-600">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Access Level</span>
                </span>
                <span className="font-bold text-slate-800">
                  Full Administrator
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-slate-600">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Authentication</span>
                </span>
                <span className="font-bold text-emerald-600">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Operational Overview ── */}
          <div className="lg:col-span-8 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Operational Overview
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Real-time fleet activity, dispatch performance &amp; financials
                  </p>
                </div>
              </div>

              {/* View Dashboard Quick Link */}
              <Link
                href="/travel"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EBF3FE] hover:bg-blue-100 text-[#1A68F8] font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <span>Live Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 4 Interactive KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* 1. Fleet Vehicles */}
              <Link
                href="/travel/vehicles"
                className="bg-slate-50/80 hover:bg-blue-50/50 p-3.5 rounded-2xl border border-slate-200/70 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fleet
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono-nums">
                  {vehicles?.length || 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Active vehicles</span>
                </p>
              </Link>

              {/* 2. Total Trips */}
              <Link
                href="/travel/trips"
                className="bg-slate-50/80 hover:bg-indigo-50/50 p-3.5 rounded-2xl border border-slate-200/70 hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trips
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono-nums">
                  {trips?.length || 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  <span>Booked journeys</span>
                </p>
              </Link>

              {/* 3. Collected Revenue */}
              <Link
                href="/travel/payments"
                className="bg-slate-50/80 hover:bg-emerald-50/50 p-3.5 rounded-2xl border border-slate-200/70 hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Revenue
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono-nums truncate">
                  ₹{Number((payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  Recorded payments
                </p>
              </Link>

              {/* 4. Active Reminders */}
              <Link
                href="/travel/reminders"
                className="bg-slate-50/80 hover:bg-amber-50/50 p-3.5 rounded-2xl border border-slate-200/70 hover:border-amber-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Reminders
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-700 mt-2 font-mono-nums">
                  {reminders?.length || 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                  <span>Service &amp; Tax</span>
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* ════ ROW 2: Log Out (Left ~35%) + Preferences & Backup (Right ~65%) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ── CARD 3: Log Out ── */}
          <div className="lg:col-span-4 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between space-y-4">
            {/* Header + Door Illustration */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-2xs">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Log Out
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Safely sign out of your RK Travel account from this device.
                  </p>
                </div>
              </div>

              {/* 3D-Styled Door Exit Graphic (from mockup) */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-50 via-slate-50 to-blue-50 border border-slate-200/60 p-2 flex items-center justify-center relative shrink-0 shadow-2xs">
                {/* Slanted blue open door with red exit arrow */}
                <div className="w-6 h-9 rounded-sm bg-blue-400 border border-blue-500 -rotate-12 transform origin-left shadow-xs flex items-center justify-end pr-0.5">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
                <div className="absolute right-1 text-rose-500 font-black text-sm">
                  →
                </div>
              </div>
            </div>

            {/* Big Vibrant Red Pill Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleSignOut}
                className="w-full py-3 px-4 rounded-full bg-[#E11D48] hover:bg-[#BE123C] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{loggingOut ? "Signing out..." : "Log Out of RK Travel"}</span>
              </button>
            </div>
          </div>

          {/* ── CARD 4: Preferences & Backup ── */}
          <div className="lg:col-span-8 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Preferences &amp; Backup
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Regional defaults and database export
                  </p>
                </div>
              </div>

              {/* Export Data Button */}
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EBF3FE] hover:bg-blue-100 text-[#1A68F8] font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Data</span>
              </button>
            </div>

            {/* 3-Part Row: Currency Card | Language Card | Database & Cloud Art */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
              {/* Currency Selector Pill Card */}
              <div className="md:col-span-5 bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-200/70 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                    ₹
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Currency
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {currency}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Language Selector Pill Card */}
              <div className="md:col-span-4 bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-200/70 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Language
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {language}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Right: Database Cloud Backup Graphic (from mockup) */}
              <div className="md:col-span-3 flex items-center justify-center pointer-events-none">
                <div className="relative w-20 h-16 flex items-center justify-center">
                  {/* Stylized Cloud / Shield / DB Cylinder */}
                  <svg viewBox="0 0 100 80" className="w-full h-full">
                    {/* Soft Cloud Base */}
                    <path
                      d="M20 60 C 15 60, 10 50, 20 40 C 20 30, 35 25, 45 35 C 50 20, 70 20, 75 35 C 85 30, 95 40, 90 55 C 95 65, 80 70, 75 65 L 20 65 Z"
                      fill="#EFF6FF"
                    />
                    {/* Cylinders */}
                    <ellipse cx="50" cy="35" rx="16" ry="6" fill="#93C5FD" />
                    <rect x="34" y="35" width="32" height="12" fill="#60A5FA" />
                    <ellipse cx="50" cy="47" rx="16" ry="6" fill="#3B82F6" />
                    <rect x="34" y="47" width="32" height="12" fill="#2563EB" />
                    <ellipse cx="50" cy="59" rx="16" ry="6" fill="#1D4ED8" />
                  </svg>
                  {/* Blue Security Shield Overlay with Check */}
                  <div className="absolute right-0 bottom-1 w-6 h-6 rounded-full bg-[#0D62FE] text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
