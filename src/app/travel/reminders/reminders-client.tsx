"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Plus,
  Shield,
  Wrench,
  FileText,
  UserCheck,
  ChevronDown,
  Trash2,
  Pencil,
  MoreVertical,
  Calendar,
  Zap,
  Car,
  FileCheck,
  ShieldCheck,
  X,
  Filter,
} from "lucide-react";
import type { Reminder, ReminderCategory, ReminderStatus, Trip, Vehicle } from "@/types";
import {
  createReminder,
  updateReminder,
  toggleReminderStatus,
  deleteReminder,
} from "@/services/reminders.service";

interface RemindersClientProps {
  initialReminders: Reminder[];
  trips: Trip[];
  vehicles: Vehicle[];
}

export interface ReminderItem {
  id: string;
  dueDate: string;
  title: string;
  subtitle?: string;
  category: "Insurance" | "Vehicle Service" | "Compliance" | "Permit" | "Driver Compliance" | "Maintenance";
  vehicleReg: string;
  vehicleModel: string;
  vehicleImage: string;
  isDriver?: boolean;
  status: "upcoming" | "overdue" | "completed";
  reminderType: "one_time" | "repeat";
  notes?: string;
  isCustom?: boolean;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return dateStr;
    const dayFormatted = String(d.getDate()).padStart(2, "0");
    const monthShort = d.toLocaleDateString("en-US", { month: "short" });
    return `${dayFormatted} ${monthShort} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getDefaultDueDate(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

export default function RemindersClient({
  initialReminders,
  vehicles,
}: RemindersClientProps) {
  // Convert initialReminders from Firestore into ReminderItem format (strictly real data)
  const [items, setItems] = useState<ReminderItem[]>(() => {
    if (!initialReminders || initialReminders.length === 0) {
      return [];
    }

    return initialReminders.map((r) => {
      const matchedVeh = vehicles.find((v) => v.id === r.relatedEntityId);
      let cat: ReminderItem["category"] = "Vehicle Service";
      if (r.category === "documents") cat = "Insurance";
      else if (r.category === "driver") cat = "Driver Compliance";
      else if (r.category === "vehicle_service") cat = "Vehicle Service";

      const todayStr = new Date().toISOString().split("T")[0];
      const isOverdue = r.status === "overdue" || (r.status === "pending" && r.dueDate < todayStr);

      return {
        id: r.id,
        dueDate: r.dueDate,
        title: r.title,
        subtitle: r.notes?.slice(0, 30) || `${cat} reminder`,
        category: cat,
        vehicleReg: matchedVeh ? matchedVeh.registrationNumber : "Fleet Asset",
        vehicleModel: matchedVeh ? matchedVeh.name : "Commercial Vehicle",
        vehicleImage: matchedVeh?.photoUrl || "/images/fleet-volvo.jpg",
        status: r.status === "completed" ? "completed" : isOverdue ? "overdue" : "upcoming",
        reminderType: "one_time",
        notes: r.notes || "",
        isCustom: true,
      };
    });
  });

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form State
  const initialFormState = {
    title: "",
    category: "Vehicle Service" as ReminderItem["category"],
    relatedVehicleId: vehicles[0]?.id || "",
    dueDate: getDefaultDueDate(6),
    reminderType: "one_time" as "one_time" | "repeat",
    notes: "",
  };

  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // Template Quick-Click Handler
  const handleApplyTemplate = (
    type: "insurance" | "fitness" | "service" | "license"
  ) => {
    if (type === "insurance") {
      setForm({
        title: "Insurance Renewal",
        category: "Insurance",
        relatedVehicleId: vehicles[0]?.id || "",
        dueDate: getDefaultDueDate(30),
        reminderType: "one_time",
        notes: "Vehicle insurance expiry & policy renewal document submission.",
      });
    } else if (type === "fitness") {
      setForm({
        title: "Fitness Certificate",
        category: "Compliance",
        relatedVehicleId: vehicles[1]?.id || vehicles[0]?.id || "",
        dueDate: getDefaultDueDate(21),
        reminderType: "one_time",
        notes: "RC fitness renewal & RTO annual vehicle inspection clearance.",
      });
    } else if (type === "service") {
      setForm({
        title: "Periodic Service",
        category: "Vehicle Service",
        relatedVehicleId: vehicles[0]?.id || "",
        dueDate: getDefaultDueDate(14),
        reminderType: "one_time",
        notes: "Engine oil, fuel filter change & 10,000 km routine brake inspection.",
      });
    } else if (type === "license") {
      setForm({
        title: "Driver License",
        category: "Driver Compliance",
        relatedVehicleId: "",
        dueDate: getDefaultDueDate(15),
        reminderType: "one_time",
        notes: "Driver commercial license expiry & medical verification renewal.",
      });
    }

    setEditingId(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFeedback({ message: "Please enter a reminder title", type: "error" });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const itemStatus: "upcoming" | "overdue" = form.dueDate < todayStr ? "overdue" : "upcoming";

    const matchedVeh = vehicles.find((v) => v.id === form.relatedVehicleId);
    let vehicleReg = matchedVeh ? matchedVeh.registrationNumber : "KL 07 CF 2211";
    let vehicleModel = matchedVeh ? matchedVeh.name : "Fleet Vehicle";
    let vehicleImage = matchedVeh?.photoUrl || "/images/fleet-crysta.jpg";
    let isDriver = false;

    if (form.category === "Driver Compliance") {
      vehicleReg = "Rajesh Kumar";
      vehicleModel = "Driver";
      vehicleImage = "/images/driver-rajesh.jpg";
      isDriver = true;
    }

    try {
      if (editingId) {
        // Update existing item
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  title: form.title.trim(),
                  category: form.category,
                  dueDate: form.dueDate,
                  reminderType: form.reminderType,
                  notes: form.notes.trim(),
                  vehicleReg,
                  vehicleModel,
                  vehicleImage,
                  isDriver,
                  status: item.status === "completed" ? "completed" : itemStatus,
                }
              : item
          )
        );

        try {
          let fsCat: ReminderCategory = "vehicle_service";
          if (form.category === "Insurance" || form.category === "Compliance" || form.category === "Permit") {
            fsCat = "documents";
          } else if (form.category === "Driver Compliance") {
            fsCat = "driver";
          }
          await updateReminder(editingId, {
            title: form.title.trim(),
            dueDate: form.dueDate,
            category: fsCat,
            notes: form.notes.trim(),
          });
        } catch {
          // Local update succeeded even if offline
        }

        setFeedback({ message: "Reminder updated successfully!", type: "success" });
        setEditingId(null);
      } else {
        // Create new reminder
        let firestoreId = `custom-${Date.now()}`;
        try {
          let fsCat: ReminderCategory = "vehicle_service";
          if (form.category === "Insurance" || form.category === "Compliance" || form.category === "Permit") {
            fsCat = "documents";
          } else if (form.category === "Driver Compliance") {
            fsCat = "driver";
          }

          firestoreId = await createReminder({
            title: form.title.trim(),
            dueDate: form.dueDate,
            category: fsCat,
            relatedEntityType: form.category,
            relatedEntityId: form.relatedVehicleId || undefined,
            notes: form.notes.trim(),
            status: itemStatus === "overdue" ? "overdue" : "pending",
          });
        } catch {
          // Local fallback
        }

        const newItem: ReminderItem = {
          id: firestoreId,
          dueDate: form.dueDate,
          title: form.title.trim(),
          subtitle: form.notes.trim() ? form.notes.trim().slice(0, 32) : `${form.category} alert`,
          category: form.category,
          vehicleReg,
          vehicleModel,
          vehicleImage,
          isDriver,
          status: itemStatus,
          reminderType: form.reminderType,
          notes: form.notes.trim(),
          isCustom: true,
        };

        setItems((prev) => [newItem, ...prev]);
        setFeedback({ message: "Reminder created successfully!", type: "success" });
      }

      setForm(initialFormState);
    } catch (err: unknown) {
      console.error(err);
      setFeedback({ message: "Failed to save reminder", type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Edit existing item
  const handleStartEdit = (item: ReminderItem) => {
    setEditingId(item.id);
    const matched = vehicles.find((v) => v.registrationNumber === item.vehicleReg);
    setForm({
      title: item.title,
      category: item.category,
      relatedVehicleId: matched?.id || vehicles[0]?.id || "",
      dueDate: item.dueDate,
      reminderType: item.reminderType,
      notes: item.notes || "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Toggle complete / pending
  const handleToggleStatus = async (item: ReminderItem) => {
    setActiveMenuId(null);
    const nextStatus = item.status === "completed" ? "upcoming" : "completed";
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
    );

    try {
      await toggleReminderStatus(item.id, item.status === "completed" ? "completed" : "pending");
    } catch {
      // Local state is already updated
    }
  };

  // Delete reminder
  const handleDelete = async (id: string) => {
    setActiveMenuId(null);
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteReminder(id);
    } catch {
      // Local state is already updated
    }
  };

  // KPIs
  const totalCount = items.length;
  const overdueCount = items.filter((i) => i.status === "overdue").length;
  const upcomingCount = items.filter((i) => i.status === "upcoming").length;
  const completedCount = items.filter((i) => i.status === "completed").length;

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.vehicleReg.toLowerCase().includes(q) ||
        item.vehicleModel.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" ||
        item.category.toLowerCase().replace(/\s+/g, "") ===
          categoryFilter.toLowerCase().replace(/\s+/g, "");

      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  // Category Icon helper
  const renderCategoryIcon = (category: ReminderItem["category"]) => {
    switch (category) {
      case "Insurance":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "Vehicle Service":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case "Compliance":
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case "Permit":
        return <FileCheck className="w-4 h-4 text-purple-500" />;
      case "Driver Compliance":
        return <UserCheck className="w-4 h-4 text-rose-500" />;
      case "Maintenance":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  // Category Badge Style helper
  const getCategoryBadgeClass = (category: ReminderItem["category"]) => {
    switch (category) {
      case "Insurance":
        return "bg-[#EBF3FE] text-[#1A68F8] border border-blue-200/60";
      case "Vehicle Service":
        return "bg-[#FFF7ED] text-[#D97706] border border-amber-200/60";
      case "Compliance":
        return "bg-[#ECFDF5] text-[#059669] border border-emerald-200/60";
      case "Permit":
        return "bg-[#F5F3FF] text-[#7C3AED] border border-purple-200/60";
      case "Driver Compliance":
        return "bg-[#FFF1F2] text-[#E11D48] border border-rose-200/60";
      case "Maintenance":
        return "bg-[#FFFBEB] text-[#D97706] border border-amber-200/60";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER
             Expanded bottom padding so the 4 KPI cards float halfway
             over the bottom of the scenic workshop & mountain highway!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[300px] sm:min-h-[330px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Photographic Panoramic Workshop Background with Luxury Coach & Alpine Lake */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/reminders-scenic-hero.jpg')",
            backgroundPosition: "center 42%",
          }}
        >
          <Image
            src="/images/reminders-scenic-hero.jpg"
            alt="Fleet Maintenance & Compliance Workshop"
            fill
            priority
            unoptimized
            className="object-cover object-[center_42%]"
          />
          {/* Subtle directional gradient on left for crystal clear typography, leaving the bus & mountains 100% bright */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/90 via-slate-950/45 to-transparent pointer-events-none" />
        </div>

        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop) */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2.5 flex-wrap w-full">
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(initialFormState);
              formRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>+ Add Reminder</span>
          </button>
        </div>

        {/* Hero Bottom Row: Title on Left, Floating Glass Widget on Right */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Left Title Block */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-slate-900/80 backdrop-blur-md border border-white/20 p-0.5 relative shrink-0 shadow-sm">
                <Image
                  src="/images/rk-logo.png"
                  alt="RK Travel Hub"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
                FLEET COMPLIANCE &amp; MAINTENANCE
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              Reminders &amp; <span className="text-[#38BDF8]">Schedules</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow leading-relaxed">
              Monitor preventive maintenance schedules, fitness certificates, insurance expiries, permits, and driver compliance deadlines.
            </p>
          </div>

          {/* Right Floating Dark Glass Indicator Card (from mockup) */}
          <div className="hidden sm:flex flex-col gap-2 p-3.5 rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 text-white shadow-xl min-w-[210px]">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Wrench className="w-3 h-3 text-sky-300" />
              </div>
              <span>Prevent Breakdowns</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <FileCheck className="w-3 h-3 text-emerald-300" />
              </div>
              <span>Stay Compliant</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3 text-blue-300" />
              </div>
              <span>Keep Your Fleet Safe</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/95">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Clock className="w-3 h-3 text-amber-300" />
              </div>
              <span>Never Miss a Deadline</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
             Positioned with -mt-10 sm:-mt-12 lg:-mt-14 relative z-20
             to float halfway over the bottom of the scenic workshop!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {/* CARD 1: TOTAL ALERTS */}
        <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg transition-all flex items-center justify-between relative overflow-hidden h-[98px]">
          {/* Sparkline Wave: Blue */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-60">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20 L 100 40 L 0 40 Z" fill="url(#waveBlueGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#FFF7ED] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  TOTAL ALERTS
                </span>
                {totalCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                    {totalCount} Total
                  </span>
                )}
              </div>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Active reminders
              </span>
            </div>
          </div>

          <div className="self-end pb-1 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBF3FE] text-[#1A68F8] text-[10px] font-extrabold">
              {totalCount > 0 ? `${items.filter((i) => i.status !== "completed").length} Active` : "0 Active"}
            </span>
          </div>
        </div>

        {/* CARD 2: UPCOMING */}
        <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg transition-all flex items-center justify-between relative overflow-hidden h-[98px]">
          {/* Sparkline Wave: Light Blue */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-60">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveCyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 30 C 25 28, 45 36, 65 20 C 80 12, 90 24, 100 18" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 30 C 25 28, 45 36, 65 20 C 80 12, 90 24, 100 18 L 100 40 L 0 40 Z" fill="url(#waveCyanGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#EAF2FD] text-[#1A68F8] flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                UPCOMING
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {upcomingCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Scheduled this month
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between h-full py-1 z-10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBF3FE] text-[#1A68F8] text-[10px] font-extrabold">
              {upcomingCount > 0 ? "On Track" : "0 Scheduled"}
            </span>
          </div>
        </div>

        {/* CARD 3: COMPLETED */}
        <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg transition-all flex items-center justify-between relative overflow-hidden h-[98px]">
          {/* Sparkline Wave: Emerald */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-60">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 32 C 30 30, 45 16, 65 24 C 80 30, 90 18, 100 14" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 32 C 30 30, 45 16, 65 24 C 80 30, 90 18, 100 14 L 100 40 L 0 40 Z" fill="url(#waveGreenGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  COMPLETED
                </span>
                {completedCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                    {completedCount} Done
                  </span>
                )}
              </div>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {completedCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Serviced &amp; verified
              </span>
            </div>
          </div>

          <div className="self-end pb-1 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[10px] font-extrabold">
              {completedCount > 0 ? "Archived" : "0 Done"}
            </span>
          </div>
        </div>

        {/* CARD 4: OVERDUE ALERTS */}
        <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg transition-all flex items-center justify-between relative overflow-hidden h-[98px]">
          {/* Sparkline Wave: Red */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-60">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 36 C 20 32, 40 38, 60 22 C 75 14, 85 24, 100 16" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 36 C 20 32, 40 38, 60 22 C 75 14, 85 24, 100 16 L 100 40 L 0 40 Z" fill="url(#waveRedGrad)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#FFF1F2] text-[#EF4444] flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5 fill-rose-500/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  OVERDUE ALERTS
                </span>
                {overdueCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full">
                    Action Required
                  </span>
                )}
              </div>
              <span className="text-2xl sm:text-[26px] font-black text-rose-600 font-mono tracking-tight leading-none mt-1 block">
                {overdueCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400 block truncate mt-1">
                Past due reminders
              </span>
            </div>
          </div>

          <div className="self-end pb-1 z-10">
            <button
              type="button"
              onClick={() => setStatusFilter("overdue")}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer ${
                overdueCount > 0
                  ? "bg-[#FFF1F2] text-[#E11D48] hover:bg-rose-100"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {overdueCount > 0 ? "Needs Attention" : "Clear"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          3. QUICK REMINDER TEMPLATES (Horizontal Action Bar)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-[0_4px_16px_-3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Header */}
          <div className="flex items-center gap-3 shrink-0 lg:pr-4 lg:border-r lg:border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Zap className="w-5 h-5 fill-blue-600" />
            </div>
            <div>
              <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                Quick Reminder Templates
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add common reminders with one click
              </p>
            </div>
          </div>

          {/* 4 Clickable Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
            {/* Template 1: Insurance Renewal */}
            <button
              type="button"
              onClick={() => handleApplyTemplate("insurance")}
              className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-300 text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    Insurance Renewal
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Vehicle insurance expiry
                  </p>
                </div>
              </div>
              {/* Miniature Document SVG */}
              <div className="w-8 h-10 rounded bg-white border border-slate-200/80 p-1 flex flex-col justify-between shrink-0 shadow-2xs group-hover:rotate-2 transition-transform">
                <div className="h-1.5 w-full bg-blue-500 rounded-[1px]" />
                <div className="space-y-0.5">
                  <div className="h-0.5 w-3/4 bg-slate-300 rounded-[1px]" />
                  <div className="h-0.5 w-full bg-slate-200 rounded-[1px]" />
                  <div className="h-0.5 w-1/2 bg-slate-200 rounded-[1px]" />
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-400 self-end" />
              </div>
            </button>

            {/* Template 2: Fitness Certificate */}
            <button
              type="button"
              onClick={() => handleApplyTemplate("fitness")}
              className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                    Fitness Certificate
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    RC fitness renewal
                  </p>
                </div>
              </div>
              {/* Miniature Document SVG */}
              <div className="w-8 h-10 rounded bg-white border border-slate-200/80 p-1 flex flex-col justify-between shrink-0 shadow-2xs group-hover:rotate-2 transition-transform">
                <div className="h-1.5 w-full bg-emerald-500 rounded-[1px]" />
                <div className="space-y-0.5">
                  <div className="h-0.5 w-3/4 bg-slate-300 rounded-[1px]" />
                  <div className="h-0.5 w-full bg-slate-200 rounded-[1px]" />
                  <div className="h-0.5 w-2/3 bg-slate-200 rounded-[1px]" />
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-100 border border-emerald-400 self-end" />
              </div>
            </button>

            {/* Template 3: Periodic Service */}
            <button
              type="button"
              onClick={() => handleApplyTemplate("service")}
              className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 hover:bg-amber-50/50 border border-slate-200/70 hover:border-amber-300 text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                    Periodic Service
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Engine &amp; vehicle service
                  </p>
                </div>
              </div>
              {/* Miniature Invoice / Service SVG */}
              <div className="w-8 h-10 rounded bg-white border border-slate-200/80 p-1 flex flex-col justify-between shrink-0 shadow-2xs group-hover:rotate-2 transition-transform">
                <div className="h-1.5 w-full bg-amber-500 rounded-[1px]" />
                <div className="space-y-0.5">
                  <div className="h-0.5 w-3/4 bg-slate-300 rounded-[1px]" />
                  <div className="h-0.5 w-full bg-slate-200 rounded-[1px]" />
                  <div className="h-0.5 w-1/2 bg-slate-200 rounded-[1px]" />
                </div>
                <div className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400 self-end" />
              </div>
            </button>

            {/* Template 4: Driver License */}
            <button
              type="button"
              onClick={() => handleApplyTemplate("license")}
              className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 hover:bg-purple-50/50 border border-slate-200/70 hover:border-purple-300 text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                    Driver License
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Driver document expiry
                  </p>
                </div>
              </div>
              {/* Miniature Smart Card SVG */}
              <div className="w-9 h-7 rounded bg-white border border-slate-200/80 p-1 flex items-center justify-between shrink-0 shadow-2xs group-hover:rotate-2 transition-transform">
                <div className="w-3 h-4 rounded bg-purple-100 border border-purple-300 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                </div>
                <div className="space-y-0.5 flex-1 pl-1">
                  <div className="h-0.5 w-3/4 bg-slate-400 rounded-[1px]" />
                  <div className="h-0.5 w-full bg-slate-200 rounded-[1px]" />
                  <div className="h-0.5 w-1/2 bg-slate-300 rounded-[1px]" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN 2-COLUMN SECTION: ADD REMINDER & ALL REMINDERS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Add Reminder Form (approx 38%) ════ */}
        <div
          ref={formRef}
          className="lg:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_16px_-3px_rgba(15,23,42,0.04)] space-y-4"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {editingId ? "Edit Reminder" : "Add Reminder"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Schedule fleet maintenance, permits, or compliance deadline
                </p>
              </div>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialFormState);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
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
            {/* Row 1: Reminder Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reminder Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oil & Filter Service..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 pointer-events-none text-slate-500">
                    <Car className="w-4 h-4" />
                  </div>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as ReminderItem["category"],
                      })
                    }
                    className="w-full h-10 pl-9 pr-7 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all cursor-pointer"
                  >
                    <option value="Vehicle Service">Vehicle Service</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Compliance">Compliance (Fitness)</option>
                    <option value="Permit">Permit Renewal</option>
                    <option value="Driver Compliance">Driver Compliance</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Related Vehicle & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Related Vehicle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Related Vehicle <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 pointer-events-none text-slate-400">
                    <Car className="w-4 h-4" />
                  </div>
                  <select
                    value={form.relatedVehicleId}
                    onChange={(e) =>
                      setForm({ ...form, relatedVehicleId: e.target.value })
                    }
                    className="w-full h-10 pl-9 pr-7 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all cursor-pointer"
                  >
                    <option value="">-- No vehicle selected --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.name})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Reminder Type Pill Toggle (from mockup) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reminder Type
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reminderType: "one_time" })}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.reminderType === "one_time"
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>One Time</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reminderType: "repeat" })}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.reminderType === "repeat"
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Repeat</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Add notes or instructions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.75]" />
                <span>{editingId ? "Update Reminder" : "+ Add Reminder"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ════ RIGHT COLUMN: All Reminders List & Table (approx 62%) ════ */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_16px_-3px_rgba(15,23,42,0.04)] space-y-4">
          {/* Card Header & Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-2">
            {/* Header Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    All Reminders
                  </h2>
                  <span className="text-xs font-bold text-slate-500">
                    ({filteredItems.length})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  View, search and manage all reminders
                </p>
              </div>
            </div>

            {/* Toolbar: Search + Category + Status + Menu */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Input */}
              <div className="relative min-w-[150px] sm:min-w-[170px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 pl-3 pr-7 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 appearance-none focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="all">All Categories</option>
                  <option value="insurance">Insurance</option>
                  <option value="vehicleservice">Vehicle Service</option>
                  <option value="compliance">Compliance</option>
                  <option value="permit">Permit</option>
                  <option value="drivercompliance">Driver Compliance</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 pl-3 pr-7 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 appearance-none focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Reset filter button if any active */}
              {(search || categoryFilter !== "all" || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Clear filters"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Container with Horizontal Scroll on small screens */}
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-bold">DUE DATE</th>
                  <th className="py-2.5 px-3 font-bold">TITLE</th>
                  <th className="py-2.5 px-3 font-bold">CATEGORY</th>
                  <th className="py-2.5 px-3 font-bold">VEHICLE / DRIVER</th>
                  <th className="py-2.5 px-3 font-bold">STATUS</th>
                  <th className="py-2.5 px-3 text-right font-bold pr-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          {items.length === 0 ? "No reminders scheduled yet" : "No reminders match your criteria"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {items.length === 0
                            ? "Use the form on the left or click a quick template above to schedule your first reminder."
                            : "Try adjusting your search query, or clear the category and status filters."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isOverdue = item.status === "overdue";
                    const isCompleted = item.status === "completed";

                    return (
                      <tr
                        key={item.id}
                        className={`group hover:bg-slate-50/70 transition-colors ${
                          isCompleted ? "opacity-60" : ""
                        }`}
                      >
                        {/* Due Date */}
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {formatDisplayDate(item.dueDate)}
                        </td>

                        {/* Title with Category Icon */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-[160px]">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              {renderCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isCompleted ? "line-through text-slate-400" : "text-slate-900"
                                }`}
                              >
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getCategoryBadgeClass(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Vehicle / Driver */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-7 rounded-lg overflow-hidden bg-slate-100 relative shrink-0 border border-slate-200/80 shadow-2xs">
                              <Image
                                src={item.vehicleImage}
                                alt={item.vehicleReg}
                                fill
                                unoptimized
                                className={`object-cover ${
                                  item.isDriver ? "object-top" : "object-center"
                                }`}
                              />
                            </div>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-slate-900">
                                {item.vehicleReg}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.vehicleModel}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isCompleted ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-emerald-200/60">
                              Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-rose-200/60">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3FE] text-[#1A68F8] border border-blue-200/60">
                              Upcoming
                            </span>
                          )}
                        </td>

                        {/* Actions (Pencil & 3 Dots) */}
                        <td className="py-3 px-3 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 relative">
                            {/* Edit Pencil Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="w-7 h-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit reminder"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* 3-dots Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuId(activeMenuId === item.id ? null : item.id)
                                }
                                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                                title="More actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Popover */}
                              {activeMenuId === item.id && (
                                <div className="absolute right-0 top-8 z-30 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-left">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(item)}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{isCompleted ? "Mark Pending" : "Mark Done"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(item.id)}
                                    className="w-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
