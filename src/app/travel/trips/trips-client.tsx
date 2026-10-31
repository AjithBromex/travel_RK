"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  Download,
  CreditCard,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  MapPin,
  X,
  Edit2,
  Trash2,
  ArrowRight,
  Check,
  AlertCircle,
  LayoutGrid,
  List,
  RotateCcw,
  IndianRupee,
  Bus,
  Receipt,
  FileText,
  Calculator,
  Users,
  UserCheck,
  Navigation,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import {
  formatINR,
  formatDateShort,
  exportToCSV,
  calculateTripFare,
} from "@/lib/utils";
import type { Trip, Vehicle, TripStatus } from "@/types";
import {
  createTrip,
  updateTrip,
  deleteTrip,
} from "@/services/trips.service";

interface TripsClientProps {
  initialTrips: Trip[];
  vehicles: Vehicle[];
}

export default function TripsClient({ initialTrips, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips || []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const formRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const emptyForm = {
    tripDate: todayStr,
    vehicleId: vehicles[0]?.id || "",
    vehicleName: vehicles[0]?.name
      ? `${vehicles[0].name} (${vehicles[0].registrationNumber})`
      : "",
    driverName: "",
    driverAgreedPay: 0,
    customerName: "",
    customerPhone: "",
    from: "",
    to: "",
    startingKm: 0,
    endingKm: 0,
    includedKm: 100,
    extraKmRate: vehicles[0]?.extraKmRate || 25,
    baseFare: 0,
    advanceReceived: 0,
    status: "scheduled" as TripStatus,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Dynamic Real KPIs
  const totalTripsCount = trips.length;
  const todayTripsCount = trips.filter((t) => t.tripDate === todayStr).length;
  const completedTripsCount = trips.filter((t) => t.status === "completed").length;
  const completedPercent = totalTripsCount > 0 ? Math.round((completedTripsCount / totalTripsCount) * 100) : 0;
  const totalPendingDues = trips.reduce(
    (sum, t) => sum + (Number(t.customerBalance) > 0 ? Number(t.customerBalance) : 0),
    0
  );

  // Auto calculate fare
  const fareCalcs = useMemo(() => {
    const start = Number(form.startingKm) || 0;
    const end = Number(form.endingKm) || 0;
    const distance = Math.max(0, end - start);
    const included = Number(form.includedKm) || 0;
    const extraKm = Math.max(0, distance - included);
    const rate = Number(form.extraKmRate) || 0;
    const extraCharge = extraKm * rate;
    const base = Number(form.baseFare) || 0;
    const totalFare = base + extraCharge;
    const advance = Number(form.advanceReceived) || 0;
    const balance = Math.max(0, totalFare - advance);

    return {
      distance,
      extraKm,
      extraCharge,
      totalFare,
      balance,
    };
  }, [
    form.startingKm,
    form.endingKm,
    form.includedKm,
    form.extraKmRate,
    form.baseFare,
    form.advanceReceived,
  ]);

  const handleVehicleChange = (vehicleId: string) => {
    const selected = vehicles.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleName: selected
        ? `${selected.name} (${selected.registrationNumber})`
        : "",
      extraKmRate: selected?.extraKmRate || prev.extraKmRate,
    }));
  };

  const handleQuickTripPreset = () => {
    setForm((prev) => ({
      ...prev,
      from: "Pune Central",
      to: "Mumbai Airport T2",
      customerName: "Ramesh Patil",
      customerPhone: "9876543210",
      driverName: "Rajesh Kumar",
      includedKm: 100,
      baseFare: 3500,
      advanceReceived: 1000,
      extraKmRate: 25,
      driverAgreedPay: 1200,
      status: "scheduled",
    }));
    setFeedback({
      message: "Quick trip template loaded! Review and click Save Trip.",
      type: "success",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setForm({
      tripDate: trip.tripDate || todayStr,
      vehicleId: trip.vehicleId || "",
      vehicleName: trip.vehicleName || "",
      driverName: trip.driverName || "",
      driverAgreedPay: trip.driverAgreedPay || 0,
      customerName: trip.customerName || "",
      customerPhone: trip.customerPhone || "",
      from: trip.from || "",
      to: trip.to || "",
      startingKm: trip.startingKm || 0,
      endingKm: trip.endingKm || 0,
      includedKm: trip.includedKm || 100,
      extraKmRate: trip.extraKmRate || 25,
      baseFare: trip.baseFare || 0,
      advanceReceived: trip.advanceReceived || 0,
      status: trip.status || "scheduled",
      notes: trip.notes || "",
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingTripId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (trip: Trip) => {
    const confirmMessage = `Are you sure you want to remove Trip #${trip.tripNumber || trip.id} (${trip.from} -> ${trip.to})?`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(trip.id);
    try {
      await deleteTrip(trip.id);
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      if (editingTripId === trip.id) {
        handleCancelEdit();
      }
      setFeedback({
        message: `Trip #${trip.tripNumber || trip.id} deleted successfully.`,
        type: "success",
      });
    } catch (err) {
      console.error("Delete trip error:", err);
      setFeedback({
        message: "Failed to delete trip. Please try again.",
        type: "error",
      });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
      const vehicleName =
        form.vehicleName ||
        (selectedVehicle
          ? `${selectedVehicle.name} (${selectedVehicle.registrationNumber})`
          : "");

      const tripPayload = {
        tripDate: form.tripDate,
        vehicleId: form.vehicleId,
        vehicleName,
        driverName: form.driverName.trim(),
        driverAgreedPay: Number(form.driverAgreedPay) || 0,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        from: form.from.trim(),
        to: form.to.trim(),
        startingKm: Number(form.startingKm) || 0,
        endingKm: Number(form.endingKm) || 0,
        includedKm: Number(form.includedKm) || 0,
        extraKmRate: Number(form.extraKmRate) || 0,
        extraKmCharge: fareCalcs.extraCharge,
        baseFare: Number(form.baseFare) || 0,
        totalFare: fareCalcs.totalFare,
        advanceReceived: Number(form.advanceReceived) || 0,
        customerPaid: Number(form.advanceReceived) || 0,
        customerBalance: fareCalcs.balance,
        driverPaid: 0,
        driverBalance: Number(form.driverAgreedPay) || 0,
        status: form.status,
        notes: form.notes || "",
      };

      if (editingTripId) {
        await updateTrip(editingTripId, tripPayload);
        setTrips((prev) =>
          prev.map((t) =>
            t.id === editingTripId ? { ...t, ...tripPayload } : t
          )
        );
        setFeedback({ message: "Trip updated successfully!", type: "success" });
        setEditingTripId(null);
      } else {
        const newId = await createTrip(tripPayload);
        const nextTripNumber = `TRP-${String(trips.length + 1001).slice(-4)}`;
        const newTrip: Trip = {
          id: newId,
          tripNumber: nextTripNumber,
          ...tripPayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTrips((prev) => [newTrip, ...prev]);
        setFeedback({
          message: "New trip booked and dispatched successfully!",
          type: "success",
        });
      }

      setForm(emptyForm);
    } catch (err: unknown) {
      console.error("Save trip error:", err);
      const msg = (err as Error)?.message || "Failed to save trip";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          (t.tripNumber && t.tripNumber.toLowerCase().includes(query)) ||
          t.customerName.toLowerCase().includes(query) ||
          t.from.toLowerCase().includes(query) ||
          t.to.toLowerCase().includes(query) ||
          (t.driverName && t.driverName.toLowerCase().includes(query)) ||
          (t.vehicleName && t.vehicleName.toLowerCase().includes(query));
        if (!matches) return false;
      }

      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [trips, search, statusFilter]);

  const handleExportCSV = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export.");
      return;
    }
    const data = filteredTrips.map((t) => ({
      "Trip Number": t.tripNumber || t.id,
      Date: t.tripDate,
      Customer: t.customerName,
      Phone: t.customerPhone,
      From: t.from,
      To: t.to,
      Vehicle: t.vehicleName || "-",
      Driver: t.driverName || "-",
      "Total Fare (INR)": t.totalFare,
      "Advance Received": t.advanceReceived,
      "Customer Balance": t.customerBalance,
      Status: t.status,
    }));
    exportToCSV(data, `Fleet_Trips_${todayStr}`);
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="font-sans max-w-[1520px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER WITH PASSENGER VAN & ALPINE LAKE
             Expanded bottom padding so the 4 KPI cards float halfway
             over the asphalt road and van, exactly matching the reference!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[300px] sm:min-h-[330px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Image: Scenic Mountain Highway with White Luxury Van */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/trips-scenic-hero.jpg')",
            backgroundPosition: "75% 65%",
          }}
        >
          <Image
            src="/images/trips-scenic-hero.jpg"
            alt="Scenic Mountain Road Trip Highway with Passenger Van"
            fill
            priority
            unoptimized
            className="object-cover object-[75%_65%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the van and mountains bright on the right */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Cursive Art Overlay on Large Screens: "Safe Journeys Stronger Connections" */}
        <div className="hidden lg:block absolute right-8 top-12 select-none pointer-events-none opacity-90 pr-4">
          <div className="relative w-40 h-28">
            <Image
              src="/images/safe-journeys-script.png"
              alt="Safe Journeys Stronger Connections"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>

        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop) */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 flex-wrap w-full">
          <Link
            href="/travel/payments"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Record Payment</span>
          </Link>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>New Trip</span>
          </button>
        </div>

        {/* Left Side: Fleet Dispatch & Bookings Title */}
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-slate-900/80 backdrop-blur-md border border-white/20 p-0.5 relative shrink-0 shadow-sm">
              <Image
                src="/images/rk-logo.png"
                alt="RK Logo"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
              FLEET DISPATCH &amp; BOOKINGS
            </p>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black tracking-tight text-white leading-tight drop-shadow-md">
            Trip <span className="text-[#38BDF8]">Management</span>
          </h1>

          <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1 max-w-xl drop-shadow line-clamp-2">
            Book, dispatch, and track customer journeys, assigned vehicles, drivers, and fare settlements.
          </p>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
             Positioned with -mt-10 sm:-mt-12 lg:-mt-14 relative z-20
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {/* CARD 1: TOTAL TRIPS */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-blue-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBlueTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20 L 100 40 L 0 40 Z" fill="url(#waveBlueTrips)" />
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
                {totalTripsCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                All dispatches
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700">
              Logged
            </span>
          </div>
        </div>

        {/* CARD 2: TODAY'S SCHEDULE */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-emerald-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveEmeraldTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 32 C 25 30, 45 12, 60 16 C 75 20, 85 24, 100 18" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 32 C 25 30, 45 12, 60 16 C 75 20, 85 24, 100 18 L 100 40 L 0 40 Z" fill="url(#waveEmeraldTrips)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                TODAY&apos;S SCHEDULE
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {todayTripsCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Scheduled today
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                todayTripsCount > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {todayTripsCount > 0 ? "Active today" : "None today"}
            </span>
          </div>
        </div>

        {/* CARD 3: COMPLETED TRIPS */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-purple-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wavePurpleTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 30 C 20 28, 40 36, 60 22 C 75 14, 85 24, 100 16" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 30 C 20 28, 40 36, 60 22 C 75 14, 85 24, 100 16 L 100 40 L 0 40 Z" fill="url(#wavePurpleTrips)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                COMPLETED TRIPS
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {completedTripsCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Fulfilled routes
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700">
              {completedPercent}%
            </span>
          </div>
        </div>

        {/* CARD 4: CUSTOMER BALANCE */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-amber-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveAmberTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 26 C 25 24, 45 36, 65 30 C 80 26, 90 18, 100 14" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 26 C 25 24, 45 36, 65 30 C 80 26, 90 18, 100 14 L 100 40 L 0 40 Z" fill="url(#waveAmberTrips)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                CUSTOMER BALANCE
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                ₹{totalPendingDues.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Outstanding
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                totalPendingDues === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {totalPendingDues === 0 ? "All cleared" : "Pending dues"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Feedback Toast */}
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
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TWO-COLUMN CONTENT: NEW TRIP DISPATCH & TRIP FEED
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════ LEFT COLUMN: NEW TRIP DISPATCH (5 COLS) ══════════════ */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <Bus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingTripId ? "Edit Trip Dispatch" : "New Trip Dispatch"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Book route, assign fleet vehicle, and calculate fare
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!editingTripId && (
                  <button
                    type="button"
                    onClick={handleQuickTripPreset}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0D62FE] text-[11px] font-bold transition-colors cursor-pointer"
                    title="Fill sample trip route"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Quick Trip</span>
                  </button>
                )}
                {editingTripId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Trip Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    TRIP DATE <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      required
                      value={form.tripDate}
                      onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    STATUS
                  </label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as TripStatus })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="scheduled">● Scheduled</option>
                      <option value="in_progress">● In Progress</option>
                      <option value="completed">● Completed</option>
                      <option value="cancelled">● Cancelled</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Customer Name & Customer Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    CUSTOMER NAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    CUSTOMER PHONE
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 3: Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    ORIGIN (FROM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Central"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    DESTINATION (TO) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai Airport T2"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 4: Assigned Vehicle & Driver Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    ASSIGNED VEHICLE
                  </label>
                  <div className="relative">
                    <select
                      value={form.vehicleId}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Select vehicle...</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.registrationNumber})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    DRIVER NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 5: Start KM, End KM, Included KM */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    START KM
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.startingKm}
                    onChange={(e) => setForm({ ...form, startingKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    END KM
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.endingKm}
                    onChange={(e) => setForm({ ...form, endingKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    INCLUDED KM
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.includedKm}
                    onChange={(e) => setForm({ ...form, includedKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Fare & Billing Calculation Box */}
              <div className="bg-[#F0F6FE] border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100/80">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Fare &amp; Billing Calculation
                    </span>
                  </div>
                  <span className="text-sm font-black text-[#0D62FE] font-mono">
                    Total : ₹{fareCalcs.totalFare.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Base Fare (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.baseFare}
                      onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200/80 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Extra Rate (₹/km)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200/80 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Advance (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.advanceReceived}
                      onChange={(e) => setForm({ ...form, advanceReceived: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200/80 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Driver Pay (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.driverAgreedPay}
                      onChange={(e) => setForm({ ...form, driverAgreedPay: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200/80 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {fareCalcs.extraKm > 0 && (
                  <p className="text-[10px] text-blue-700 font-semibold pt-1">
                    * Extra distance: {fareCalcs.extraKm} km @ ₹{form.extraKmRate}/km = ₹{fareCalcs.extraCharge}
                  </p>
                )}
              </div>

              {/* Action Buttons: Reset & Save Trip */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/35 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                  <span>{editingTripId ? "Update Trip" : "Save Trip"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN: TRIP FEED (7 COLS) ══════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header: Title, Search, Status Filter & View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Trip Feed <span className="text-slate-400 font-semibold">({filteredTrips.length} trips)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    View and manage all dispatched trips
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search trips, customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white w-38 sm:w-46 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-blue-100 text-blue-600 shadow-xs font-bold"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State vs Trips List/Grid */}
            {filteredTrips.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center space-y-3">
                {/* Illustrated Map & Van Graphic */}
                <div className="relative w-56 h-26 sm:w-64 sm:h-28 overflow-hidden select-none pointer-events-none">
                  <Image
                    src="/images/trips-empty-illustration.png"
                    alt="No trips recorded yet"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    No trips recorded yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Create your first trip booking to track route mileage, fares, and customer receipts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] cursor-pointer mt-1"
                >
                  <Plus className="w-4 h-4 stroke-[2.75]" />
                  <span>Create First Trip</span>
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View of Trips */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <span className="text-xs font-black font-mono text-slate-900">
                          {trip.tripNumber || trip.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            trip.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : trip.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : trip.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {trip.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <span>{trip.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{trip.to}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {trip.customerName} {trip.customerPhone && `• ${trip.customerPhone}`}
                        </p>
                        {trip.vehicleName && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Vehicle: {trip.vehicleName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Fare</span>
                        <span className="font-extrabold font-mono text-slate-900">
                          ₹{Number(trip.totalFare).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(trip)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === trip.id}
                          onClick={() => handleDelete(trip)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View of Trips */
              <div className="space-y-2">
                {filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-slate-50/70 hover:bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-slate-900">
                          {trip.tripNumber || trip.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            trip.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : trip.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : trip.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {trip.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mt-1">
                        <span>{trip.from}</span>
                        <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{trip.to}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {trip.customerName} • {trip.tripDate} {trip.vehicleName && `• ${trip.vehicleName}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black font-mono text-slate-900 block">
                          ₹{Number(trip.totalFare).toLocaleString("en-IN")}
                        </span>
                        {Number(trip.customerBalance) > 0 && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded block mt-0.5">
                            Due ₹{Number(trip.customerBalance).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(trip)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === trip.id}
                          onClick={() => handleDelete(trip)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom 4 Feature Badges (Matching Mockup) */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 truncate">Route Tracking</p>
                  <p className="text-[8px] text-slate-400 truncate">Monitor trip progress</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 truncate">Fare Settlement</p>
                  <p className="text-[8px] text-slate-400 truncate">Automated calculations</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 truncate">Customer Records</p>
                  <p className="text-[8px] text-slate-400 truncate">Complete history</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 truncate">Driver Management</p>
                  <p className="text-[8px] text-slate-400 truncate">Assign and track drivers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
