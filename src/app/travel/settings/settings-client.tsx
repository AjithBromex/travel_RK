"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  User,
  Building2,
  LogOut,
  Download,
  CheckCircle2,
  Shield,
  Sliders,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
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

  // Agency profile state
  const [agencyForm, setAgencyForm] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("rk_travel_agency_profile");
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      agencyName: "RK Travel",
      contactPhone: "+91 98220 12345",
      address: "Pune, Maharashtra",
      gstin: "27AABCR8921P1ZT",
    };
  });

  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "rk_travel_agency_profile",
        JSON.stringify(agencyForm)
      );
    }
    setFeedback({
      message: "Agency profile saved successfully.",
      type: "success",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Export JSON snapshot of real data
  const handleExportData = () => {
    try {
      const backupPayload = {
        agency: agencyForm.agencyName,
        exportedAt: new Date().toISOString(),
        counts: {
          trips: trips?.length || 0,
          vehicles: vehicles?.length || 0,
          payments: payments?.length || 0,
          expenses: expenses?.length || 0,
          reminders: reminders?.length || 0,
        },
        collections: {
          trips,
          vehicles,
          payments,
          expenses,
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

  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Administrator";
  const userEmail = user?.email || "admin@rktravel.com";
  const userRole = userProfile?.role || "Administrator";

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* 1. Page Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
            SETTINGS
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
          Manage your account profile, agency details, and system preferences.
        </p>
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

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Account Profile & Sign Out */}
        <div className="space-y-6">
          {/* Card: Account Profile */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Account Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Currently active user session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {displayName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {userRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {userEmail}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 text-slate-600">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Access Level</span>
                </span>
                <span className="font-semibold text-slate-800">
                  Full Administrator
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-slate-600">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Authentication</span>
                </span>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          {/* Card: Log Out */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Log Out
                </h2>
                <p className="text-xs text-slate-500">
                  Safely sign out of your RK Travel account
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Logging out will clear your session on this device. You will need
              your credentials to log back in.
            </p>

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? "Signing out..." : "Log Out of RK Travel"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Agency Profile & Data Backup */}
        <div className="space-y-6">
          {/* Card: Agency Profile */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Agency Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Travel business details used across the app
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAgency} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agency Name
                </label>
                <input
                  type="text"
                  required
                  value={agencyForm.agencyName}
                  onChange={(e) =>
                    setAgencyForm({ ...agencyForm, agencyName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. RK Travel"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Helpline / Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agencyForm.contactPhone}
                    onChange={(e) =>
                      setAgencyForm({
                        ...agencyForm,
                        contactPhone: e.target.value,
                      })
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    placeholder="e.g. +91 98220 12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Address / City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agencyForm.address}
                    onChange={(e) =>
                      setAgencyForm({ ...agencyForm, address: e.target.value })
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    placeholder="e.g. Pune, Maharashtra"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={agencyForm.gstin}
                  onChange={(e) =>
                    setAgencyForm({
                      ...agencyForm,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 uppercase transition-all"
                  placeholder="e.g. 27AABCR8921P1ZT"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Save Agency Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Preferences & Data Backup */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Preferences & Backup
                </h2>
                <p className="text-xs text-slate-500">
                  Regional defaults and database export
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>Currency</span>
                </div>
                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  INR (₹) Indian Rupee
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Date Format</span>
                </div>
                <span className="font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  DD/MM/YYYY
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Export Data Backup
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Download a full snapshot of trips, vehicles, payments & expenses.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportData}
                className="w-full mt-2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Download Database Snapshot (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
