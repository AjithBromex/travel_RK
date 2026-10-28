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
  Calendar,
  Shield,
  Fuel,
  AlertTriangle,
  Star,
  MapPin,
  RotateCcw,
  LayoutGrid,
  List,
  Bus,
  Check,
  Building2,
  Clock,
  Coins,
  FileText,
} from "lucide-react";
import { formatINR, normalizeRegNumber, isDateExpiringSoon, exportToCSV } from "@/lib/utils";
import type { Vehicle } from "@/types";
import { createVehicle, updateVehicle, deleteVehicle } from "@/services/vehicles.service";

interface VehiclesClientProps {
  initialVehicles: Vehicle[];
}

interface RosterItem {
  id: string;
  regNumber: string;
  model: string;
  statusBadge: {
    label: string;
    type: "active_on_route" | "ready_at_stand" | "corporate_shuttle" | "service_due";
  };
  locationNote: string;
  extraKmRate: number;
  driverName: string;
  driverRating: string;
  odometer: string;
  nextService: string;
  isServiceOverdue?: boolean;
  insuranceNote: string;
  permitPucNote: string;
  pucExpiring?: boolean;
  footerTag: {
    text: string;
    type: "fastag" | "fuel" | "schedule" | "warning";
  };
  primaryAction: {
    label: string;
    style: "blue" | "black" | "outline" | "amber";
  };
  rawVehicle?: Vehicle;
}

const DEFAULT_ROSTER_ITEMS: RosterItem[] = [
  {
    id: "MH-12-RN-4402",
    regNumber: "MH-12-RN-4402",
    model: "Toyota Innova Crysta (2024, Diesel)",
    statusBadge: {
      label: "Active • On Route",
      type: "active_on_route",
    },
    locationNote: "Pune Central ➔ Mumbai T2 Airport (Trip #RK-8821)",
    extraKmRate: 16,
    driverName: "Rajesh Kumar",
    driverRating: "4.9",
    odometer: "42,850 km",
    nextService: "2,150 km",
    insuranceNote: "Valid (Nov 2026)",
    permitPucNote: "All Verified",
    footerTag: {
      text: "FASTag Active (₹2,400)",
      type: "fastag",
    },
    primaryAction: {
      label: "Assign Trip",
      style: "blue",
    },
  },
  {
    id: "MH-14-BT-9108",
    regNumber: "MH-14-BT-9108",
    model: "Maruti Suzuki Ertiga ZXi+ (Petrol/CNG)",
    statusBadge: {
      label: "Ready at Stand",
      type: "ready_at_stand",
    },
    locationNote: "Staged at Pune Airport Pick-up Bay 4",
    extraKmRate: 13,
    driverName: "Vikram Singh",
    driverRating: "4.8",
    odometer: "28,100 km",
    nextService: "6,900 km",
    insuranceNote: "Valid (Aug 2026)",
    permitPucNote: "Valid & Clear",
    footerTag: {
      text: "Fuel Level: 92% (Tank Full)",
      type: "fuel",
    },
    primaryAction: {
      label: "Instant Dispatch",
      style: "black",
    },
  },
  {
    id: "MH-12-UR-3030",
    regNumber: "MH-12-UR-3030",
    model: "Force Urbania 17-Seater Luxury Commuter",
    statusBadge: {
      label: "Corporate Shuttle",
      type: "corporate_shuttle",
    },
    locationNote: "Assigned: Tech Mahindra Magarpatta Contract",
    extraKmRate: 24,
    driverName: "Anand Shinde",
    driverRating: "5.0",
    odometer: "19,400 km",
    nextService: "5,600 km",
    insuranceNote: "Tourist All-India",
    permitPucNote: "17 + 1 Recliner",
    footerTag: {
      text: "Scheduled next: 06:30 PM Pickup",
      type: "schedule",
    },
    primaryAction: {
      label: "Schedule",
      style: "outline",
    },
  },
  {
    id: "MH-12-XG-7744",
    regNumber: "MH-12-XG-7744",
    model: "Toyota Innova Hycross Hybrid VX",
    statusBadge: {
      label: "Service Due • Overdue 180 km",
      type: "service_due",
    },
    locationNote: "Booked for Thane Toyota Workshop (Slot 11:00 AM)",
    extraKmRate: 18,
    driverName: "Gopal Jadhav",
    driverRating: "4.9",
    odometer: "49,820 km",
    nextService: "Exceeded 180 km",
    isServiceOverdue: true,
    insuranceNote: "Valid",
    permitPucNote: "Expiring in 4 days",
    pucExpiring: true,
    footerTag: {
      text: "Flagged: Block from long multi-day dispatch",
      type: "warning",
    },
    primaryAction: {
      label: "Log Service",
      style: "black",
    },
  },
];

export default function VehiclesClient({ initialVehicles }: VehiclesClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const formRef = useRef<HTMLDivElement>(null);

  // Form state pre-loaded with reference values
  const initialForm = {
    registrationNumber: "MH-12-RN-4402",
    name: "Toyota Innova Crysta ZX",
    type: "SUV / MUV (Innova, Ertiga)",
    extraKmRate: 16,
    currentKm: 42850,
    nextServiceKm: 45000,
    insuranceExpiry: "2026-11-14",
    permitExpiry: "2027-03-30",
    pollutionExpiry: "2025-11-12",
    fitnessExpiry: "2026-05-20",
    status: "active" as Vehicle["status"],
    assignedDriver: "Rajesh Kumar (D-102)",
    notes: "7-Seater, Dual AC, Carrier Rack, FASTag: 3416-8922-8110",
  };

  const [form, setForm] = useState(initialForm);

  // Maintenance Runway Calculation
  const maintenanceRunwayKm = Math.max(0, (Number(form.nextServiceKm) || 0) - (Number(form.currentKm) || 0));
  const maintenancePct = Math.min(100, Math.max(10, Math.round(((Number(form.currentKm) || 0) / (Number(form.nextServiceKm) || 1)) * 100)));

  const handleEdit = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type || "SUV / MUV (Innova, Ertiga)",
      extraKmRate: v.extraKmRate || 16,
      currentKm: v.currentKm || 42850,
      nextServiceKm: v.nextServiceKm || 45000,
      insuranceExpiry: v.insuranceExpiry || "2026-11-14",
      permitExpiry: v.permitExpiry || "2027-03-30",
      pollutionExpiry: v.pollutionExpiry || "2025-11-12",
      fitnessExpiry: "2026-05-20",
      status: v.status || "active",
      assignedDriver: "Rajesh Kumar (D-102)",
      notes: v.notes || "7-Seater, Dual AC, Carrier Rack, FASTag: 3416-8922-8110",
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const normalizedReg = normalizeRegNumber(form.registrationNumber);
      const vehiclePayload = {
        name: form.name,
        type: form.type,
        registrationNumber: normalizedReg,
        registrationNumberNormalized: normalizedReg.replace(/[^A-Z0-9]/g, ""),
        extraKmRate: Number(form.extraKmRate),
        currentKm: Number(form.currentKm),
        nextServiceKm: Number(form.nextServiceKm),
        insuranceExpiry: form.insuranceExpiry,
        permitExpiry: form.permitExpiry,
        pollutionExpiry: form.pollutionExpiry,
        status: form.status,
        notes: form.notes,
      };

      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehiclePayload);
        setVehicles((prev) =>
          prev.map((v) => (v.id === editingVehicleId ? { ...v, ...vehiclePayload } : v))
        );
        setFeedback({ message: "Vehicle profile and telemetry updated successfully!", type: "success" });
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
        setFeedback({ message: "New fleet vehicle registered into active roster!", type: "success" });
      }

      setForm(initialForm);
    } catch (err: unknown) {
      console.error("Save vehicle error:", err);
      const msg = (err as Error)?.message || "Failed to save vehicle";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Convert real vehicles to Roster items
  const combinedRoster = useMemo(() => {
    if (vehicles && vehicles.length > 0) {
      const mapped: RosterItem[] = vehicles.map((v, idx) => {
        const isDue = (v.nextServiceKm && v.currentKm >= v.nextServiceKm) || v.status === "service_due";
        const diff = (v.nextServiceKm || 45000) - (v.currentKm || 0);

        return {
          id: v.id,
          regNumber: v.registrationNumber,
          model: v.name || "Fleet Commercial Unit",
          statusBadge: {
            label: isDue
              ? `Service Due • Overdue ${Math.abs(diff)} km`
              : v.status === "active"
              ? "Active • On Route"
              : "Ready at Stand",
            type: isDue ? "service_due" : v.status === "active" ? "active_on_route" : "ready_at_stand",
          },
          locationNote: idx % 2 === 0 ? "Pune Central ➔ Mumbai T2 Airport" : "Staged at Pune Airport Pick-up Bay 4",
          extraKmRate: v.extraKmRate || 16,
          driverName: idx === 0 ? "Rajesh Kumar" : idx === 1 ? "Vikram Singh" : "Anand Shinde",
          driverRating: (4.8 + (idx % 3) * 0.1).toFixed(1),
          odometer: `${(v.currentKm || 42850).toLocaleString("en-IN")} km`,
          nextService: diff > 0 ? `${diff.toLocaleString("en-IN")} km` : `Exceeded ${Math.abs(diff)} km`,
          isServiceOverdue: diff <= 0,
          insuranceNote: v.insuranceExpiry ? `Valid (${v.insuranceExpiry.slice(0, 7)})` : "Valid (Nov 2026)",
          permitPucNote: v.permitExpiry ? "All Verified" : "Valid & Clear",
          footerTag: {
            text: isDue ? "Flagged: Block from long multi-day dispatch" : "FASTag Active (₹2,400)",
            type: isDue ? "warning" : "fastag",
          },
          primaryAction: {
            label: isDue ? "Log Service" : "Assign Trip",
            style: isDue ? "black" : "blue",
          },
          rawVehicle: v,
        };
      });

      return [...mapped, ...DEFAULT_ROSTER_ITEMS];
    }
    return DEFAULT_ROSTER_ITEMS;
  }, [vehicles]);

  const filteredRoster = useMemo(() => {
    return combinedRoster.filter((item) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          item.regNumber.toLowerCase().includes(query) ||
          item.model.toLowerCase().includes(query) ||
          item.driverName.toLowerCase().includes(query) ||
          item.locationNote.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active" && item.statusBadge.type !== "active_on_route") return false;
        if (statusFilter === "ready" && item.statusBadge.type !== "ready_at_stand") return false;
        if (statusFilter === "service" && item.statusBadge.type !== "service_due") return false;
      }

      return true;
    });
  }, [combinedRoster, search, statusFilter]);

  const handleExportCSV = () => {
    const data = filteredRoster.map((item) => ({
      "Registration Number": item.regNumber,
      Model: item.model,
      Status: item.statusBadge.label,
      "Driver Name": item.driverName,
      Odometer: item.odometer,
      "Next Service": item.nextService,
      Insurance: item.insuranceNote,
      "Permit / PUC": item.permitPucNote,
    }));
    exportToCSV(data, `Fleet_Audit_Roster_${new Date().toISOString().split("T")[0]}`);
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Breadcrumb Subtitle & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Vehicle Management
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 28 Registered Units
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage fleet assets, service schedules, insurance validity, and compliance permits across operational zones.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Fleet Audit</span>
          </button>
          <button
            onClick={scrollToForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle to Fleet</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* 2. Top 4 KPI Bento Cards with Accent Lines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL VEHICLES */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Vehicles
              </span>
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                28
              </div>
              <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                +3 this month
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Fleet assets recorded</span>
              <span className="text-slate-900 font-bold">100% On-grid</span>
            </div>
            <div className="w-full h-1 bg-blue-600 rounded-full mt-2.5" />
          </div>
        </div>

        {/* ACTIVE VEHICLES */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Vehicles
              </span>
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                24
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                85.7% Roadworthy
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Currently in operation</span>
              <span className="text-emerald-700 font-bold">20 En Route</span>
            </div>
            <div className="w-full h-1 bg-emerald-500 rounded-full mt-2.5" />
          </div>
        </div>

        {/* SERVICE DUE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Service Due
              </span>
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                03
              </div>
              <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Next 7 Days
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Odometer maintenance threshold</span>
              <span className="text-amber-700 font-bold">1 Critical</span>
            </div>
            <div className="w-full h-1 bg-amber-500 rounded-full mt-2.5" />
          </div>
        </div>

        {/* EXPIRING DOCUMENTS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Expiring Documents
              </span>
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                02
              </div>
              <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                &lt; 15 Days
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Insurance, Permit or PUC</span>
              <span className="text-rose-700 font-bold">Action Needed</span>
            </div>
            <div className="w-full h-1 bg-rose-500 rounded-full mt-2.5" />
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Register Fleet Vehicle Form (5 Cols) */}
        <div ref={formRef} className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Register Fleet Vehicle</h2>
                  <p className="text-xs text-slate-500">
                    Log asset specs, extra km rates & compliance expiry dates
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600">
                v2.4 Active
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Registration Number & Vehicle Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="MH-12-RN-4402"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Vehicle Name / Model *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="Toyota Innova Crysta ZX"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Vehicle Type & Default Extra KM Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Vehicle Type *
                  </label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="SUV / MUV (Innova, Ertiga)">SUV / MUV (Innova, Ertiga)</option>
                      <option value="Sedan (Dzire, Amaze)">Sedan (Dzire, Amaze)</option>
                      <option value="Maxi-Cab (Urbania, Winger)">Maxi-Cab (Urbania, Winger)</option>
                      <option value="Hatchback (WagonR, Tiago)">Hatchback (WagonR, Tiago)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Default Extra KM Rate (₹) *
                  </label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 font-bold mr-1 text-xs">₹</span>
                    <input
                      type="number"
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">/ km</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Current Odometer & Next Service Due */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Current Odometer (KM)
                  </label>
                  <input
                    type="number"
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
                    value={form.nextServiceKm}
                    onChange={(e) => setForm({ ...form, nextServiceKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Maintenance Runway Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Maintenance Runway:</span>
                  <span className="text-slate-900 font-bold font-mono">
                    {maintenanceRunwayKm.toLocaleString("en-IN")} KM remaining
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${maintenancePct}%` }}
                  />
                </div>
              </div>

              {/* Inset Box: Compliance & Documents Expiry */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-bold">Compliance & Documents Expiry</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    4 Monitored
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Insurance */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Insurance Expiry</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                        240d left
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.insuranceExpiry}
                        onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Permit */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Permit Validity</span>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                        AITP Valid
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.permitExpiry}
                        onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Pollution */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Pollution (PUC)</span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded">
                        Due Soon
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.pollutionExpiry}
                        onChange={(e) => setForm({ ...form, pollutionExpiry: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Fitness */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Fitness Certificate</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                        Valid
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.fitnessExpiry}
                        onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Status & Assigned Driver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Status *
                  </label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle["status"] })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="active">Active (Ready for Dispatch)</option>
                      <option value="service_due">Service Due</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    value={form.assignedDriver}
                    onChange={(e) => setForm({ ...form, assignedDriver: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 5: Notes & FASTag */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notes / Amenities / FASTag ID
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Save Vehicle to Fleet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback({ message: "Vehicle saved as inactive draft.", type: "success" })}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Save as Inactive Draft
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Fleet Roster Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Fleet Roster</h2>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  Showing {Math.min(filteredRoster.length, 4)} of {filteredRoster.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search vehicle or reg..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-48 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Status (28)</option>
                    <option value="active">Active On-Route</option>
                    <option value="ready">Ready at Stand</option>
                    <option value="service">Service Due</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1 rounded ${viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400"}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400"}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* List of Vehicle Cards */}
            <div className="space-y-4">
              {filteredRoster.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/80 hover:bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xs transition-all space-y-4"
                >
                  {/* Top line of Vehicle Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          item.statusBadge.type === "service_due"
                            ? "bg-amber-100 text-amber-700"
                            : item.statusBadge.type === "corporate_shuttle"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {item.statusBadge.type === "corporate_shuttle" ? (
                          <Bus className="w-4 h-4" />
                        ) : item.statusBadge.type === "service_due" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 font-mono">
                            {item.regNumber}
                          </span>

                          {/* Status Badge */}
                          {item.statusBadge.type === "active_on_route" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {item.statusBadge.label}
                            </span>
                          )}
                          {item.statusBadge.type === "ready_at_stand" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {item.statusBadge.label}
                            </span>
                          )}
                          {item.statusBadge.type === "corporate_shuttle" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {item.statusBadge.label}
                            </span>
                          )}
                          {item.statusBadge.type === "service_due" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {item.statusBadge.label}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-800 mt-0.5">{item.model}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.locationNote}</span>
                        </div>
                      </div>
                    </div>

                    {/* Extra km rate & driver */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-blue-600 font-display">
                        ₹{item.extraKmRate} <span className="text-[10px] text-slate-400 font-normal">/ extra km</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-semibold flex items-center justify-end gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{item.driverRating} {item.driverName}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Metrics Strip */}
                  <div className="grid grid-cols-4 gap-2 py-2 px-3 bg-white rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Odometer
                      </div>
                      <div className="font-bold text-slate-900 font-mono mt-0.5">{item.odometer}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Next Service In
                      </div>
                      <div
                        className={`font-bold font-mono mt-0.5 ${
                          item.isServiceOverdue ? "text-rose-600" : "text-amber-600"
                        }`}
                      >
                        {item.nextService}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Insurance
                      </div>
                      <div className="font-bold text-emerald-600 mt-0.5">{item.insuranceNote}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Permit / PUC
                      </div>
                      <div
                        className={`font-bold mt-0.5 ${
                          item.pucExpiring ? "text-rose-600" : "text-slate-700"
                        }`}
                      >
                        {item.permitPucNote}
                      </div>
                    </div>
                  </div>

                  {/* Footer Tag & Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {item.footerTag.type === "fastag" && (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-slate-600">{item.footerTag.text}</span>
                        </>
                      )}
                      {item.footerTag.type === "fuel" && (
                        <>
                          <Fuel className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-slate-600">{item.footerTag.text}</span>
                        </>
                      )}
                      {item.footerTag.type === "schedule" && (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-slate-600">{item.footerTag.text}</span>
                        </>
                      )}
                      {item.footerTag.type === "warning" && (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-amber-700">{item.footerTag.text}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.statusBadge.type === "service_due" ? (
                        <>
                          <button
                            onClick={() => setFeedback({ message: `PUC Renewal initiated for ${item.regNumber}`, type: "success" })}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Renew PUC
                          </button>
                          <button
                            onClick={() => {
                              if (item.rawVehicle) handleEdit(item.rawVehicle);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => alert(`Opening service log for ${item.regNumber}`)}
                            className="px-3 py-1.5 bg-[#18181B] hover:bg-black text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Log Service
                          </button>
                        </>
                      ) : item.statusBadge.type === "corporate_shuttle" ? (
                        <>
                          <button
                            onClick={() => alert(`Passenger Manifest for ${item.regNumber}`)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Manifest
                          </button>
                          <button
                            onClick={() => {
                              if (item.rawVehicle) handleEdit(item.rawVehicle);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Details
                          </button>
                          <Link
                            href="/travel/trips"
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Schedule
                          </Link>
                        </>
                      ) : item.statusBadge.type === "ready_at_stand" ? (
                        <>
                          <button
                            onClick={() => {
                              if (item.rawVehicle) handleEdit(item.rawVehicle);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Details
                          </button>
                          <Link
                            href="/travel/trips"
                            className="px-3 py-1.5 bg-[#18181B] hover:bg-black text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Instant Dispatch
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => alert(`Service log for ${item.regNumber}`)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Service Log
                          </button>
                          <button
                            onClick={() => {
                              if (item.rawVehicle) handleEdit(item.rawVehicle);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                          >
                            Details
                          </button>
                          <Link
                            href="/travel/trips"
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                          >
                            Assign Trip
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div>Showing 1 to 4 of 28 fleet vehicles</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(1)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                    currentPage === 1
                      ? "bg-[#18181B] text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                    currentPage === 2
                      ? "bg-[#18181B] text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  2
                </button>
                <button
                  onClick={() => setCurrentPage(3)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                    currentPage === 3
                      ? "bg-[#18181B] text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button
                  onClick={() => setCurrentPage(7)}
                  className="w-7 h-7 rounded-lg border border-slate-200 font-bold text-xs flex items-center justify-center text-slate-700 hover:bg-slate-50"
                >
                  7
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(7, p + 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom 3 Strategic Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 85.7% Fleet Utilization */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-blue-600 border-t-slate-200 flex items-center justify-center font-extrabold text-xs text-slate-900 shrink-0">
            86%
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-900">85.7% Fleet Utilization</div>
            <div className="text-xs text-slate-500 mt-0.5">
              24 of 28 units dispatched or scheduled today
            </div>
          </div>
        </div>

        {/* Card 2: FASTAG FLEET BALANCE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                FASTag Fleet Balance
              </div>
              <div className="text-xl font-extrabold text-slate-900 font-display mt-0.5">
                ₹18,450.00
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Min threshold: ₹5,000</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            Auto-Topup ON
          </span>
        </div>

        {/* Card 3: Upcoming Maintenance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900">Upcoming Maintenance</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              3 Queued
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-700 truncate">
              MH-12-XG-7744 (Tomorrow)
            </div>
            <div className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-700 truncate">
              MH-14-EA-1120 (Friday)
            </div>
          </div>
        </div>
      </div>

      {/* 5. Persistent Modern Footer */}
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
