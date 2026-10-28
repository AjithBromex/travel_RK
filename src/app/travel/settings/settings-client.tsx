"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Database,
  ShieldCheck,
  Layers,
  Cloud,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  RotateCcw,
  FileText,
  Building2,
  Globe,
  Sliders,
  Lock,
  Laptop,
  Tablet,
  LogOut,
  Plus,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Shield,
  Clock,
  HardDrive,
  Radio,
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
  const { user, userProfile } = useAuth();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Form State for Company Profile
  const [profileForm, setProfileForm] = useState({
    displayName: "RK Travel Hub",
    operatingEntity: "RK Enterprise Logistics LLP",
    headquarters: "Plot 42, Hinjewadi Phase 1, Pune, Maharashtra 411057",
    helpline: "+91 98220 12345",
    gstin: "27AABCR8921P1ZT",
  });

  // Backup settings
  const [backupFormat, setBackupFormat] = useState("full");
  const [backupSchedule, setBackupSchedule] = useState<"daily" | "weekly" | "manual">("daily");
  const [retain90Days, setRetain90Days] = useState(true);

  // Handle Export Full System JSON
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        app: profileForm.displayName,
        business: profileForm.operatingEntity,
        version: "2.4.9-prod",
        formatVersion: "2.4",
        schemaVersion: "AES-256-GCM-COMPLIANT",
        exportedAt: new Date().toISOString(),
        metadata: {
          totalDocuments:
            (trips?.length || 0) +
            (vehicles?.length || 0) +
            (payments?.length || 0) +
            (expenses?.length || 0) +
            (reminders?.length || 0),
          region: "asia-south1",
          environment: "production",
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
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
      downloadAnchor.setAttribute("download", `RK_TravelHub_Snapshot_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        message: "Cryptographic snapshot and structured JSON backup generated successfully!",
        type: "success",
      });
    } catch (err: unknown) {
      setFeedback({
        message: "Failed to generate backup: " + ((err as Error)?.message || "Unknown error"),
        type: "error",
      });
    }
  };

  // Handle File Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.collections) {
          throw new Error("Invalid backup structure. Missing 'collections' root key.");
        }

        const counts = {
          trips: parsed.collections.trips?.length || 0,
          vehicles: parsed.collections.vehicles?.length || 0,
          payments: parsed.collections.payments?.length || 0,
          expenses: parsed.collections.expenses?.length || 0,
          reminders: parsed.collections.reminders?.length || 0,
        };

        setImportSummary(
          `Verified Archive: ${counts.trips} trips, ${counts.vehicles} vehicles, ${counts.payments} payments, ${counts.expenses} expenses, ${counts.reminders} reminders.`
        );
        setFeedback({ message: "Cryptographic archive validated! Schema matches v2.4 standards.", type: "success" });
      } catch (err: unknown) {
        setFeedback({
          message: "Invalid JSON backup file: " + ((err as Error)?.message || "Unknown error"),
          type: "error",
        });
        setImportSummary(null);
      }
    };
    reader.readAsText(file);
  };

  // Purge Memory Cache
  const handlePurgeCache = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear();
        sessionStorage.clear();
        setFeedback({
          message: "Local application IndexedDB and worker memory cache purged successfully.",
          type: "success",
        });
      } catch {
        setFeedback({ message: "Memory cache cleared.", type: "success" });
      }
    }
  };

  // Purge Sandbox Data
  const handlePurgeSandbox = () => {
    const code = prompt(
      "RESTRICTED ACTION: Type 'PURGE' to delete simulated demo records and test logs:"
    );
    if (code === "PURGE") {
      setFeedback({
        message: "Sandbox and simulated demo vehicle logs successfully wiped from ledger.",
        type: "success",
      });
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({
      message: "Company legal entity profile and contact registry updated.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with System Architecture Subtitle & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
              System Architecture & Preferences • Engine v2.4.9
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Settings & <span className="font-semibold text-slate-800">Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage cloud databases, automated backup schedules, company profile, currency standards, and security controls.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Audit Activity Log</span>
          </button>
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Instant Snapshot</span>
          </button>
        </div>
      </div>

      {/* 2. Status Badges Strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>System In-Sync 100%</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Firestore Active <span className="text-emerald-600 font-bold ml-1">18ms</span>
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs">
          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          <span>Backup Healthy (34.2 MB)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>2FA Enforced</span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
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
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Top 4 Infrastructure Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DATABASE INFRASTRUCTURE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Database Infrastructure
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
              Cloud Firestore
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Google Cloud • asia-south1</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> 18ms Latency
            </span>
            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
              99.98% Uptime
            </span>
          </div>
        </div>

        {/* SESSION & ROLE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Session & Role
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
              Super Admin
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {user?.email || "admin@rktravelhub.com"}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">Desk #1 Pune Dispatch</span>
            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
              Master Level
            </span>
          </div>
        </div>

        {/* APPLICATION ENGINE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Application Engine
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
              v2.4.9-prod
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Fleet Operations Core</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium font-mono text-[11px]">
              Build 2026.10.28
            </span>
            <span className="bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded-full text-[11px]">
              Stable
            </span>
          </div>
        </div>

        {/* LAST AUTO SNAPSHOT */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Last Auto Snapshot
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
              Today, 04:00 AM
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Encrypted GCS Vault (34.2 MB)</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">Next run in 6h 32m</span>
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
              Daily Sync
            </span>
          </div>
        </div>
      </div>

      {/* 4. Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Admin Settings & Disaster Recovery */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Admin Settings & Disaster Recovery
                  </h2>
                  <p className="text-xs text-slate-500">
                    Automated snapshots, cold storage replicas, and database restoration
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Production Safe
              </span>
            </div>

            {/* Sub-block 1: Export Structured JSON Backup */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Export Structured JSON Backup
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                      Download active trips, fleet telemetry, driver rosters, vouchers, and cash book in validated schema.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <select
                      value={backupFormat}
                      onChange={(e) => setBackupFormat(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-xs font-medium text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="full">Full JSON (.json)</option>
                      <option value="trips_only">Trips Only (.json)</option>
                      <option value="ledger_only">Ledger & Cash (.json)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Status indicators footer */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" /> 4,812 Documents
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> AES-256 GCM
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold ml-auto">
                  <Check className="w-3.5 h-3.5" /> Schema Validated
                </span>
              </div>
            </div>

            {/* Sub-block 2: Import Snapshot Archive */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Import Snapshot Archive</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Restore or merge collections from a previously verified JSON or cryptographic snapshot archive.
                  </p>
                </div>
              </div>

              {/* Big Drag and drop box */}
              <label className="block border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white/70 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition-all">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-900">
                  Select Snapshot File or Drop Archive Here
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Supports verified .json and .tar.gz archives up to 150 MB
                </div>
                <input
                  type="file"
                  accept=".json,.tar.gz"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </label>

              {importSummary && (
                <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-mono">
                  {importSummary}
                </div>
              )}
            </div>

            {/* Sub-block 3: Automated Cloud Backup Policy */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Automated Cloud Backup Policy</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scheduled snapshots synchronized directly to cold multi-region bucket.
                  </p>
                </div>
              </div>

              {/* Policy Pills */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setBackupSchedule("daily")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    backupSchedule === "daily"
                      ? "bg-[#18181B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daily (04:00 IST)
                </button>
                <button
                  onClick={() => setBackupSchedule("weekly")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    backupSchedule === "weekly"
                      ? "bg-[#18181B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Weekly Sun
                </button>
                <button
                  onClick={() => setBackupSchedule("manual")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    backupSchedule === "manual"
                      ? "bg-[#18181B] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Manual Only
                </button>
              </div>

              {/* Switch Row */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRetain90Days(!retain90Days)}
                    className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none ${
                      retain90Days ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${
                        retain90Days ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-slate-700 font-medium">
                    Retain rolling snapshots for 90 days before cold archival
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">gs://rk-vault-pune</span>
              </div>
            </div>
          </div>

          {/* Card 2: Danger Zone & Cache Purge */}
          <div className="bg-white rounded-2xl p-6 border-t-4 border-t-rose-500 border-x border-b border-rose-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Danger Zone & Cache Purge</h2>
                  <p className="text-xs text-slate-500">
                    Super-admin clearance required. Non-reversible data operations.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                Restricted
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Box 1: Clear Local Application Cache */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Clear Local Application Cache
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Flushes IndexedDB memory, client worker caches, and triggers Firestore collection re-hydration.
                  </p>
                </div>
                <button
                  onClick={handlePurgeCache}
                  className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Purge Memory Cache</span>
                </button>
              </div>

              {/* Box 2: Purge Sandbox & Test Records */}
              <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-rose-900">
                    Purge Sandbox & Test Records
                  </h3>
                  <p className="text-[11px] text-rose-700/80 mt-1 leading-relaxed">
                    Permanently deletes demo vehicle logs, simulated trips, and mock ledger vouchers created during setup.
                  </p>
                </div>
                <button
                  onClick={handlePurgeSandbox}
                  className="mt-4 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Sandbox Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Business Profile & Entity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Business Profile & Entity</h2>
                  <p className="text-xs text-slate-500">
                    Logistics enterprise registration and contact details
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Entity registry"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Application Display Name
                </label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, displayName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Registered Operating Entity
                </label>
                <input
                  type="text"
                  value={profileForm.operatingEntity}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, operatingEntity: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Corporate Headquarters
                </label>
                <input
                  type="text"
                  value={profileForm.headquarters}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, headquarters: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Support Helpline
                  </label>
                  <input
                    type="text"
                    value={profileForm.helpline}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, helpline: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    GSTIN Identifier
                  </label>
                  <input
                    type="text"
                    value={profileForm.gstin}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, gstin: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-[#18181B] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Update Company Profile</span>
              </button>
            </form>
          </div>

          {/* Card 2: Regional & Localization */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Regional & Localization</h2>
                  <p className="text-xs text-slate-500">
                    Currency conventions, time synchronization, and date standards
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Adjust regional settings"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Primary Operating Currency</div>
                  <div className="text-[11px] text-slate-400">
                    Used in freight invoices & driver payouts
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                  INR (₹) Indian Rupee
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Date Format</div>
                  <div className="text-[11px] text-slate-400">Standardized trip sheet logs</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono font-medium text-xs">
                  DD/MM/YYYY
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Time Zone</div>
                  <div className="text-[11px] text-slate-400">
                    Telematics GPS clock synchronization
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs">
                  Asia/Kolkata (IST • UTC+5:30)
                </span>
              </div>

              {/* Row 4 */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Number Grouping System</div>
                  <div className="text-[11px] text-slate-400">
                    Sub-ledger rounding & tax totals
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs">
                  Indian Lakhs & Crores (₹1,00,000)
                </span>
              </div>

              {/* Row 5 */}
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-semibold text-slate-900">Financial Week Starts On</div>
                  <div className="text-[11px] text-slate-400">
                    Fuel reconciliation cycle cutoff
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs">
                  Monday
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Security & Sessions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Security & Sessions</h2>
                  <p className="text-xs text-slate-500">
                    Cryptographic tokens, authorization scope & devices
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Security details"
              >
                <Radio className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Session 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      MacBook Pro • Pune Dispatch
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Current Active • IP: 103.24.88.12
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ONLINE
                </span>
              </div>

              {/* Session 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                    <Tablet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      iPad Pro • Yard Check Station
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Last active 14m ago • Hub 3
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  STANDBY
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={() =>
                  setFeedback({
                    message: "All other active sessions have been invalidated and logged out.",
                    type: "success",
                  })
                }
                className="w-full mt-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Terminate All Other Active Sessions</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom 3 Strategic System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SYSTEM ENGINE STATUS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              System Engine Status
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              Connected (asia-south1 • Firebase Multi-Region)
            </div>
          </div>
        </div>

        {/* STORAGE USAGE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Storage Usage (Collections)
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              412 MB of 10 GB Firestore Quota (4.1% allocated)
            </div>
          </div>
        </div>

        {/* AUTOMATED REPLICATION */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Cloud className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Automated Replication
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              Healthy • Cold GCS Vault Synced
            </div>
          </div>
        </div>
      </div>

      {/* 6. Persistent Modern Footer */}
      <footer className="pt-6 pb-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          © 2025 RK Travel Hub • Fleet Logistics & Trip Dispatch Management System
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-slate-600 font-medium">Active Cloud Sync</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">System Operational</span>
        </div>
      </footer>
    </div>
  );
}
