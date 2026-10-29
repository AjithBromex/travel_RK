"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { formatINR, formatDateShort, exportToCSV, calculateTripFare } from "@/lib/utils";
import type { Trip, Vehicle, TripStatus } from "@/types";
import { createTrip, updateTrip, deleteTrip } from "@/services/trips.service";

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
    vehicleName: vehicles[0]?.name ? `${vehicles[0].name} (${vehicles[0].registrationNumber})` : "",
    driverName: "",
    driverAgreedPay: 0,
    customerName: "",
    customerPhone: "",
    from: "",
    to: "",
    startingKm: 0,
    endingKm: 0,
    includedKm: 100,
    extraKmRate: vehicles[0]?.extraKmRate || 15,
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
  }, [form.startingKm, form.endingKm, form.includedKm, form.extraKmRate, form.baseFare, form.advanceReceived]);

  const handleVehicleChange = (vehicleId: string) => {
    const selected = vehicles.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleName: selected ? `${selected.name} (${selected.registrationNumber})` : "",
      extraKmRate: selected?.extraKmRate || prev.extraKmRate,
    }));
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
      extraKmRate: trip.extraKmRate || 15,
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
    const confirmMessage = `Are you sure you want to delete Trip #${trip.tripNumber || trip.id} for ${trip.customerName}?`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(trip.id);
    try {
      await deleteTrip(trip.id);
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      if (editingTripId === trip.id) {
        handleCancelEdit();
      }
      setFeedback({ message: "Trip deleted successfully.", type: "success" });
    } catch (err) {
      console.error("Delete trip error:", err);
      setFeedback({ message: "Failed to delete trip. Please try again.", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleUpdateStatus = async (trip: Trip, newStatus: TripStatus) => {
    try {
      await updateTrip(trip.id, { status: newStatus });
      setTrips((prev) =>
        prev.map((t) => (t.id === trip.id ? { ...t, status: newStatus } : t))
      );
      setFeedback({ message: `Trip status updated to ${newStatus}.`, type: "success" });
    } catch {
      alert("Failed to update trip status");
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const { distance, extraKm, extraCharge, totalFare, balance } = fareCalcs;

      const tripPayload = {
        tripDate: form.tripDate,
        vehicleId: form.vehicleId,
        vehicleName: form.vehicleName,
        driverName: form.driverName.trim(),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        from: form.from.trim(),
        to: form.to.trim(),
        startingKm: Number(form.startingKm) || 0,
        endingKm: Number(form.endingKm) || 0,
        includedKm: Number(form.includedKm) || 0,
        extraKmRate: Number(form.extraKmRate) || 0,
        baseFare: Number(form.baseFare) || 0,
        extraKmCharge: extraCharge,
        advanceReceived: Number(form.advanceReceived) || 0,
        driverAgreedPay: Number(form.driverAgreedPay) || 0,
        totalFare: totalFare,
        customerPaid: Number(form.advanceReceived) || 0,
        customerBalance: balance,
        driverPaid: 0,
        driverBalance: Number(form.driverAgreedPay) || 0,
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editingTripId) {
        await updateTrip(editingTripId, tripPayload);
        setTrips((prev) =>
          prev.map((t) => (t.id === editingTripId ? { ...t, ...tripPayload } : t))
        );
        setFeedback({ message: "Trip details updated successfully!", type: "success" });
        setEditingTripId(null);
      } else {
        const newId = await createTrip(tripPayload);
        const newTrip: Trip = {
          id: newId,
          tripNumber: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
          ...tripPayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTrips((prev) => [newTrip, ...prev]);
        setFeedback({ message: "New trip booked and dispatched successfully!", type: "success" });
      }

      setForm(emptyForm);
    } catch (err: unknown) {
      console.error("Save trip error:", err);
      const msg = (err as Error)?.message || "Failed to record trip";
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

  // Pagination
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTrips.slice(startIndex, startIndex + pageSize);
  }, [filteredTrips, currentPage]);

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
    <div className="space-y-6 pb-12">
      {/* ─── 1. Header & Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
              FLEET DISPATCH &amp; BOOKINGS
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {totalTripsCount} Total {totalTripsCount === 1 ? "Trip" : "Trips"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Trip Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Book, dispatch, and track customer journeys, assigned vehicles, drivers, and fare settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/travel/payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Record Payment</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </button>
        </div>
      </div>

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

      {/* ─── 2. Real KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL TRIPS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalTripsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">All dispatches</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Logged
            </span>
          </div>
        </div>

        {/* TODAY'S TRIPS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Today&apos;s Schedule
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {todayTripsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Scheduled today</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {todayTripsCount > 0 ? "Active" : "None today"}
            </span>
          </div>
        </div>

        {/* COMPLETED TRIPS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Completed Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {completedTripsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Fulfilled routes</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {totalTripsCount > 0 ? `${Math.round((completedTripsCount / totalTripsCount) * 100)}% done` : "0%"}
            </span>
          </div>
        </div>

        {/* PENDING DUES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Customer Balance
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                totalPendingDues > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalPendingDues)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Outstanding</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totalPendingDues > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {totalPendingDues > 0 ? "Pending" : "All cleared"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Main 2-Column Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Add / Edit Trip Form (5 Cols) */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingTripId ? "Edit Trip Booking" : "New Trip Dispatch"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {editingTripId
                      ? "Update trip details, odometer, or payment terms"
                      : "Book route, assign fleet vehicle, and calculate fare"}
                  </p>
                </div>
              </div>
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Trip Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tripDate}
                    onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as TripStatus })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Route Origin -> Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Origin (From) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune Central"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Destination (To) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai Airport T2"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Vehicle & Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Assigned Vehicle
                  </label>
                  <div className="relative">
                    <select
                      value={form.vehicleId}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer truncate"
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
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Km Details */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Start Km
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.startingKm}
                    onChange={(e) => setForm({ ...form, startingKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    End Km
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.endingKm}
                    onChange={(e) => setForm({ ...form, endingKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Included Km
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="100"
                    value={form.includedKm}
                    onChange={(e) => setForm({ ...form, includedKm: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Fare & Billing Box */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Fare &amp; Billing Calculation</span>
                  <span className="text-xs font-bold font-mono text-blue-600">
                    Total: {formatINR(fareCalcs.totalFare)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Base Fare (₹)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.baseFare}
                      onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Extra Rate (₹/km)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Advance (₹)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.advanceReceived}
                      onChange={(e) => setForm({ ...form, advanceReceived: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Driver Pay (₹)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.driverAgreedPay}
                      onChange={(e) => setForm({ ...form, driverAgreedPay: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    Distance: <strong className="text-slate-800">{fareCalcs.distance} km</strong> (Extra: {fareCalcs.extraKm} km = {formatINR(fareCalcs.extraCharge)})
                  </span>
                  <span className="text-amber-700 font-bold">
                    Balance Due: {formatINR(fareCalcs.balance)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Trip Notes / Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Airport pickup, toll included, AC round trip"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>
                    {loading ? "Saving..." : editingTripId ? "Update Trip Booking" : "Dispatch New Trip"}
                  </span>
                </button>
                {editingTripId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Trips Roster / Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Trip Feed</h2>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  ({filteredTrips.length} {filteredTrips.length === 1 ? "trip" : "trips"})
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search trips, customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-40 sm:w-44 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1 rounded ${viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* List / Grid of Trips */}
            {filteredTrips.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {search ? "No matching trips found" : "No trips recorded yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  {search
                    ? "Try adjusting your search query or status filter to see other trips."
                    : "Create your first trip booking to track route mileage, fares, and customer receipts."}
                </p>
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Clear search filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Trip</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                {paginatedTrips.map((trip) => {
                  const hasDue = Number(trip.customerBalance) > 0;
                  const statusColors: Record<string, string> = {
                    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                    in_progress: "bg-blue-50 text-blue-700 border-blue-200/60",
                    scheduled: "bg-amber-50 text-amber-700 border-amber-200/60",
                    cancelled: "bg-slate-100 text-slate-600 border-slate-200/60",
                  };
                  const statusLabel: Record<string, string> = {
                    completed: "Completed",
                    in_progress: "In Progress",
                    scheduled: "Scheduled",
                    cancelled: "Cancelled",
                  };

                  return (
                    <div
                      key={trip.id}
                      className="bg-slate-50/70 hover:bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all space-y-3"
                    >
                      {/* Top Header of Trip Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold font-mono text-slate-900">
                              #{trip.tripNumber || trip.id.slice(0, 7)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                statusColors[trip.status] || statusColors.scheduled
                              }`}
                            >
                              {statusLabel[trip.status] || trip.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateShort(trip.tripDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{trip.from || "Origin"}</span>
                            <span className="text-slate-400">→</span>
                            <span>{trip.to || "Destination"}</span>
                          </div>
                        </div>

                        {/* Edit and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(trip)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Trip"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === trip.id}
                            onClick={() => handleDelete(trip)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Delete Trip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-y border-slate-200/60 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Customer</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {trip.customerName}
                          </span>
                          {trip.customerPhone && (
                            <span className="text-[10px] text-slate-400 block">{trip.customerPhone}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Vehicle &amp; Driver</span>
                          <span className="font-semibold text-slate-700 truncate block">
                            {trip.vehicleName || "Unassigned"}
                          </span>
                          {trip.driverName && (
                            <span className="text-[10px] text-slate-400 block">{trip.driverName}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Fare &amp; Status</span>
                          <span className="font-extrabold text-slate-900 font-mono-nums block">
                            {formatINR(trip.totalFare || 0)}
                          </span>
                          {hasDue ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50 inline-block mt-0.5">
                              Due {formatINR(trip.customerBalance)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50 inline-block mt-0.5">
                              Paid Full
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Quick Controls */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {trip.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(trip, "completed")}
                              className="text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                            >
                              ✓ Mark Completed
                            </button>
                          )}
                          {trip.status === "scheduled" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(trip, "in_progress")}
                              className="text-[10px] font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition-colors"
                            >
                              ▶ Start Trip
                            </button>
                          )}
                        </div>

                        <Link
                          href="/travel/payments"
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <span>Settle Payment</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {trip.notes && (
                        <p className="text-[10px] text-slate-400 italic truncate border-t border-slate-100 pt-1">
                          {trip.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredTrips.length)} of {filteredTrips.length} trips
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. Persistent Footer ─── */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© RK Travel Hub • Trip Logistics &amp; Passenger Booking Management</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Dispatches database synchronized</span>
        </div>
      </footer>
    </div>
  );
}
