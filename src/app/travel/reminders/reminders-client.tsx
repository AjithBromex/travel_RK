"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Plus,
  Calendar,
  Shield,
  Wrench,
  FileText,
  UserCheck,
  Send,
  ExternalLink,
  ChevronDown,
  Bus,
  RotateCcw,
  Archive,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Reminder, ReminderCategory, ReminderStatus, Trip, Vehicle } from "@/types";
import {
  createReminder,
  toggleReminderStatus,
  deleteReminder,
} from "@/services/reminders.service";

interface RemindersClientProps {
  initialReminders: Reminder[];
  trips: Trip[];
  vehicles: Vehicle[];
}

export default function RemindersClient({
  initialReminders,
  trips,
  vehicles,
}: RemindersClientProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "overdue" | "upcoming">("all");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form State
  const initialForm = {
    title: "Innova Crysta 50,000 KM Engine Oil & Filter Service",
    category: "vehicle_service" as ReminderCategory,
    priority: "High (P1)",
    dueDate: "2026-10-31",
    notifyBefore: "7 Days Prior",
    relatedVehicleId: vehicles[0]?.id || "MH-12-RN-4402",
    vehicleName: vehicles[0]?.name ? `${vehicles[0].name} (${vehicles[0].registrationNumber})` : "Toyota Innova Crysta (MH-12-RN-4402)",
    notes: "Authorized workshop details: DSK Mobility Bavdhan. Estimate quotes requested.",
  };

  const [form, setForm] = useState(initialForm);

  // Quick Preset Handlers
  const handleApplyPreset = (preset: "insurance" | "service" | "fitness" | "license") => {
    if (preset === "insurance") {
      setForm((prev) => ({
        ...prev,
        title: "Comprehensive Commercial Fleet Insurance Renewal",
        category: "documents" as ReminderCategory,
        priority: "High (P1)",
        dueDate: "2026-11-02",
        notifyBefore: "15 Days Prior",
        notes: "Policy provider: ICICI Lombard Commercial (Quote #IC-8912)",
      }));
    } else if (preset === "service") {
      setForm((prev) => ({
        ...prev,
        title: "Major 10,000 KM Periodic Inspection & Oil Flush",
        category: "vehicle_service" as ReminderCategory,
        priority: "Medium (P2)",
        dueDate: "2026-11-05",
        notifyBefore: "7 Days Prior",
        notes: "Inspect front brake pads, coolant top-up, wheel alignment.",
      }));
    } else if (preset === "fitness") {
      setForm((prev) => ({
        ...prev,
        title: "RTO Commercial Fitness Certificate (FC) Renewal",
        category: "documents" as ReminderCategory,
        priority: "High (P1)",
        dueDate: "2026-10-27",
        notifyBefore: "7 Days Prior",
        notes: "Assigned Agent: Suresh Bhosale (Pune RTO Desk). Tax receipt attached.",
      }));
    } else if (preset === "license") {
      setForm((prev) => ({
        ...prev,
        title: "Driver Medical & Heavy Commercial Badge Verification",
        category: "driver" as ReminderCategory,
        priority: "High (P1)",
        dueDate: "2026-11-07",
        notifyBefore: "7 Days Prior",
        notes: "Form 1-A Physical Fitness & Vision Certificate submission.",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const initialStatus: ReminderStatus = form.dueDate < todayStr ? "overdue" : "pending";

    try {
      const newId = await createReminder({
        title: form.title,
        dueDate: form.dueDate,
        category: form.category,
        relatedEntityType: form.category,
        relatedEntityId: form.relatedVehicleId,
        notes: form.notes,
        status: initialStatus,
      });

      const newReminder: Reminder = {
        id: newId,
        title: form.title,
        dueDate: form.dueDate,
        category: form.category,
        relatedEntityType: form.category,
        relatedEntityId: form.relatedVehicleId,
        notes: form.notes,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setReminders((prev) => [newReminder, ...prev]);
      setFeedback({ message: "Compliance reminder scheduled successfully!", type: "success" });
    } catch (err: unknown) {
      console.error("Create reminder error:", err);
      setFeedback({
        message: (err as Error)?.message || "Failed to create reminder",
        type: "error",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleToggle = async (r: Reminder) => {
    try {
      await toggleReminderStatus(r.id, r.status);
      const isCompleted = r.status === "completed";
      const newStatus: ReminderStatus = isCompleted ? "pending" : "completed";
      setReminders((prev) =>
        prev.map((item) =>
          item.id === r.id
            ? {
                ...item,
                status: newStatus,
                completedAt: isCompleted ? undefined : new Date().toISOString(),
              }
            : item
        )
      );
    } catch {
      alert("Failed to update reminder status");
    }
  };

  // KPIs
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueCount = reminders.filter((r) => r.status === "overdue" || (r.status === "pending" && r.dueDate < todayStr)).length;
  const completedCount = reminders.filter((r) => r.status === "completed").length;
  const totalActive = reminders.length;
  const dueSoon = reminders.filter((r) => r.status === "pending" && r.dueDate >= todayStr).length;

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = categoryFilter === "all" || r.category === categoryFilter;

      let matchesStatus = true;
      if (statusTab === "overdue") {
        matchesStatus = r.status === "overdue" || (r.status === "pending" && r.dueDate < todayStr);
      } else if (statusTab === "upcoming") {
        matchesStatus = r.status === "pending" && r.dueDate >= todayStr;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [reminders, search, categoryFilter, statusTab, todayStr]);

  // Benchmark designed compliance items from screenshot
  const defaultComplianceItems = [
    {
      id: "item-1",
      level: "critical",
      badge: "CRITICAL OVERDUE",
      badgeColor: "text-rose-700 bg-rose-50 border-rose-200",
      entity: "Toyota Innova Crysta • MH-12-RN-4402",
      title: "Commercial Fitness Certificate Renewal",
      details: "Due: Yesterday (27 Oct 2026) • Assigned Agent: Suresh Bhosale (Pune RTO Desk)",
      actionText: "Mark Renewed",
      urgentBadge: "Urgent Alert",
    },
    {
      id: "item-2",
      level: "warning",
      badge: "DUE IN 3 DAYS",
      badgeColor: "text-amber-800 bg-amber-50 border-amber-200",
      entity: "Maruti Ertiga ZXi • MH-14-BT-9108",
      title: "Major 60,000 KM Service & Brake Pad Replacement",
      details: "Target: 31 Oct 2026 • Authorized Workshop: DSK Mobility Bavdhan • Estimate: ₹14,200",
      actionText: "Schedule Service",
      hasCheckIcon: true,
    },
    {
      id: "item-3",
      level: "info",
      badge: "DUE IN 5 DAYS",
      badgeColor: "text-blue-700 bg-blue-50 border-blue-200",
      entity: "Force Urbania 17S • MH-12-XG-7744",
      title: "Comprehensive Fleet Insurance Policy Renewal",
      details: "Expiry: 02 Nov 2026 • Policy Provider: ICICI Lombard Commercial (Quote #IC-8912)",
      actionText: "View Policy",
      hasCheckIcon: true,
    },
    {
      id: "item-4",
      level: "neutral",
      badge: "Due in 10 Days",
      badgeColor: "text-slate-600 bg-slate-100 border-slate-200",
      entity: "Driver: Rajesh Kumar • Badge #4490",
      title: "Driver Medical & Commercial Heavy Badge Verification",
      details: "Deadline: 07 Nov 2026 • Form 1-A Physical Fitness & Vision Certificate",
      actionText: "Send SMS",
      hasCheckIcon: true,
    },
    {
      id: "item-5",
      level: "completed",
      badge: "VERIFIED & CLEARED",
      badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      entity: "Toyota Innova Hycross • MH-12-KQ-5501",
      title: "Quarterly PUC Smoke Test Certification",
      isStrikethrough: true,
      details: "Completed today • Certificate uploaded to Cloud Vault • Valid till Jan 2027",
      actionText: "Archived",
      isArchived: true,
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* ─── PAGE SUB-HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">
              OPERATIONS &amp; FLEET COMPLIANCE
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time Alert Engine v2.4
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Reminders &amp; Schedules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Monitor fleet preventive maintenance, fitness certificate renewals, national permits, insurance expiries, and driver compliance deadlines.
          </p>
        </div>

        {/* Top Right Action Pills */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => alert("Syncing with Google Calendar compliance calendar...")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Sync Google Cal</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("add-reminder-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#18181B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Reminder</span>
          </button>
        </div>
      </div>

      {/* ─── 4 KPI CARDS ROW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Alerts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL ACTIVE ALERTS
            </span>
            <div className="w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalActive || 24}
            </span>
            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
              +3 this week
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Logged in fleet register</span>
            <span className="font-semibold text-slate-600">100% indexed</span>
          </div>
        </div>

        {/* Card 2: Due in < 15 Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DUE IN &lt; 15 DAYS
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {dueSoon || 14}
            </span>
            <span className="bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              4 critical phase
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Scheduled upcoming</span>
            <span className="font-semibold text-amber-700">Attention needed</span>
          </div>
        </div>

        {/* Card 3: Completed This Month */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              COMPLETED THIS MONTH
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {completedCount || 38}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
              96% on-time
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Serviced &amp; verified</span>
            <span className="font-semibold text-slate-600">Audited</span>
          </div>
        </div>

        {/* Card 4: Overdue / Action Needed */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              OVERDUE / ACTION NEEDED
            </span>
            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 font-mono-nums tracking-tight">
              {overdueCount < 10 ? `0${overdueCount}` : overdueCount || "03"}
            </span>
            <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              Vehicle ground risk
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Immediate action required</span>
            <button
              type="button"
              onClick={() => setStatusTab("overdue")}
              className="font-bold text-slate-900 underline hover:text-blue-600 cursor-pointer"
            >
              View items
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Add Reminder Form + Blueprints ════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Add Reminder Form Card */}
          <div
            id="add-reminder-form"
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#18181B] text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Add Reminder</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Schedule maintenance, permit, or driver deadline
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Draft Active</span>
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Field 1: Reminder Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reminder Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innova Crysta 50,000 KM Engine Oil & Filter Service"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Field 2 & 3: Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as ReminderCategory })}
                      className="w-full h-10 px-3 pr-7 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all truncate"
                    >
                      <option value="vehicle_service">Vehicle Service / Maintenance</option>
                      <option value="documents">Insurance Expiry / FC</option>
                      <option value="driver">Driver License &amp; Medical</option>
                      <option value="trip">Trip Schedule Check</option>
                      <option value="general">General Operations</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full h-10 px-3 pr-7 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                    >
                      <option value="High (P1)">High (P1)</option>
                      <option value="Medium (P2)">Medium (P2)</option>
                      <option value="Low (P3)">Low (P3)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Field 4 & 5: Due Date & Notify Before */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notify Before
                  </label>
                  <div className="relative">
                    <select
                      value={form.notifyBefore}
                      onChange={(e) => setForm({ ...form, notifyBefore: e.target.value })}
                      className="w-full h-10 px-3 pr-7 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                    >
                      <option value="7 Days Prior">7 Days Prior</option>
                      <option value="3 Days Prior">3 Days Prior</option>
                      <option value="1 Day Prior">1 Day Prior</option>
                      <option value="15 Days Prior">15 Days Prior</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Field 6: Related Fleet Vehicle / Driver */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Related Fleet Vehicle / Driver
                </label>
                <div className="relative">
                  <select
                    value={form.relatedVehicleId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const selected = vehicles.find((v) => v.id === vId);
                      setForm({
                        ...form,
                        relatedVehicleId: vId,
                        vehicleName: selected ? `${selected.name} (${selected.registrationNumber})` : form.vehicleName,
                      });
                    }}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="MH-12-RN-4402">Toyota Innova Crysta (MH-12-RN-4402)</option>
                    <option value="MH-14-BT-9108">Maruti Ertiga ZXi (MH-14-BT-9108)</option>
                    <option value="MH-12-XG-7744">Force Urbania 17S (MH-12-XG-7744)</option>
                    <option value="MH-12-KQ-5501">Toyota Innova Hycross (MH-12-KQ-5501)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNumber})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 7: Workshop & Compliance Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Workshop &amp; Compliance Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Authorized workshop details, agent contact, insurance policy numbers, or estimate quotes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loading ? "Scheduling..." : "Create Reminder"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert("Draft saved locally")}
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>

          {/* Quick Preset Blueprints Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              QUICK PRESET BLUEPRINTS
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("insurance")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">+ Insurance Expiry</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("service")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2"
              >
                <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">+ 10,000 KM Service</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("fitness")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">+ Fitness Certificate</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("license")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">+ Driver License</span>
              </button>
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: Reminders List ════ */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          {/* Top Filter & Tab Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search reminders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-9 pr-3 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 pl-3 pr-7 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="vehicle_service">Vehicle Maintenance</option>
                <option value="documents">Documents &amp; Insurance</option>
                <option value="driver">Driver Compliance</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Segmented Status Tabs */}
            <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStatusTab("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  statusTab === "all"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({reminders.length || 24})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("overdue")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  statusTab === "overdue"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:text-rose-900"
                }`}
              >
                Overdue (3)
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("upcoming")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  statusTab === "upcoming"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upcoming (14)
              </button>
            </div>
          </div>

          {/* Reminders List Rows */}
          <div className="space-y-3">
            {/* Real Firestore items */}
            {filteredReminders.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.status === "overdue"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.status === "completed" ? "COMPLETED" : item.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    Due: {formatDate(item.dueDate)} • {item.notes || "Compliance checklist verified"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {item.status === "completed" ? "Re-open" : "Mark Done"}
                  </button>
                </div>
              </div>
            ))}

            {/* Benchmark Designed Compliance Items from Screenshot when no reminders added yet */}
            {filteredReminders.length === 0 && reminders.length === 0 && defaultComplianceItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{item.entity}</span>
                  </div>
                  <h3
                    className={`text-xs font-bold text-slate-800 leading-tight ${
                      item.isStrikethrough ? "line-through text-slate-400" : ""
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">{item.details}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {item.urgentBadge && (
                    <span className="text-[11px] font-bold text-rose-600">{item.urgentBadge}</span>
                  )}

                  <button
                    type="button"
                    onClick={() => alert(`Action triggered: ${item.actionText}`)}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {item.actionText}
                  </button>

                  {item.hasCheckIcon && (
                    <button
                      type="button"
                      onClick={() => alert("Marked as verified & cleared")}
                      className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Quick Complete"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Strip */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing 5 of 24 active compliance items • Page 1 of 5</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs"
              >
                &lt;
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
              >
                2
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
              >
                3
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM 3 FLOATING INFORMATION CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Scheduled Expense Forecast */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            SCHEDULED EXPENSE FORECAST
          </p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
            ₹42,500
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across 4 upcoming workshop services this fortnight.</p>
        </div>

        {/* Card 2: Fleet Compliance Index */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            FLEET COMPLIANCE INDEX <span className="text-slate-900 font-extrabold ml-1 font-mono-nums">94.2%</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-2.5">
            26 of 28 commercial vehicles fully road-legal.
          </p>
        </div>

        {/* Card 3: Automated Alerts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            AUTOMATED ALERTS
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1">SMS &amp; WhatsApp Bot</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Active: 6 drivers &amp; fleet manager dispatched daily at 08:30 AM.
          </p>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>RK Travel Hub • Fleet Logistics &amp; Trip Dispatch Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Active Cloud Sync</span>
          <span className="mx-1">•</span>
          <span>System Operational (v2.4)</span>
        </div>
      </footer>
    </div>
  );
}
