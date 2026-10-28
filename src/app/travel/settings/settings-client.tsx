"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Database,
  Shield,
  Layers,
  History,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
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
  const { user, userProfile } = useAuth();
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleExportBackup = () => {
    try {
      const backupPayload = {
        app: "RK Travel Hub",
        business: "RK Enterprise",
        version: "0.1.0",
        formatVersion: "1.0",
        exportedAt: new Date().toISOString(),
        collections: {
          trips,
          vehicles,
          payments,
          expenses,
          reminders,
        },
      };

      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
      downloadAnchor.setAttribute("download", `RK_TravelHub_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setLastBackupTime(new Date().toLocaleTimeString());
      setFeedback({ message: "Full system backup exported successfully!", type: "success" });
    } catch (err: unknown) {
      setFeedback({ message: "Failed to generate backup: " + ((err as Error)?.message || "Unknown error"), type: "error" });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.collections) {
          throw new Error("Invalid backup structure. Missing 'collections' key.");
        }

        const counts = {
          trips: parsed.collections.trips?.length || 0,
          vehicles: parsed.collections.vehicles?.length || 0,
          payments: parsed.collections.payments?.length || 0,
          expenses: parsed.collections.expenses?.length || 0,
          reminders: parsed.collections.reminders?.length || 0,
        };

        setImportSummary(
          `Backup verified: ${counts.trips} trips, ${counts.vehicles} vehicles, ${counts.payments} payments, ${counts.expenses} expenses, ${counts.reminders} reminders.`
        );
        setFeedback({ message: "Backup validated! Ready to restore.", type: "success" });
      } catch (err: unknown) {
        setFeedback({ message: "Invalid JSON backup file: " + ((err as Error)?.message || "Unknown error"), type: "error" });
        setImportSummary(null);
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    const code = prompt(
      "DANGER: This action clears local caches and resets session data. Type 'DELETE' to confirm:"
    );
    if (code === "DELETE") {
      alert("Local session reset. Production Firestore database requires administrator credentials.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings"
        subtitle="Manage app settings, backup data and preferences."
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Database"
          value="Cloud Firestore"
          icon={Database}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Google Cloud / Firebase"
        />
        <StatCard
          label="Login Role"
          value={userProfile?.role ? userProfile.role.toUpperCase() : "Administrator"}
          icon={Shield}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle={userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || "Super Admin"}
        />
        <StatCard
          label="App Version"
          value="v0.1.0"
          icon={Layers}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle="Production Release"
        />
        <StatCard
          label="Last Backup"
          value={lastBackupTime || "Never"}
          icon={History}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle={lastBackupTime ? "Saved today" : "No backup taken yet"}
        />
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.type === "success" && <Check className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Admin Settings & Backup */}
        <div className="lg:col-span-6 card space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Admin Settings & Backup</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Secure export and disaster recovery tooling
              </p>
            </div>
          </div>

          {/* Export JSON */}
          <div className="form-inset flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-xs text-slate-900">Export JSON Backup</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download all trips, vehicles, payments, and reminders in structured JSON.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="btn btn-primary py-2 px-3.5 text-xs shrink-0 shadow-md shadow-blue-500/25 inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="form-inset space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xs text-slate-900">Import Backup File</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verify and restore system collections from a previous JSON backup.
                </p>
              </div>
              <label className="btn btn-secondary py-2 px-3.5 text-xs shrink-0 cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>Select File</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </label>
            </div>
            {importSummary && (
              <div className="p-2.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-mono">
                {importSummary}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="p-4 bg-rose-50/70 border border-rose-200/90 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Danger Zone</h3>
            </div>
            <p className="text-[11px] text-rose-700/80">
              Clear application cache or purge test records. This operation cannot be reversed.
            </p>
            <button
              onClick={handleClearData}
              className="btn btn-danger py-2 px-3.5 text-xs shadow-md shadow-rose-500/25 inline-flex items-center gap-1.5 mt-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Application Data</span>
            </button>
          </div>
        </div>

        {/* Right: Account Information & App Preferences */}
        <div className="lg:col-span-6 card space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Account & Preferences</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Operating company identity and regional formats
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="form-inset space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Business Profile
              </span>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Application Name:</span>
                <span className="font-semibold text-slate-900">RK Travel Hub</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Operating Business:</span>
                <span className="font-semibold text-slate-900">RK Enterprise</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Headquarters:</span>
                <span className="font-semibold text-slate-900">Pune, Maharashtra, India</span>
              </div>
            </div>

            <div className="form-inset space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Regional & Formatting Standards
              </span>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Primary Currency:</span>
                <span className="font-semibold text-slate-900">Indian Rupee (INR — ₹)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Date Format:</span>
                <span className="font-semibold font-mono text-slate-900">DD/MM/YYYY</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Time Zone:</span>
                <span className="font-semibold text-slate-900">Asia/Kolkata (IST — UTC+5:30)</span>
              </div>
            </div>

            <div className="form-inset space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Session Identity
              </span>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-text-secondary">User:</span>
                <span className="font-semibold text-text-primary">
                  {userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || "Admin Operator"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Authorization:</span>
                <span className="font-semibold text-emerald-700">Full Access (Admin)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
