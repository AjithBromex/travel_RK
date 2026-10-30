"use client";

import { useState, useMemo } from "react";
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
  ChevronDown,
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
  vehicles,
}: RemindersClientProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "overdue" | "upcoming" | "completed">("all");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Clean initial form state
  const initialForm = {
    title: "",
    category: "vehicle_service" as ReminderCategory,
    dueDate: defaultDueDate,
    relatedVehicleId: vehicles[0]?.id || "",
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

  // Quick Preset Handlers
  const handleApplyPreset = (preset: "insurance" | "service" | "fitness" | "license") => {
    const today = new Date();
    if (preset === "insurance") {
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setForm((prev) => ({
        ...prev,
        title: "Commercial Fleet Insurance Renewal",
        category: "documents" as ReminderCategory,
        dueDate: in30Days,
        notes: "Comprehensive policy renewal & insurance certificate filing.",
      }));
    } else if (preset === "service") {
      const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setForm((prev) => ({
        ...prev,
        title: "Scheduled Periodic Oil & Brake Inspection",
        category: "vehicle_service" as ReminderCategory,
        dueDate: in14Days,
        notes: "Engine oil change, brake pad inspection, tyre pressure & alignment.",
      }));
    } else if (preset === "fitness") {
      const in21Days = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setForm((prev) => ({
        ...prev,
        title: "RTO Commercial Fitness Certificate (FC) Renewal",
        category: "documents" as ReminderCategory,
        dueDate: in21Days,
        notes: "RTO commercial inspection, tax slip verification, and FC renewal receipt.",
      }));
    } else if (preset === "license") {
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setForm((prev) => ({
        ...prev,
        title: "Driver Commercial License & Medical Verification",
        category: "driver" as ReminderCategory,
        dueDate: in10Days,
        notes: "Driver heavy vehicle badge verification and physical fitness certificate.",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFeedback({ message: "Please provide a title for the reminder", type: "error" });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const initialStatus: ReminderStatus = form.dueDate < todayStr ? "overdue" : "pending";

    try {
      const newId = await createReminder({
        title: form.title.trim(),
        dueDate: form.dueDate,
        category: form.category,
        relatedEntityType: form.category,
        relatedEntityId: form.relatedVehicleId || undefined,
        notes: form.notes.trim(),
        status: initialStatus,
      });

      const newReminder: Reminder = {
        id: newId,
        title: form.title.trim(),
        dueDate: form.dueDate,
        category: form.category,
        relatedEntityType: form.category,
        relatedEntityId: form.relatedVehicleId || undefined,
        notes: form.notes.trim(),
        status: initialStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setReminders((prev) => [newReminder, ...prev]);
      setFeedback({ message: "Reminder scheduled successfully!", type: "success" });
      setForm(initialForm);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      setFeedback({ message: "Reminder deleted successfully", type: "success" });
    } catch {
      setFeedback({ message: "Failed to delete reminder", type: "error" });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // KPIs
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueCount = reminders.filter(
    (r) => r.status === "overdue" || (r.status === "pending" && r.dueDate < todayStr)
  ).length;
  const completedCount = reminders.filter((r) => r.status === "completed").length;
  const totalActive = reminders.length;
  const dueSoon = reminders.filter(
    (r) => r.status === "pending" && r.dueDate >= todayStr
  ).length;

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchesCat = categoryFilter === "all" || r.category === categoryFilter;

      let matchesStatus = true;
      if (statusTab === "overdue") {
        matchesStatus =
          r.status === "overdue" || (r.status === "pending" && r.dueDate < todayStr);
      } else if (statusTab === "upcoming") {
        matchesStatus = r.status === "pending" && r.dueDate >= todayStr;
      } else if (statusTab === "completed") {
        matchesStatus = r.status === "completed";
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [reminders, search, categoryFilter, statusTab, todayStr]);

  return (
    <div className="space-y-6 pb-12">
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
              Real-Time Compliance Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Reminders &amp; Schedules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Monitor preventive maintenance schedules, fitness certificates, commercial insurance expiries, and driver compliance deadlines.
          </p>
        </div>

        {/* Top Right Action Pills */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("add-reminder-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#18181B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Reminder</span>
          </button>
        </div>
      </div>

      {/* ─── 4 DYNAMIC KPI CARDS ROW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Alerts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL ALERTS
            </span>
            <div className="w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalActive}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Active fleet reminders</span>
            <span className="font-semibold text-slate-600">Indexed</span>
          </div>
        </div>

        {/* Card 2: Due Soon */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              UPCOMING
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {dueSoon}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Scheduled upcoming</span>
            <span className="font-semibold text-blue-600">On Track</span>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              COMPLETED
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {completedCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Serviced &amp; verified</span>
            <span className="font-semibold text-emerald-700">Archived</span>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              OVERDUE ALERTS
            </span>
            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 font-mono-nums tracking-tight">
              {overdueCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5 text-slate-400 text-[11px]">
            <span>Past scheduled date</span>
            <button
              type="button"
              onClick={() => setStatusTab("overdue")}
              className="font-bold text-slate-900 underline hover:text-blue-600 cursor-pointer"
            >
              Filter overdue
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Blueprints + Add Reminder Form ════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Preset Blueprints Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              QUICK PRESET BLUEPRINTS
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("insurance")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">Insurance Renewal</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("service")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">Periodic Service</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("fitness")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">Fitness Cert (FC)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("license")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Driver License</span>
              </button>
            </div>
          </div>

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
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    Add Reminder
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Schedule fleet maintenance, permit, or driver deadline
                  </p>
                </div>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedback.type === "success" && <Check className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Reminder Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reminder Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oil & Filter Service, Insurance Renewal..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as ReminderCategory })
                    }
                    className="w-full h-10 px-3 pr-7 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer"
                  >
                    <option value="vehicle_service">Vehicle Service</option>
                    <option value="documents">Documents &amp; Insurance</option>
                    <option value="driver">Driver Compliance</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                />
              </div>

              {/* Related Vehicle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Vehicle (Optional)
                </label>
                <div className="relative">
                  <select
                    value={form.relatedVehicleId}
                    onChange={(e) => setForm({ ...form, relatedVehicleId: e.target.value })}
                    className="w-full h-10 px-3 pr-7 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all cursor-pointer"
                  >
                    <option value="">-- General / Non-Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNumber})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes &amp; Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter policy number, workshop name, or specific compliance details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-full bg-[#18181B] hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loading ? "Saving..." : "Create Reminder"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(initialForm)}
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </form>
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
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusTab === "all"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({reminders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("overdue")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusTab === "overdue"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:text-rose-900"
                }`}
              >
                Overdue ({overdueCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("upcoming")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusTab === "upcoming"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upcoming ({dueSoon})
              </button>
            </div>
          </div>

          {/* Reminders List Rows */}
          <div className="space-y-3">
            {filteredReminders.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold text-slate-700">No reminders found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {reminders.length === 0
                    ? "Schedule your first reminder or pick a quick blueprint on the left."
                    : "No reminders match your current search or tab filter."}
                </p>
                {(search || categoryFilter !== "all" || statusTab !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setStatusTab("all");
                    }}
                    className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              filteredReminders.map((item) => {
                const isOverdue =
                  item.status === "overdue" ||
                  (item.status === "pending" && item.dueDate < todayStr);
                const isCompleted = item.status === "completed";

                const matchedVehicle = vehicles.find((v) => v.id === item.relatedEntityId);
                const vehicleLabel = matchedVehicle
                  ? `${matchedVehicle.name} (${matchedVehicle.registrationNumber})`
                  : null;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isCompleted ? "COMPLETED" : isOverdue ? "OVERDUE" : "UPCOMING"}
                        </span>
                        {vehicleLabel && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {vehicleLabel}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            isCompleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        Due: {formatDate(item.dueDate)}
                        {item.notes ? ` • ${item.notes}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                          isCompleted
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isCompleted ? "Re-open" : "Mark Done"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>RK Travel Hub • Fleet Logistics &amp; Trip Dispatch Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Active Cloud Sync</span>
          <span className="mx-1">•</span>
          <span>System Operational</span>
        </div>
      </footer>
    </div>
  );
}
