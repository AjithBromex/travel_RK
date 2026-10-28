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
  Gauge,
  Calculator,
  Play,
  Link as LinkIcon,
  MessageSquare,
  Edit,
  Printer,
  FileText,
  Star,
  Check,
  RotateCcw,
  GitBranch,
  X,
  Coins,
} from "lucide-react";
import { formatINR, formatDate, calculateTripFare, exportToCSV } from "@/lib/utils";
import type { Trip, Vehicle, TripStatus } from "@/types";
import { createTrip, updateTrip, deleteTrip } from "@/services/trips.service";

interface TripsClientProps {
  initialTrips: Trip[];
  vehicles: Vehicle[];
}

interface DispatchFeedItem {
  id: string;
  tripCode: string;
  statusBadge: {
    label: string;
    type: "en_route" | "confirmed" | "payment_due" | "fulfilled";
  };
  timeSubtext: string;
  grossAmount: number;
  paymentTag: {
    label: string;
    type: "adv" | "paid_full" | "partially" | "closed";
  };
  customerName: string;
  origin: string;
  destination: string;
  vehicleLabel: string;
  driverInitials: string;
  driverName: string;
  driverRating: string;
  rawTrip?: Trip;
}

const DEFAULT_DISPATCH_ITEMS: DispatchFeedItem[] = [
  {
    id: "TR-8921",
    tripCode: "TR-8921",
    statusBadge: {
      label: "En Route (Expwy KM 48)",
      type: "en_route",
    },
    timeSubtext: "Departure: Today, 08:30 AM",
    grossAmount: 6800,
    paymentTag: {
      label: "(Adv: ₹3,000)",
      type: "adv",
    },
    customerName: "Apex Global Logistics",
    origin: "Pune (Hinjewadi)",
    destination: "Mumbai BKC Tollway",
    vehicleLabel: "Vehicle: Toyota Innova Crysta (MH-12-RN-4402)",
    driverInitials: "RK",
    driverName: "Rajesh Kumar",
    driverRating: "4.9",
  },
  {
    id: "TR-8922",
    tripCode: "TR-8922",
    statusBadge: {
      label: "Confirmed Departure",
      type: "confirmed",
    },
    timeSubtext: "Scheduled: Today, 02:00 PM",
    grossAmount: 4200,
    paymentTag: {
      label: "Paid Full",
      type: "paid_full",
    },
    customerName: "Dr. Sunita Deshmukh",
    origin: "Pune Airport (PNQ)",
    destination: "Lonavala Highland Resort",
    vehicleLabel: "Vehicle: Maruti Suzuki Ertiga (MH-14-BT-9108)",
    driverInitials: "VS",
    driverName: "Vikram Singh",
    driverRating: "4.8",
  },
  {
    id: "TR-8920",
    tripCode: "TR-8920",
    statusBadge: {
      label: "Payment Due (₹8,500)",
      type: "payment_due",
    },
    timeSubtext: "Completed Yesterday, 06:15 PM",
    grossAmount: 14500,
    paymentTag: {
      label: "Partially Paid",
      type: "partially",
    },
    customerName: "Reliance Tech Parks (Corp Shuttle)",
    origin: "BKC Complex Mumbai",
    destination: "Nashik City Center",
    vehicleLabel: "Vehicle: Force Urbania 17-Seater (MH-12-UR-3030)",
    driverInitials: "AS",
    driverName: "Anand Shinde",
    driverRating: "5.0",
  },
  {
    id: "TR-8919",
    tripCode: "TR-8919",
    statusBadge: {
      label: "Fulfilled & Settled",
      type: "fulfilled",
    },
    timeSubtext: "Completed 26 Oct",
    grossAmount: 9800,
    paymentTag: {
      label: "Closed",
      type: "closed",
    },
    customerName: "Kavita Sharma & Family",
    origin: "Thane West",
    destination: "Shirdi Temple Direct",
    vehicleLabel: "Vehicle: Toyota Hycross (MH-12-XG-7744)",
    driverInitials: "GJ",
    driverName: "Gopal Jadhav",
    driverRating: "4.9",
  },
];

export default function TripsClient({ initialTrips, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  // Form State matching the visual reference
  const initialFormState = {
    tripDate: "2026-10-28",
    vehicleId: vehicles[0]?.id || "v-innova",
    vehicleName: vehicles[0]?.name ? `${vehicles[0].name} (${vehicles[0].registrationNumber})` : "Toyota Innova Crysta (MH-12-RN-4402)",
    driverName: "Rajesh Kumar",
    driverAgreedPay: 1200,
    customerName: "Ramesh Patil",
    customerPhone: "+91 98765 43210",
    from: "Pune",
    to: "Mumbai",
    startingKm: 14250,
    endingKm: 14580,
    includedKm: 300,
    extraKmRate: 18,
    tollAllowance: 480,
    baseFare: 5500,
    advanceReceived: 2000,
    status: "scheduled" as TripStatus,
    notes: "Executive dispatch for Pune-Mumbai corridor with automated toll clearance.",
  };

  const [form, setForm] = useState(initialFormState);

  // Auto calculate bill amount
  const calculations = useMemo(() => {
    const start = Number(form.startingKm) || 0;
    const end = Number(form.endingKm) || 0;
    const included = Number(form.includedKm) || 0;
    const rate = Number(form.extraKmRate) || 0;
    const toll = Number(form.tollAllowance) || 0;
    const base = Number(form.baseFare) || 0;

    const actualDist = Math.max(0, end - start);
    const extraKm = Math.max(0, actualDist - included);
    const extraCost = extraKm * rate;
    const totalEstimate = base + extraCost + toll;

    return {
      actualDist,
      extraKm,
      extraCost,
      totalEstimate: totalEstimate > 0 ? totalEstimate : 6800,
    };
  }, [form.startingKm, form.endingKm, form.includedKm, form.extraKmRate, form.tollAllowance, form.baseFare]);

  // Handle vehicle select change
  const handleVehicleChange = (vehicleId: string) => {
    const selected = vehicles.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleName: selected ? `${selected.name} (${selected.registrationNumber})` : prev.vehicleName,
      extraKmRate: selected?.extraKmRate || prev.extraKmRate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const tripData = {
        tripDate: form.tripDate,
        vehicleId: form.vehicleId,
        vehicleName: form.vehicleName,
        driverName: form.driverName,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        from: form.from,
        to: form.to,
        startingKm: Number(form.startingKm),
        endingKm: Number(form.endingKm),
        includedKm: Number(form.includedKm),
        extraKmRate: Number(form.extraKmRate),
        baseFare: Number(form.baseFare),
        extraKmCharge: calculations.extraCost,
        advanceReceived: Number(form.advanceReceived),
        driverAgreedPay: Number(form.driverAgreedPay),
        totalFare: calculations.totalEstimate,
        customerPaid: Number(form.advanceReceived),
        customerBalance: calculations.totalEstimate - Number(form.advanceReceived),
        driverPaid: 0,
        driverBalance: Number(form.driverAgreedPay),
        status: form.status,
        notes: form.notes,
      };

      if (editingTripId) {
        await updateTrip(editingTripId, tripData);
        setTrips((prev) =>
          prev.map((t) => (t.id === editingTripId ? { ...t, ...tripData } : t))
        );
        setFeedback({ message: "Trip details updated successfully!", type: "success" });
        setEditingTripId(null);
      } else {
        const newId = await createTrip(tripData);
        const newTrip: Trip = {
          id: newId,
          tripNumber: `TR-${Math.floor(8920 + Math.random() * 80)}`,
          ...tripData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTrips((prev) => [newTrip, ...prev]);
        setFeedback({ message: "New trip dispatched & recorded to active ledger!", type: "success" });
      }

      setForm(initialFormState);
    } catch (err: unknown) {
      console.error("Trip save error:", err);
      const msg = (err as Error)?.message || "Failed to schedule trip";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Convert real trips to Feed Item display format
  const combinedFeedItems = useMemo(() => {
    if (trips && trips.length > 0) {
      const mappedDbItems: DispatchFeedItem[] = trips.map((t, idx) => {
        const gross = Number(t.totalFare) || 6800;
        const adv = Number(t.advanceReceived) || 0;
        const isCompleted = t.status === "completed";
        const isInProgress = t.status === "in_progress";

        let statusBadgeType: DispatchFeedItem["statusBadge"]["type"] = "confirmed";
        let statusBadgeLabel = "Confirmed Departure";

        if (isInProgress) {
          statusBadgeType = "en_route";
          statusBadgeLabel = "En Route (Expwy KM 48)";
        } else if (isCompleted && t.customerBalance > 0) {
          statusBadgeType = "payment_due";
          statusBadgeLabel = `Payment Due (₹${t.customerBalance.toLocaleString("en-IN")})`;
        } else if (isCompleted) {
          statusBadgeType = "fulfilled";
          statusBadgeLabel = "Fulfilled & Settled";
        }

        let paymentTagType: DispatchFeedItem["paymentTag"]["type"] = "adv";
        let paymentTagLabel = `(Adv: ₹${adv.toLocaleString("en-IN")})`;

        if (adv >= gross) {
          paymentTagType = "paid_full";
          paymentTagLabel = "Paid Full";
        } else if (adv > 0 && adv < gross) {
          paymentTagType = "partially";
          paymentTagLabel = "Partially Paid";
        } else if (isCompleted && t.customerBalance === 0) {
          paymentTagType = "closed";
          paymentTagLabel = "Closed";
        }

        const initials = (t.driverName || "Driver")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: t.id,
          tripCode: t.tripNumber ? t.tripNumber : `TR-${8920 + idx}`,
          statusBadge: {
            label: statusBadgeLabel,
            type: statusBadgeType,
          },
          timeSubtext: t.tripDate ? `Departure: ${formatDate(t.tripDate)}` : "Departure: Today, 08:30 AM",
          grossAmount: gross,
          paymentTag: {
            label: paymentTagLabel,
            type: paymentTagType,
          },
          customerName: t.customerName || "Corporate Client",
          origin: t.from || "Pune",
          destination: t.to || "Mumbai",
          vehicleLabel: `Vehicle: ${t.vehicleName || "Toyota Innova Crysta (MH-12-RN-4402)"}`,
          driverInitials: initials || "RK",
          driverName: t.driverName || "Rajesh Kumar",
          driverRating: (4.8 + (idx % 3) * 0.1).toFixed(1),
          rawTrip: t,
        };
      });

      return [...mappedDbItems, ...DEFAULT_DISPATCH_ITEMS];
    }
    return DEFAULT_DISPATCH_ITEMS;
  }, [trips]);

  // Filter feed items
  const filteredFeedItems = useMemo(() => {
    return combinedFeedItems.filter((item) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          item.tripCode.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.origin.toLowerCase().includes(query) ||
          item.destination.toLowerCase().includes(query) ||
          item.driverName.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "en_route" && item.statusBadge.type !== "en_route") return false;
        if (statusFilter === "confirmed" && item.statusBadge.type !== "confirmed") return false;
        if (statusFilter === "payment_due" && item.statusBadge.type !== "payment_due") return false;
        if (statusFilter === "fulfilled" && item.statusBadge.type !== "fulfilled") return false;
      }

      return true;
    });
  }, [combinedFeedItems, search, statusFilter]);

  const handleExportCSV = () => {
    const data = filteredFeedItems.map((item) => ({
      "Trip Code": item.tripCode,
      Customer: item.customerName,
      Origin: item.origin,
      Destination: item.destination,
      Vehicle: item.vehicleLabel,
      Driver: item.driverName,
      "Gross Fare": item.grossAmount,
      Status: item.statusBadge.label,
    }));
    exportToCSV(data, `Dispatch_Trips_${new Date().toISOString().split("T")[0]}`);
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header with Breadcrumb Subtitle & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Fleet Logistics Console • Maharashtra West Zone
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Trip Management
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Dispatch
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage intercity trips, driver assignments, passenger manifests, and route revenue.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link
            href="/travel/payments"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Record Payment</span>
          </Link>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Report</span>
          </button>
          <button
            onClick={scrollToForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip Entry</span>
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
        {/* TOTAL TRIPS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Trips
              </span>
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                142
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                ↑ +14.2%
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>All recorded dispatches</span>
              <span className="text-slate-900 font-bold">Pune Hub</span>
            </div>
            <div className="w-full h-1 bg-slate-900 rounded-full mt-2.5" />
          </div>
        </div>

        {/* TODAY'S TRIPS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Today&apos;s Trips
              </span>
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                18
              </div>
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                📈 4 Active
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Trips scheduled today</span>
              <span className="text-blue-600 font-bold">89% on time</span>
            </div>
            <div className="w-full h-1 bg-blue-600 rounded-full mt-2.5" />
          </div>
        </div>

        {/* SCHEDULED */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Scheduled
              </span>
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                06
              </div>
              <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Pending Driver
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Upcoming departures</span>
              <span className="text-amber-700 font-bold">Next: 14:30</span>
            </div>
            <div className="w-full h-1 bg-amber-500 rounded-full mt-2.5" />
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Completed
              </span>
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                118
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                98.2% SMR
              </span>
            </div>
          </div>
          <div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 text-slate-500 font-medium">
              <span>Successfully fulfilled</span>
              <span className="text-emerald-700 font-bold">₹6.4L Collected</span>
            </div>
            <div className="w-full h-1 bg-emerald-500 rounded-full mt-2.5" />
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: New Trip Entry & Ready Drivers (5 Cols) */}
        <div ref={formRef} className="lg:col-span-5 space-y-6">
          {/* Card 1: New Trip Entry Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">New Trip Entry</h2>
                  <p className="text-xs text-slate-500">
                    Enter trip details to schedule or log a trip
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-600">
                Draft #8923
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Trip Date & Vehicle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Trip Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.tripDate}
                      onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vehicle *
                  </label>
                  <div className="relative">
                    <select
                      value={form.vehicleId}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      className="w-full appearance-none px-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="v-innova">Toyota Innova Crysta | MH-12</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.registrationNumber})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Driver Name & Driver Agreed Pay */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Driver Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.driverName}
                      onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Driver Agreed Pay (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.driverAgreedPay}
                      onChange={(e) => setForm({ ...form, driverAgreedPay: Number(e.target.value) })}
                      placeholder="1200"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <span className="text-slate-400 text-xs font-bold absolute left-2.5 top-1/2 -translate-y-1/2">
                      ₹
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Customer Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      placeholder="Ramesh Patil"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                    <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.customerPhone}
                      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Row 4: Origin & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Origin (From) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.from}
                      onChange={(e) => setForm({ ...form, from: e.target.value })}
                      placeholder="Pune"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Destination (To) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.to}
                      onChange={(e) => setForm({ ...form, to: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                      required
                    />
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Inset Box: ODOMETER & KM ALLOWANCE */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Gauge className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Odometer & KM Allowance
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        endingKm: prev.startingKm + prev.includedKm + 30,
                      }));
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Auto Calculate
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                      Start KM
                    </label>
                    <input
                      type="number"
                      value={form.startingKm}
                      onChange={(e) => setForm({ ...form, startingKm: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                      End KM
                    </label>
                    <input
                      type="number"
                      value={form.endingKm}
                      onChange={(e) => setForm({ ...form, endingKm: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                      Included KM
                    </label>
                    <input
                      type="number"
                      value={form.includedKm}
                      onChange={(e) => setForm({ ...form, includedKm: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                      Extra KM Rate (₹/km)
                    </label>
                    <input
                      type="number"
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                      Toll / Fastag Allowance
                    </label>
                    <input
                      type="number"
                      value={form.tollAllowance}
                      onChange={(e) => setForm({ ...form, tollAllowance: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Inset Box: Estimated Bill Amount */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Estimated Bill Amount:</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-display">
                  {formatINR(calculations.totalEstimate)}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Save & Dispatch Trip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback({ message: "Draft saved locally.", type: "success" })}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Ready Drivers in Pune Stand */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">Ready Drivers in Pune Stand</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                8 Available
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Anand Shinde</div>
                  <div className="text-[11px] text-slate-500">Innova • Wakad</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Santosh More</div>
                  <div className="text-[11px] text-slate-500">Ertiga • Shivajinagar</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Trips History Live Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Trips History</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Live Feed
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {Math.min(filteredFeedItems.length, 4)} of {filteredFeedItems.length} dispatch records
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer, route..."
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
                    <option value="all">All Status</option>
                    <option value="en_route">En Route</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="payment_due">Payment Due</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List of Trip Cards */}
            <div className="space-y-3.5">
              {filteredFeedItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/80 hover:bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-xs transition-all space-y-3"
                >
                  {/* Top line of card */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        {item.tripCode}
                      </span>

                      {/* Status Badges */}
                      {item.statusBadge.type === "en_route" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {item.statusBadge.label}
                        </span>
                      )}
                      {item.statusBadge.type === "confirmed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {item.statusBadge.label}
                        </span>
                      )}
                      {item.statusBadge.type === "payment_due" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {item.statusBadge.label}
                        </span>
                      )}
                      {item.statusBadge.type === "fulfilled" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          {item.statusBadge.label}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium">
                        • {item.timeSubtext}
                      </span>
                    </div>

                    {/* Amount & tag */}
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 font-display">
                        {formatINR(item.grossAmount)}
                      </span>
                      {item.paymentTag.type === "adv" && (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          {item.paymentTag.label}
                        </span>
                      )}
                      {item.paymentTag.type === "paid_full" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {item.paymentTag.label}
                        </span>
                      )}
                      {item.paymentTag.type === "partially" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {item.paymentTag.label}
                        </span>
                      )}
                      {item.paymentTag.type === "closed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.paymentTag.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Customer, Route, Vehicle & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.customerName}</div>
                      <div className="text-xs text-blue-600 font-medium mt-0.5 flex items-center gap-1.5">
                        <span>{item.origin}</span>
                        <span>➔</span>
                        <span>{item.destination}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.vehicleLabel}</div>
                    </div>

                    {/* Right action group */}
                    <div className="flex items-center gap-3">
                      {/* Driver Avatar & Name */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center text-xs font-bold">
                          {item.driverInitials}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">{item.driverName}</div>
                          <div className="text-[10px] text-amber-600 font-semibold flex items-center justify-end gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" /> {item.driverRating} Driver
                          </div>
                        </div>
                      </div>

                      {/* Action buttons matching screenshot */}
                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        {item.statusBadge.type === "payment_due" ? (
                          <>
                            <Link
                              href="/travel/payments"
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </Link>
                            <button
                              onClick={() => window.print()}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                            >
                              Invoice
                            </button>
                          </>
                        ) : item.statusBadge.type === "fulfilled" ? (
                          <>
                            <button
                              onClick={() => window.print()}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
                              title="Print log"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setFeedback({ message: `Viewing logbook for ${item.tripCode}`, type: "success" })}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                            >
                              Logbook
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigator.clipboard?.writeText(window.location.href)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
                              title="Share link"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => alert(`Calling driver: ${item.driverName}`)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
                              title="Call driver"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (item.rawTrip) {
                                  setEditingTripId(item.rawTrip.id);
                                  setForm({
                                    tripDate: item.rawTrip.tripDate || "2026-10-28",
                                    vehicleId: item.rawTrip.vehicleId || "",
                                    vehicleName: item.rawTrip.vehicleName || "",
                                    driverName: item.rawTrip.driverName || "",
                                    driverAgreedPay: item.rawTrip.driverAgreedPay || 1200,
                                    customerName: item.rawTrip.customerName || "",
                                    customerPhone: item.rawTrip.customerPhone || "",
                                    from: item.rawTrip.from || "",
                                    to: item.rawTrip.to || "",
                                    startingKm: item.rawTrip.startingKm || 0,
                                    endingKm: item.rawTrip.endingKm || 0,
                                    includedKm: item.rawTrip.includedKm || 300,
                                    extraKmRate: item.rawTrip.extraKmRate || 18,
                                    tollAllowance: 480,
                                    baseFare: item.rawTrip.baseFare || 5500,
                                    advanceReceived: item.rawTrip.advanceReceived || 0,
                                    status: item.rawTrip.status || "scheduled",
                                    notes: item.rawTrip.notes || "",
                                  });
                                  scrollToForm();
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
                            >
                              Details
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer matching reference */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div>Showing 1 to 4 of 142 operational records</div>
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
                  onClick={() => setCurrentPage(18)}
                  className="w-7 h-7 rounded-lg border border-slate-200 font-bold text-xs flex items-center justify-center text-slate-700 hover:bg-slate-50"
                >
                  18
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(18, p + 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Card: Active Sector Demand (Live Toll Gate Telemetry) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Active Sector Demand</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Live Toll Gate Telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sector 1: Pune ⇄ Mumbai Expwy */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Pune ⇄ Mumbai Expwy</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Clear
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">68 Trips</div>
            <div className="text-xs text-slate-500 mt-1">Avg Travel: 3h 15m</div>
          </div>

          {/* Sector 2: Pune ⇄ Shirdi Direct */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Pune ⇄ Shirdi Direct</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Moderate
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">32 Trips</div>
            <div className="text-xs text-slate-500 mt-1">Avg Travel: 4h 45m</div>
          </div>

          {/* Sector 3: Airport Feeder (PNQ) */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Airport Feeder (PNQ)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Surge
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-display">24 Trips</div>
            <div className="text-xs text-slate-500 mt-1">Avg Turnaround: 55m</div>
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
