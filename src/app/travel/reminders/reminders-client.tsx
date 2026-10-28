"use client";

import { useState } from "react";
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const initialForm = {
    title: "",
    dueDate: new Date().toISOString().split("T")[0],
    category: "vehicle_service" as ReminderCategory,
    relatedEntityId: vehicles[0]?.id || "",
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

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
        relatedEntityId: form.relatedEntityId,
        notes: form.notes,
        status: initialStatus,
      });

      const newReminder: Reminder = {
        id: newId,
        title: form.title,
        dueDate: form.dueDate,
        category: form.category,
        relatedEntityType: form.category,
        relatedEntityId: form.relatedEntityId,
        notes: form.notes,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setReminders((prev) => [newReminder, ...prev]);
      setFeedback({ message: "Reminder added successfully!", type: "success" });
      setForm(initialForm);
    } catch (err: unknown) {
      console.error("Create reminder error:", err);
      setFeedback({ message: ((err as Error)?.message || "Failed to create reminder"), type: "error" });
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
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to delete reminder");
    }
  };

  // KPIs
  const todayStr = new Date().toISOString().split("T")[0];
  const totalCount = reminders.length;
  const completedCount = reminders.filter((r) => r.status === "completed").length;
  const overdueCount = reminders.filter(
    (r) => r.status !== "completed" && r.dueDate < todayStr
  ).length;
  const pendingCount = reminders.filter(
    (r) => r.status !== "completed" && r.dueDate >= todayStr
  ).length;

  const filteredReminders = reminders.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "completed") matchesStatus = r.status === "completed";
    else if (statusFilter === "overdue")
      matchesStatus = r.status !== "completed" && r.dueDate < todayStr;
    else if (statusFilter === "pending")
      matchesStatus = r.status !== "completed" && r.dueDate >= todayStr;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reminders"
        subtitle="Get notified about important due dates and schedules."
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reminders"
          value={totalCount}
          icon={Bell}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="All logged alerts"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle="Scheduled upcoming"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Resolved tasks"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          subtitle="Passed due date"
        />
      </div>

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Reminder Form */}
        <div className="lg:col-span-5 card">
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Add Reminder</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Schedule maintenance, document renewal, or driver reminders
                </p>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {feedback.type === "success" && <Check className="w-4 h-4" />}
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Reminder Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Innova Oil & Filter Service, Insurance renewal"
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Due Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  className="select"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as ReminderCategory })
                  }
                >
                  <option value="vehicle_service">Vehicle Service</option>
                  <option value="documents">Documents / Insurance</option>
                  <option value="trip">Trip Schedule</option>
                  <option value="driver">Driver Payment / License</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Contextual Related To field */}
            <div>
              <label className="label">Related Entity</label>
              {form.category === "vehicle_service" || form.category === "documents" ? (
                <select
                  className="select"
                  value={form.relatedEntityId}
                  onChange={(e) => setForm({ ...form, relatedEntityId: e.target.value })}
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registrationNumber})
                    </option>
                  ))}
                </select>
              ) : form.category === "trip" ? (
                <select
                  className="select"
                  value={form.relatedEntityId}
                  onChange={(e) => setForm({ ...form, relatedEntityId: e.target.value })}
                >
                  <option value="">Select trip...</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripNumber || t.id.slice(0, 8)}: {t.customerName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patil / Driver ID"
                  className="input"
                  value={form.relatedEntityId}
                  onChange={(e) => setForm({ ...form, relatedEntityId: e.target.value })}
                />
              )}
            </div>

            <div>
              <label className="label">Notes / Instructions</label>
              <textarea
                rows={3}
                placeholder="Details regarding service center, policy numbers, or special notes..."
                className="input py-2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-sm font-semibold justify-center shadow-md shadow-blue-500/25"
            >
              {loading ? (
                "Scheduling..."
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Create Reminder
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Reminders Table */}
        <div className="lg:col-span-7 card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Upcoming Reminders</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Showing {filteredReminders.length} of {reminders.length} items
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  className="input pl-8 py-1.5 text-xs w-40"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="select py-1.5 text-xs"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="vehicle_service">Vehicle Service</option>
                <option value="documents">Documents</option>
                <option value="trip">Trip</option>
                <option value="driver">Driver</option>
                <option value="general">General</option>
              </select>
              <select
                className="select py-1.5 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {filteredReminders.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No reminders found</p>
            </div>
          ) : (
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Due Date</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReminders.map((r) => {
                    const isCompleted = r.status === "completed";
                    const isOverdue = !isCompleted && r.dueDate < todayStr;

                    return (
                      <tr key={r.id} className={isCompleted ? "opacity-60 bg-slate-50/50" : ""}>
                        <td>
                          <div className={`font-semibold text-xs ${isCompleted ? "line-through text-slate-500" : "text-text-primary"}`}>
                            {r.title}
                          </div>
                          {r.notes && (
                            <div className="text-[10px] text-text-muted max-w-xs truncate">
                              {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="text-xs whitespace-nowrap">
                          <div className={isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}>
                            {formatDate(r.dueDate)}
                          </div>
                          {isOverdue && (
                            <span className="text-[9px] text-rose-600 font-bold uppercase">
                              Overdue
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {r.category.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <StatusBadge
                            status={isCompleted ? "completed" : isOverdue ? "overdue" : "pending"}
                            variant="reminder"
                          />
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleToggle(r)}
                              className={`p-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                                isCompleted
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                              }`}
                              title={isCompleted ? "Mark Pending" : "Mark Completed"}
                            >
                              {isCompleted ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-danger"
                              title="Delete Reminder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
