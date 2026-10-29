"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Car,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Download,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  ArrowRight,
  Calendar,
  X,
} from "lucide-react";
import {
  formatINR,
  normalizeRegNumber,
  isDateExpiringSoon,
  isDocumentExpired,
  formatDateShort,
  exportToCSV,
} from "@/lib/utils";
import type { Vehicle } from "@/types";
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/services/vehicles.service";

interface VehiclesClientProps {
  initialVehicles: Vehicle[];
}

const EMPTY_FORM = {
  registrationNumber: "",
  name: "",
  type: "SUV / MUV",
  extraKmRate: 15,
  currentKm: 0,
  nextServiceKm: 10000,
  insuranceExpiry: "",
  permitExpiry: "",
  pollutionExpiry: "",
  status: "active" as Vehicle["status"],
  notes: "",
};

export default function VehiclesClient({ initialVehicles }: VehiclesClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles || []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  // Dynamic real KPIs calculated from real data
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const serviceDueVehicles = vehicles.filter(
    (v) => v.status === "service_due" || (v.nextServiceKm > 0 && v.currentKm >= v.nextServiceKm)
  ).length;
  const expiringDocsCount = vehicles.filter(
    (v) =>
      isDateExpiringSoon(v.insuranceExpiry, 30) ||
      isDateExpiringSoon(v.permitExpiry, 30) ||
      isDateExpiringSoon(v.pollutionExpiry, 30) ||
      isDocumentExpired(v.insuranceExpiry) ||
      isDocumentExpired(v.permitExpiry) ||
      isDocumentExpired(v.pollutionExpiry)
  ).length;

  const handleEdit = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name || "",
      type: v.type || "SUV / MUV",
      extraKmRate: v.extraKmRate || 15,
      currentKm: v.currentKm || 0,
      nextServiceKm: v.nextServiceKm || 10000,
      insuranceExpiry: v.insuranceExpiry || "",
      permitExpiry: v.permitExpiry || "",
      pollutionExpiry: v.pollutionExpiry || "",
      status: v.status || "active",
      notes: v.notes || "",
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingVehicleId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    const confirmMessage = `Are you sure you want to remove ${vehicle.name || vehicle.registrationNumber} (${vehicle.registrationNumber}) from your fleet?`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(vehicle.id);
    try {
      await deleteVehicle(vehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
      if (editingVehicleId === vehicle.id) {
        handleCancelEdit();
      }
      setFeedback({ message: `Vehicle ${vehicle.registrationNumber} deleted successfully.`, type: "success" });
    } catch (err) {
      console.error("Delete vehicle error:", err);
      setFeedback({ message: "Failed to delete vehicle. Please try again.", type: "error" });
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
      const normalizedReg = normalizeRegNumber(form.registrationNumber);
      const vehiclePayload = {
        name: form.name.trim(),
        type: form.type,
        registrationNumber: normalizedReg,
        registrationNumberNormalized: normalizedReg.replace(/[^A-Z0-9]/g, ""),
        extraKmRate: Number(form.extraKmRate) || 0,
        currentKm: Number(form.currentKm) || 0,
        nextServiceKm: Number(form.nextServiceKm) || 0,
        insuranceExpiry: form.insuranceExpiry || "",
        permitExpiry: form.permitExpiry || "",
        pollutionExpiry: form.pollutionExpiry || "",
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehiclePayload);
        setVehicles((prev) =>
          prev.map((v) => (v.id === editingVehicleId ? { ...v, ...vehiclePayload } : v))
        );
        setFeedback({ message: "Vehicle updated successfully!", type: "success" });
        setEditingVehicleId(null);
      } else {
        const newId = await createVehicle(vehiclePayload);
        const newVehicle: Vehicle = {
          id: newId,
          ...vehiclePayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setVehicles((prev) => [newVehicle, ...prev]);
        setFeedback({ message: "New vehicle registered successfully!", type: "success" });
      }

      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      console.error("Save vehicle error:", err);
      const msg = (err as Error)?.message || "Failed to save vehicle";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          v.registrationNumber.toLowerCase().includes(query) ||
          (v.name && v.name.toLowerCase().includes(query)) ||
          (v.type && v.type.toLowerCase().includes(query)) ||
          (v.notes && v.notes.toLowerCase().includes(query));
        if (!matches) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active" && v.status !== "active") return false;
        if (statusFilter === "inactive" && v.status !== "inactive") return false;
        if (statusFilter === "service") {
          const isDue = v.status === "service_due" || (v.nextServiceKm > 0 && v.currentKm >= v.nextServiceKm);
          if (!isDue) return false;
        }
      }

      return true;
    });
  }, [vehicles, search, statusFilter]);

  // Pagination
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(startIndex, startIndex + pageSize);
  }, [filteredVehicles, currentPage]);

  const handleExportCSV = () => {
    if (filteredVehicles.length === 0) {
      alert("No vehicles to export.");
      return;
    }
    const data = filteredVehicles.map((v) => ({
      "Registration Number": v.registrationNumber,
      "Vehicle Name": v.name,
      Type: v.type || "-",
      Status: v.status,
      "Current KM": v.currentKm,
      "Next Service KM": v.nextServiceKm,
      "Extra KM Rate (INR)": v.extraKmRate,
      "Insurance Expiry": v.insuranceExpiry || "-",
      "Permit Expiry": v.permitExpiry || "-",
      "Pollution Expiry": v.pollutionExpiry || "-",
      Notes: v.notes || "-",
    }));
    exportToCSV(data, `Fleet_Vehicles_${new Date().toISOString().split("T")[0]}`);
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
              FLEET INVENTORY &amp; COMPLIANCE
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {totalVehicles} Registered {totalVehicles === 1 ? "Unit" : "Units"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Vehicle Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Register and manage fleet vehicles, extra km rates, service due thresholds, and compliance documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
            <span>Add Vehicle</span>
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
        {/* TOTAL VEHICLES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Vehicles
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalVehicles}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Fleet recorded</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Registered
            </span>
          </div>
        </div>

        {/* ACTIVE VEHICLES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {activeVehicles}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Roadworthy</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {totalVehicles > 0 ? `${Math.round((activeVehicles / totalVehicles) * 100)}% active` : "0%"}
            </span>
          </div>
        </div>

        {/* SERVICE DUE */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Service Due
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                serviceDueVehicles > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {serviceDueVehicles}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Odometer threshold</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                serviceDueVehicles > 0
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {serviceDueVehicles > 0 ? "Action needed" : "All clear"}
            </span>
          </div>
        </div>

        {/* EXPIRING DOCUMENTS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Document Expiries
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                expiringDocsCount > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {expiringDocsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Insurance &amp; Permits</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                expiringDocsCount > 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {expiringDocsCount > 0 ? "< 30 days" : "Valid"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Main 2-Column Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Register / Edit Vehicle Form (5 Cols) */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingVehicleId ? "Edit Vehicle" : "Add Vehicle to Fleet"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {editingVehicleId
                      ? "Update vehicle details, odometer, or compliance dates"
                      : "Register asset details, extra km rates, and document expiries"}
                  </p>
                </div>
              </div>
              {editingVehicleId && (
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
              {/* Row 1: Registration Number & Vehicle Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-RN-4402"
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Vehicle Name / Model <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Innova Crysta ZX"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Type & Extra KM Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="SUV / MUV">SUV / MUV (Innova, Ertiga, Scorpio)</option>
                      <option value="Sedan">Sedan (Dzire, Amaze, Etios)</option>
                      <option value="Maxi-Cab">Maxi-Cab (Urbania, Winger, Tempo)</option>
                      <option value="Hatchback">Hatchback (WagonR, Swift, Tiago)</option>
                      <option value="Luxury">Luxury / Bus</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Extra KM Rate (₹)
                  </label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 font-bold mr-1 text-xs">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">/ km</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Odometer & Next Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Current Odometer (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 42000"
                    value={form.currentKm}
                    onChange={(e) => setForm({ ...form, currentKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Next Service Due (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    value={form.nextServiceKm}
                    onChange={(e) => setForm({ ...form, nextServiceKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Compliance Box: Insurance, Permit, Pollution */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold">Compliance Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">
                      Insurance Expiry
                    </label>
                    <input
                      type="date"
                      value={form.insuranceExpiry}
                      onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">
                      Permit Expiry
                    </label>
                    <input
                      type="date"
                      value={form.permitExpiry}
                      onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">
                      PUC Expiry
                    </label>
                    <input
                      type="date"
                      value={form.pollutionExpiry}
                      onChange={(e) => setForm({ ...form, pollutionExpiry: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Fleet Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle["status"] })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="active">Active (Ready for Trips)</option>
                      <option value="service_due">Service Due</option>
                      <option value="inactive">Inactive / Standby</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Notes / Amenities
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7-Seater, FASTag ID, Dual AC"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit / Reset Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? "Saving..."
                      : editingVehicleId
                      ? "Update Vehicle"
                      : "Register Vehicle"}
                  </span>
                </button>
                {editingVehicleId && (
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

        {/* RIGHT COLUMN: Fleet Roster Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Fleet Roster</h2>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  ({filteredVehicles.length} {filteredVehicles.length === 1 ? "vehicle" : "vehicles"})
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reg, model..."
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
                    <option value="active">Active</option>
                    <option value="service">Service Due</option>
                    <option value="inactive">Inactive</option>
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

            {/* List / Grid of Vehicles */}
            {filteredVehicles.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {search ? "No matching vehicles found" : "No vehicles in your fleet yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  {search
                    ? "Try adjusting your search or status filter to see other vehicles."
                    : "Register your vehicles using the form to track odometer, service intervals, and compliance permits."}
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
                    <span>Register First Vehicle</span>
                  </button>
                )}
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                {paginatedVehicles.map((vehicle) => {
                  const isServiceDue =
                    vehicle.status === "service_due" ||
                    (vehicle.nextServiceKm > 0 && vehicle.currentKm >= vehicle.nextServiceKm);
                  const remainingKm = vehicle.nextServiceKm
                    ? vehicle.nextServiceKm - (vehicle.currentKm || 0)
                    : null;
                  const hasExpiringDoc =
                    isDateExpiringSoon(vehicle.insuranceExpiry, 30) ||
                    isDateExpiringSoon(vehicle.permitExpiry, 30) ||
                    isDateExpiringSoon(vehicle.pollutionExpiry, 30);

                  return (
                    <div
                      key={vehicle.id}
                      className="bg-slate-50/70 hover:bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all space-y-3"
                    >
                      {/* Top Row: Reg number, Status badge, Edit/Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900 font-mono">
                              {vehicle.registrationNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isServiceDue
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : vehicle.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isServiceDue ? "Service Due" : vehicle.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                            {vehicle.name} {vehicle.type && <span className="text-slate-400 font-normal">• {vehicle.type}</span>}
                          </div>
                        </div>

                        {/* Edit and Delete Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(vehicle)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Vehicle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === vehicle.id}
                            onClick={() => handleDelete(vehicle)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 border-y border-slate-200/60 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Odometer</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {(vehicle.currentKm || 0).toLocaleString("en-IN")} km
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Service Due</span>
                          <span
                            className={`font-bold font-mono ${
                              remainingKm !== null && remainingKm <= 0
                                ? "text-rose-600"
                                : remainingKm !== null && remainingKm <= 1000
                                ? "text-amber-600"
                                : "text-slate-700"
                            }`}
                          >
                            {remainingKm !== null
                              ? remainingKm <= 0
                                ? `Overdue ${Math.abs(remainingKm)} km`
                                : `${remainingKm.toLocaleString("en-IN")} km left`
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Extra KM Rate</span>
                          <span className="font-bold text-slate-800">
                            ₹{vehicle.extraKmRate || 0}/km
                          </span>
                        </div>
                      </div>

                      {/* Compliance & Notes */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-3 flex-wrap">
                          {vehicle.insuranceExpiry && (
                            <span className={isDocumentExpired(vehicle.insuranceExpiry) ? "text-rose-600 font-bold" : isDateExpiringSoon(vehicle.insuranceExpiry, 30) ? "text-amber-600 font-bold" : ""}>
                              Ins: {formatDateShort(vehicle.insuranceExpiry)}
                            </span>
                          )}
                          {vehicle.permitExpiry && (
                            <span className={isDocumentExpired(vehicle.permitExpiry) ? "text-rose-600 font-bold" : isDateExpiringSoon(vehicle.permitExpiry, 30) ? "text-amber-600 font-bold" : ""}>
                              Permit: {formatDateShort(vehicle.permitExpiry)}
                            </span>
                          )}
                          {vehicle.pollutionExpiry && (
                            <span className={isDocumentExpired(vehicle.pollutionExpiry) ? "text-rose-600 font-bold" : isDateExpiringSoon(vehicle.pollutionExpiry, 30) ? "text-amber-600 font-bold" : ""}>
                              PUC: {formatDateShort(vehicle.pollutionExpiry)}
                            </span>
                          )}
                        </div>

                        {/* Quick Action Links */}
                        <div className="flex items-center gap-2">
                          <Link
                            href="/travel/trips"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <span>Book Trip</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {vehicle.notes && (
                        <p className="text-[10px] text-slate-400 italic truncate border-t border-slate-100 pt-1">
                          {vehicle.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredVehicles.length)} of {filteredVehicles.length} vehicles
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
        <p>© RK Travel Hub • Fleet Inventory &amp; Vehicle Dispatch Management</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Fleet database connected</span>
        </div>
      </footer>
    </div>
  );
}
