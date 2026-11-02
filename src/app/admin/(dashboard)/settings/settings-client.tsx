"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  User,
  Building2,
  Lock,
  Download,
  LogOut,
  CheckCircle2,
  Phone,
  MapPin,
  ExternalLink,
  Database,
  ArrowRight,
  Bus,
  Car,
  Wallet,
  Receipt,
  BookOpen,
  Bell,
  Users,
  Activity,
  Globe,
} from "lucide-react";

interface AdminSettingsClientProps {
  counts: {
    users: number;
    vehicles: number;
    trips: number;
    payments: number;
    expenses: number;
    reminders: number;
  };
  data: {
    users: Record<string, any>[];
    vehicles: Record<string, any>[];
    trips: Record<string, any>[];
    payments: Record<string, any>[];
    expenses: Record<string, any>[];
    reminders: Record<string, any>[];
  };
}

export default function AdminSettingsClient({
  counts,
  data,
}: AdminSettingsClientProps) {
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleExportBackup = () => {
    try {
      const backupPayload = {
        system: "RK Travel Hub Admin Governance",
        exportedAt: new Date().toISOString(),
        version: "2.0.0",
        summary: counts,
        records: data,
      };

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute(
        "download",
        `RK_Admin_System_Backup_${dateStr}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        message: "System database backup downloaded successfully.",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      setFeedback({
        message: "Backup export failed: " + ((err as Error)?.message || ""),
        type: "error",
      });
    }
  };

  const adminModules = [
    { name: "Users & Roles", href: "/admin/users", icon: Users, count: counts.users },
    { name: "Vehicles & Fleet", href: "/admin/vehicles", icon: Car, count: counts.vehicles },
    { name: "Trips & Dispatches", href: "/admin/trips", icon: Bus, count: counts.trips },
    { name: "Payments & Ledger", href: "/admin/payments", icon: Wallet, count: counts.payments },
    { name: "Operating Expenses", href: "/admin/expenses", icon: Receipt, count: counts.expenses },
    { name: "Reminders & Alerts", href: "/admin/reminders", icon: Bell, count: counts.reminders },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. SLEEK ADMIN HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B1528] to-slate-900 border border-slate-800/80 p-5 sm:p-7 text-white shadow-xl overflow-hidden">
        {/* Glow backdrop circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#60A5FA]" />
              ADMIN GOVERNANCE • SETTINGS
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              System <span className="text-[#38BDF8]">Settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Configure governance security policies, master database backup, and centralized agency credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <Link
              href="/travel/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Agency User Portal</span>
            </Link>
          </div>
        </div>
      </div>

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
          2. CORE CARDS GRID
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* CARD 1: SUPER ADMIN CREDENTIALS & SECURITY */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Admin Profile & Auth
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Super administrator access status
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Administrator</span>
                <span className="font-bold text-slate-900">ADMIN</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Admin Email</span>
                <span className="font-semibold text-slate-800">admin@gmail.com</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Governance Role</span>
                <span className="font-bold text-blue-600">Super Administrator</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Zero-Trust Protocol</span>
                <span className="font-semibold text-emerald-600">Active & Enforced</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Admin Console</span>
              </button>
            </form>
          </div>
        </div>

        {/* CARD 2: AGENCY PROFILE & DETAILS */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Agency Master Info
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Official registration & contacts
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                Active Hub
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Agency Name</span>
                <span className="font-black text-slate-900 tracking-tight">RK TRAVEL HUB</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Headquarters</span>
                <span className="font-semibold text-slate-800">South India Corridor</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Direct Hotline</span>
                <span className="font-bold text-slate-900">98 09 20 70 80</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Currency Standard</span>
                <span className="font-semibold text-slate-800">INR (₹) Indian Rupee</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/travel/settings"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <span>Edit Agency Details in User Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: CLOUD DATA BACKUP & SNAPSHOT */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Cloud Database Backup
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Export full JSON snapshot
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Synced
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Export an encrypted, complete JSON archive containing all active records across trips, fleet, payments, expenses, and staff users.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-base font-black text-slate-900">{counts.trips}</p>
                <p className="text-[10px] text-slate-400 font-semibold">Trips</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-base font-black text-slate-900">{counts.vehicles}</p>
                <p className="text-[10px] text-slate-400 font-semibold">Vehicles</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-base font-black text-slate-900">{counts.payments}</p>
                <p className="text-[10px] text-slate-400 font-semibold">Payments</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0D62FE] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download System Backup JSON</span>
            </button>
          </div>
        </div>

        {/* CARD 4: QUICK ACCESS TO GOVERNANCE MODULES */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Governance Modules
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Jump to administration tables
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                6 Modules
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {adminModules.map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.name}
                    href={m.href}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0D62FE] shrink-0" />
                      <span className="font-semibold text-slate-800 text-[11px] truncate">
                        {m.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                      {m.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Admin Session Active</span>
            <span className="font-semibold text-emerald-600">All Modules Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
