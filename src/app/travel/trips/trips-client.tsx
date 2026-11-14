"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Plus,
  Download,
  CreditCard,
  Search,
  ChevronDown,
  MapPin,
  X,
  Edit2,
  Trash2,
  ArrowRight,
  LayoutGrid,
  List,
  RotateCcw,
  IndianRupee,
  Bus,
  Receipt,
  Users,
  UserCheck,
  ArrowLeftRight,
  FileText,
  Lock,
  Car,
  Clock,
} from "lucide-react";
import {
  exportToCSV,
  exportToPDF,
  formatINR,
  formatDate,
  capitalizeWords,
} from "@/lib/utils";
import type { Trip, Vehicle, TripStatus } from "@/types";
import {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  purgeOrphanedTripData,
} from "@/services/trips.service";
import { getVehicles, createVehicle } from "@/services/vehicles.service";
import {
  getStoredVehicles,
  getStoredTrips,
  subscribeDataChanged,
  isRecordConfirmed,
  isDeleted,
} from "@/lib/storage-sync";

interface TripsClientProps {
  initialTrips: Trip[];
  vehicles: Vehicle[];
}

export function getNextReceiptNumber(currentTrips: Trip[]): string {
  const stored = typeof window !== "undefined" ? getStoredTrips() : [];
  const map = new Map<string, Trip>();
  (currentTrips || []).forEach((t) => {
    if (t && (t.id || t.tripNumber)) map.set(t.id || t.tripNumber, t);
  });
  (stored || []).forEach((t) => {
    if (t && (t.id || t.tripNumber) && !map.has(t.id || t.tripNumber)) {
      map.set(t.id || t.tripNumber, t);
    }
  });
  const allTrips = Array.from(map.values());

  let maxNum = 0;
  for (const t of allTrips) {
    if (t.receiptNumber) {
      const match = t.receiptNumber.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  const next = Math.max(maxNum, allTrips.length) + 1;
  return `#${String(next).padStart(4, "0")}`;
}

export function getTripReceiptDisplay(trip: Trip, allTrips: Trip[]): string {
  if (trip.receiptNumber && trip.receiptNumber.trim() !== "") {
    return trip.receiptNumber;
  }
  const idx = allTrips.findIndex((t) => t.id === trip.id || (trip.tripNumber && t.tripNumber === trip.tripNumber));
  const sequentialNum = idx >= 0 ? allTrips.length - idx : 1;
  return `#${String(Math.max(1, sequentialNum)).padStart(4, "0")}`;
}

export default function TripsClient({ initialTrips, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState<Trip[]>(() => {
    if (initialTrips && initialTrips.length > 0) {
      return initialTrips.filter((t) => !isDeleted("trips", t.id) && (!t.tripNumber || !isDeleted("trips", t.tripNumber)));
    }
    return getStoredTrips();
  });

  const [vehicleList, setVehicleList] = useState<Vehicle[]>(() => {
    if (vehicles && vehicles.length > 0) return vehicles;
    return getStoredVehicles();
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const formRef = useRef<HTMLDivElement>(null);

  // Quick Add Vehicle Modal state inside Trips
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [quickVehicleForm, setQuickVehicleForm] = useState({
    registrationNumber: "",
    name: "",
    type: "Force Traveller",
    extraKmRate: 25,
  });
  const [quickVehicleLoading, setQuickVehicleLoading] = useState(false);

  const fetchTripsData = () => {
    getTrips(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setTrips(data);
        }
      })
      .catch((err) => {
        console.warn("[Trips] Client data hydration error:", err);
      });
  };

  const fetchVehiclesData = () => {
    getVehicles(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setVehicleList(data);
        }
      })
      .catch((err) => {
        console.warn("[Trips] Client vehicles hydration error:", err);
      });
  };

  useEffect(() => {
    fetchTripsData();
    fetchVehiclesData();
    // Clean any orphaned database records in the background
    purgeOrphanedTripData().catch(() => { });

    // Cross-page real-time sync listener
    const unsubscribe = subscribeDataChanged((entity) => {
      if (entity === "trips" || entity === "payments" || entity === "expenses" || entity === "all") {
        fetchTripsData();
      }
      if (entity === "vehicles" || entity === "all") {
        fetchVehiclesData();
      }
    });

    // Check URL parameters for preset vehicle selection
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paramVehicleId = params.get("vehicleId");
      if (paramVehicleId) {
        setForm((prev) => ({ ...prev, vehicleId: paramVehicleId }));
      }
    }

    return () => unsubscribe();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const emptyForm = {
    receiptNumber: getNextReceiptNumber(trips),
    tripDate: todayStr,
    vehicleId: vehicleList[0]?.id || vehicles[0]?.id || "",
    vehicleName: vehicleList[0]?.name
      ? `${vehicleList[0].name} (${vehicleList[0].registrationNumber})`
      : vehicles[0]?.name
        ? `${vehicles[0].name} (${vehicles[0].registrationNumber})`
        : "",
    driverName: "",
    driverPhone: "",
    driverAgreedPay: 0,
    customerName: "",
    customerPhone: "",
    from: "",
    to: "",
    startingKm: 0,
    endingKm: 0,
    includedKm: 100,
    extraKmRate: vehicleList[0]?.extraKmRate || vehicles[0]?.extraKmRate || 25,
    baseFare: 0,
    advanceReceived: 0,
    status: "scheduled" as TripStatus,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Automatically select first vehicle if form has no vehicle selected and vehicles are available
  useEffect(() => {
    if (vehicleList.length > 0 && !form.vehicleId) {
      const first = vehicleList[0];
      setForm((prev) => {
        if (prev.vehicleId) return prev;
        return {
          ...prev,
          vehicleId: first.id,
          vehicleName: first.name ? `${first.name} (${first.registrationNumber})` : first.registrationNumber,
          extraKmRate: first.extraKmRate || prev.extraKmRate || 25,
        };
      });
    }
  }, [vehicleList, form.vehicleId]);

  // Automatically increment receiptNumber to latest sequence when not editing
  useEffect(() => {
    if (!editingTripId) {
      const nextNo = getNextReceiptNumber(trips);
      setForm((prev) => {
        if (!prev.receiptNumber || /^#\d+$/.test(prev.receiptNumber)) {
          if (prev.receiptNumber !== nextNo) {
            return { ...prev, receiptNumber: nextNo };
          }
        }
        return prev;
      });
    }
  }, [trips, editingTripId]);

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
    const totalFare = Number(form.baseFare) || 0;
    const advance = Number(form.advanceReceived) || 0;
    const balance = Math.max(0, totalFare - advance);

    return {
      distance: 0,
      extraKm: 0,
      extraCharge: 0,
      totalFare,
      balance,
    };
  }, [form.baseFare, form.advanceReceived]);

  const handleVehicleChange = (vehicleId: string) => {
    const list = vehicleList.length > 0 ? vehicleList : vehicles;
    const selected = list.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      vehicleName: selected
        ? (selected.name ? `${selected.name} (${selected.registrationNumber})` : selected.registrationNumber)
        : "",
      extraKmRate: selected?.extraKmRate || prev.extraKmRate,
    }));
  };

  const handleQuickAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const reg = quickVehicleForm.registrationNumber.trim().toUpperCase();
    if (!reg) {
      setFeedback({ message: "Please enter vehicle registration number", type: "error" });
      return;
    }

    setQuickVehicleLoading(true);
    try {
      const vName = quickVehicleForm.name.trim() || reg;
      const rate = Number(quickVehicleForm.extraKmRate) || 25;
      const typeLower = (quickVehicleForm.type || "").toLowerCase();
      const detectedSeats = typeLower.includes("winger") ? 12 : typeLower.includes("traveller") ? 26 : typeLower.includes("urbania") ? 17 : typeLower.includes("tempo") ? 12 : typeLower.includes("bus") ? 45 : typeLower.includes("innova") ? 7 : 12;
      const payload: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
        registrationNumber: reg,
        registrationNumberNormalized: reg.replace(/[^A-Z0-9]/g, ""),
        name: vName,
        type: quickVehicleForm.type,
        seats: detectedSeats,
        extraKmRate: rate,
        currentKm: 0,
        nextServiceKm: 10000,
        insuranceExpiry: "",
        permitExpiry: "",
        pollutionExpiry: "",
        status: "active",
        notes: `${detectedSeats} Seats • Added via Quick Add in Trips`,
      };

      const newId = await createVehicle(payload);
      const newVehicle: Vehicle = {
        id: newId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setVehicleList((prev) => [newVehicle, ...prev]);
      setForm((prev) => ({
        ...prev,
        vehicleId: newId,
        vehicleName: `${vName} (${reg})`,
        extraKmRate: rate,
      }));

      setIsAddVehicleOpen(false);
      setQuickVehicleForm({
        registrationNumber: "",
        name: "",
        type: "Force Traveller",
        extraKmRate: 25,
      });
      setFeedback({
        message: `Vehicle ${vName} (${reg}) registered & assigned to trip!`,
        type: "success",
      });
    } catch (err) {
      console.error("Quick add vehicle error:", err);
      setFeedback({ message: "Failed to add vehicle", type: "error" });
    } finally {
      setQuickVehicleLoading(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handlePhoneKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentVal: string
  ) => {
    // Allow navigational and editing control keys
    const allowedSpecialKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedSpecialKeys.includes(e.key)) return;

    // Allow standard keyboard shortcuts (Ctrl/Cmd + A, C, V, X, Z)
    if (e.ctrlKey || e.metaKey) return;

    // Reject ANY non-digit character (only 0-9 allowed)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Check if user currently has text selected to be replaced
    const target = e.currentTarget;
    const hasSelection =
      target.selectionStart !== null &&
      target.selectionEnd !== null &&
      target.selectionStart !== target.selectionEnd;

    // Block typing more than 10 digits
    const digitsOnly = currentVal.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && !hasSelection) {
      e.preventDefault();
    }
  };

  const handlePhonePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    currentVal: string,
    setter: (val: string) => void
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text") || "";
    const cleanPasted = pastedText.replace(/\D/g, "");
    const target = e.currentTarget;
    const start = target.selectionStart ?? currentVal.length;
    const end = target.selectionEnd ?? currentVal.length;
    const before = currentVal.slice(0, start);
    const after = currentVal.slice(end);
    const combined = (before + cleanPasted + after).replace(/\D/g, "").slice(0, 10);
    setter(combined);
  };

  const handleQuickTripPreset = () => {
    setForm((prev) => ({
      ...prev,
      from: "Kerala",
      to: "Delhi",
      customerName: "Rahul",
      customerPhone: "9876543210",
      driverName: "Ramesh",
      driverPhone: "9876543210",
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
    if (trip.isConfirmed || isRecordConfirmed('trips', trip.id, trip)) {
      alert("This trip has been confirmed by Admin and cannot be edited.");
      return;
    }
    setEditingTripId(trip.id);
    setForm({
      receiptNumber: trip.receiptNumber || getTripReceiptDisplay(trip, trips),
      tripDate: trip.tripDate || todayStr,
      vehicleId: trip.vehicleId || "",
      vehicleName: trip.vehicleName || "",
      driverName: trip.driverName || "",
      driverPhone: (trip.driverPhone || "").replace(/\D/g, "").slice(0, 10),
      driverAgreedPay: trip.driverAgreedPay || 0,
      customerName: trip.customerName || "",
      customerPhone: (trip.customerPhone || "").replace(/\D/g, "").slice(0, 10),
      from: trip.from || "",
      to: trip.to || "",
      startingKm: trip.startingKm || 0,
      endingKm: trip.endingKm || 0,
      includedKm: trip.includedKm || 100,
      extraKmRate: trip.extraKmRate || 25,
      baseFare: trip.baseFare || trip.totalFare || (trip as any).amount || 0,
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
    setForm({
      ...emptyForm,
      receiptNumber: getNextReceiptNumber(trips),
    });
  };

  const handleDelete = async (trip: Trip) => {
    if (trip.isConfirmed || isRecordConfirmed('trips', trip.id, trip)) {
      alert("This trip has been confirmed by Admin and cannot be deleted.");
      return;
    }
    const confirmMessage = `Are you sure you want to remove Trip #${trip.receiptNumber || trip.tripNumber || trip.id} (${trip.from} -> ${trip.to})? All associated payments, expenses, and records will also be completely deleted from the database.`;
    if (!window.confirm(confirmMessage)) return;

    // Optimistically remove from UI immediately (instant response, zero lag!)
    const remaining = trips.filter(
      (t) =>
        t.id !== trip.id &&
        t.tripNumber !== trip.tripNumber &&
        (!trip.receiptNumber || t.receiptNumber !== trip.receiptNumber)
    );
    setTrips(remaining);
    if (editingTripId === trip.id) {
      handleCancelEdit();
    }
    setFeedback({
      message: `Trip #${trip.receiptNumber || trip.tripNumber || trip.id} removed successfully.`,
      type: "success",
    });

    try {
      await deleteTrip(trip);
    } catch (err) {
      console.error("Delete trip error:", err);
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const allVehicles = vehicleList.length > 0 ? vehicleList : vehicles;
      const selectedVehicle = allVehicles.find((v) => v.id === form.vehicleId);
      const vehicleName =
        form.vehicleName ||
        (selectedVehicle
          ? (selectedVehicle.name ? `${selectedVehicle.name} (${selectedVehicle.registrationNumber})` : selectedVehicle.registrationNumber)
          : "");

      const cleanCustomerPhone = form.customerPhone.replace(/\D/g, "");
      if (cleanCustomerPhone && cleanCustomerPhone.length !== 10) {
        setFeedback({
          message: "Customer phone must be exactly 10 digits.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const cleanDriverPhone = form.driverPhone.replace(/\D/g, "");
      if (cleanDriverPhone && cleanDriverPhone.length !== 10) {
        setFeedback({
          message: "Driver phone must be exactly 10 digits.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const assignedReceiptNo = (form.receiptNumber && form.receiptNumber.trim()) || getNextReceiptNumber(trips);

      const tripAmount = Number(form.baseFare) || 0;
      const tripPayload = {
        receiptNumber: assignedReceiptNo,
        tripDate: form.tripDate,
        vehicleId: form.vehicleId,
        vehicleName,
        driverName: form.driverName.trim(),
        driverPhone: cleanDriverPhone,
        driverAgreedPay: Number(form.driverAgreedPay) || 0,
        customerName: form.customerName.trim(),
        customerPhone: cleanCustomerPhone,
        from: form.from.trim(),
        to: form.to.trim(),
        startingKm: Number(form.startingKm) || 0,
        endingKm: Number(form.endingKm) || 0,
        includedKm: Number(form.includedKm) || 0,
        extraKmRate: Number(form.extraKmRate) || 0,
        extraKmCharge: 0,
        baseFare: tripAmount,
        totalFare: tripAmount,
        advanceReceived: Number(form.advanceReceived) || 0,
        customerPaid: Number(form.advanceReceived) || 0,
        customerBalance: Math.max(0, tripAmount - (Number(form.advanceReceived) || 0)),
        driverPaid: 0,
        driverBalance: Number(form.driverAgreedPay) || 0,
        status: form.status,
        notes: form.notes || "",
      };

      if (editingTripId) {
        await updateTrip(editingTripId, tripPayload);
        const updated = trips.map((t) =>
          t.id === editingTripId ? { ...t, ...tripPayload } : t
        );
        setTrips(updated);
        setFeedback({ message: "Trip updated successfully!", type: "success" });
        setEditingTripId(null);
        setForm({
          ...emptyForm,
          receiptNumber: getNextReceiptNumber(updated),
        });
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
        const updated = [newTrip, ...trips];
        setTrips(updated);
        setFeedback({
          message: `New trip (${assignedReceiptNo}) booked and dispatched successfully!`,
          type: "success",
        });
        setForm({
          ...emptyForm,
          receiptNumber: getNextReceiptNumber(updated),
        });
      }
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
        const receiptDisplay = getTripReceiptDisplay(t, trips).toLowerCase();
        const matches =
          receiptDisplay.includes(query) ||
          (t.receiptNumber && t.receiptNumber.toLowerCase().includes(query)) ||
          (t.tripNumber && t.tripNumber.toLowerCase().includes(query)) ||
          t.customerName.toLowerCase().includes(query) ||
          t.from.toLowerCase().includes(query) ||
          t.to.toLowerCase().includes(query) ||
          (t.driverName && t.driverName.toLowerCase().includes(query)) ||
          (t.driverPhone && t.driverPhone.toLowerCase().includes(query)) ||
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
      "Receipt #": getTripReceiptDisplay(t, trips),
      "Trip Number": t.tripNumber || t.id,
      "Trip Date": formatDate(t.tripDate),
      Customer: t.customerName,
      Phone: t.customerPhone,
      From: t.from,
      To: t.to,
      Vehicle: t.vehicleName || "-",
      Driver: t.driverName ? `${t.driverName}${t.driverPhone ? ` (${t.driverPhone})` : ""}` : "-",
      "Total Fare (INR)": t.totalFare,
      "Advance Received": t.advanceReceived,
      "Customer Balance": t.customerBalance,
      Status: t.status,
    }));
    exportToCSV(data, `Fleet_Trips_${todayStr}`);
  };

  const handleExportPDF = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export.");
      return;
    }
    const headers = [
      "Receipt #",
      "Trip ID",
      "Date",
      "Customer",
      "Route",
      "Vehicle",
      "Driver",
      "Total Fare",
      "Balance",
      "Status",
    ];
    const data = filteredTrips.map((t) => [
      getTripReceiptDisplay(t, trips),
      t.tripNumber || t.id,
      formatDate(t.tripDate),
      t.customerName,
      `${t.from} → ${t.to}`,
      t.vehicleName || "-",
      t.driverName ? `${t.driverName}${t.driverPhone ? ` (${t.driverPhone})` : ""}` : "-",
      formatINR(t.totalFare),
      formatINR(t.customerBalance),
      t.status.toUpperCase(),
    ]);

    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (Number(t.totalFare) || 0), 0);
    const totalPending = filteredTrips.reduce((sum, t) => sum + (Number(t.customerBalance) || 0), 0);
    const completedTrips = filteredTrips.filter((t) => t.status === "completed").length;

    exportToPDF({
      title: "Trips & Bookings Register",
      subtitle: `Fleet Dispatch & Bookings Master Record • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `Fleet_Trips_${todayStr}.pdf`,
      headers,
      data,
      orientation: "landscape",
      summary: [
        { label: "Total Bookings", value: String(filteredTrips.length) },
        { label: "Completed Trips", value: String(completedTrips) },
        { label: "Total Fare Billed", value: formatINR(totalRevenue) },
        { label: "Pending Balance", value: formatINR(totalPending) },
      ],
    });
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
        {/* Background Image: Scenic Mountain Highway with Fleet Vehicles */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/trips-scenic-hero.jpg"
            alt="Scenic Mountain Road Trip Highway with Fleet Vehicles"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 1500px"
            className="object-cover object-[70%_62%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the fleet vehicles and sunset bright on the right */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>


        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop) */}
        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop, Balanced 2x2 Grid on Mobile) */}
        <div className="relative z-10 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-1.5 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-[11px] sm:text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75] shrink-0" />
            <span className="truncate">New Trip</span>
          </button>

          <Link
            href="/travel/payments"
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Record Payment</span>
          </Link>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
            title="Export Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-rose-700 backdrop-blur-md border border-rose-200/80 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
            title="Download Official PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">PDF</span>
          </button>
        </div>

        {/* Left Side: Fleet Dispatch & Bookings Title */}
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
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
        className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
      >
        {/* CARD 1: TOTAL TRIPS */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#EAF2FD] text-[#1A68F8] flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  TOTAL TRIPS
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {totalTripsCount}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  All dispatches
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#EEF5FE] text-[#1A68F8] flex items-center justify-center">
                <Car className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#EEF5FE] text-[#1A68F8] items-center justify-center">
              <Car className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#1A68F8] bg-[#EEF5FE] px-2 sm:px-3 py-0.5 rounded-full border border-blue-100/70 ml-auto sm:ml-0">
              Logged
            </span>
          </div>
        </div>

        {/* CARD 2: TODAY'S SCHEDULE */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  TODAY&apos;S SCHEDULE
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {todayTripsCount}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Scheduled today
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#E6F8EF] text-[#059669] flex items-center justify-center">
                <Clock className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#E6F8EF] text-[#059669] items-center justify-center">
              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold ${todayTripsCount > 0
                ? "text-[#059669] bg-[#ECFDF5] border-emerald-100/70"
                : "text-slate-600 bg-slate-100 border-slate-200/70"
                } px-2 sm:px-3 py-0.5 rounded-full border ml-auto sm:ml-0`}
            >
              {todayTripsCount > 0 ? "Active today" : "None today"}
            </span>
          </div>
        </div>

        {/* CARD 3: COMPLETED TRIPS */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  COMPLETED TRIPS
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {completedTripsCount}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Fulfilled routes
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#EEF0FE] text-[#6366F1] flex items-center justify-center">
                <MapPin className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#EEF0FE] text-[#6366F1] items-center justify-center">
              <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#4F46E5] bg-[#EEF2FF] px-2 sm:px-3 py-0.5 rounded-full border border-indigo-100/70 ml-auto sm:ml-0">
              {completedPercent}% Done
            </span>
          </div>
        </div>

        {/* CARD 4: CUSTOMER BALANCE */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  CUSTOMER BALANCE
                </span>
                <span className="text-lg sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  ₹{totalPendingDues.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Outstanding
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#FEF3D6] text-[#D97706] flex items-center justify-center">
                <Receipt className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#FEF3D6] text-[#D97706] items-center justify-center">
              <Receipt className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold ${totalPendingDues === 0
                ? "text-[#059669] bg-[#ECFDF5] border-emerald-100/70"
                : "text-[#D97706] bg-[#FEF3D6] border-amber-200/70"
                } px-2 sm:px-3 py-0.5 rounded-full border ml-auto sm:ml-0`}
            >
              {totalPendingDues === 0 ? "All cleared" : "Pending dues"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${feedback.type === "success"
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
              {/* Row 1: Receipt No, Trip Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    RECEIPT NO
                  </label>
                  <input
                    type="text"
                    placeholder="#0001"
                    value={form.receiptNumber}
                    onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200/80 rounded-xl text-xs font-black font-mono text-blue-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-blue-400"
                  />
                </div>

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
                    placeholder="e.g. Rahul"
                    autoCapitalize="words"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: capitalizeWords(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      CUSTOMER PHONE
                    </label>
                    {form.customerPhone && (
                      <span
                        className={`text-[10px] font-bold ${form.customerPhone.length === 10
                          ? "text-emerald-600"
                          : "text-amber-600"
                          }`}
                      >
                        {form.customerPhone.length}/10 digits
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="10-digit phone number (numbers only)"
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={form.customerPhone}
                    onKeyDown={(e) => handlePhoneKeyDown(e, form.customerPhone)}
                    onPaste={(e) =>
                      handlePhonePaste(e, form.customerPhone, (val) =>
                        setForm((prev) => ({ ...prev, customerPhone: val }))
                      )
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((prev) => ({ ...prev, customerPhone: digits }));
                    }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      const sanitized = target.value.replace(/\D/g, "").slice(0, 10);
                      if (target.value !== sanitized) {
                        target.value = sanitized;
                      }
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 ${form.customerPhone && form.customerPhone.length < 10
                      ? "border-amber-300 focus:border-amber-500 focus:bg-white"
                      : "border-slate-200 focus:border-blue-500 focus:bg-white"
                      }`}
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
                    placeholder="e.g. Kerala"
                    autoCapitalize="words"
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: capitalizeWords(e.target.value) })}
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
                    placeholder="e.g. Delhi"
                    autoCapitalize="words"
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: capitalizeWords(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 4: Assigned Vehicle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    ASSIGNED VEHICLE <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-0.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Quick Add</span>
                    </button>
                    <Link
                      href="/travel/vehicles"
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Fleet</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={form.vehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-sans"
                  >
                    <option value="">Select vehicle...</option>
                    {(vehicleList.length > 0 ? vehicleList : vehicles).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name || v.registrationNumber} ({v.registrationNumber}){v.type ? ` • ${v.type}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {vehicleList.length === 0 && vehicles.length === 0 && (
                  <div className="text-[10px] text-amber-600 mt-1 flex items-center justify-between">
                    <span>No vehicles registered yet.</span>
                    <button
                      type="button"
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="font-bold underline text-blue-600 cursor-pointer"
                    >
                      + Add vehicle now
                    </button>
                  </div>
                )}
              </div>

              {/* Row 5: Driver Name & Driver Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    DRIVER NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh"
                    autoCapitalize="words"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: capitalizeWords(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      DRIVER PHONE
                    </label>
                    {form.driverPhone && (
                      <span
                        className={`text-[10px] font-bold ${form.driverPhone.length === 10
                          ? "text-emerald-600"
                          : "text-amber-600"
                          }`}
                      >
                        {form.driverPhone.length}/10 digits
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="10-digit phone number (numbers only)"
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={form.driverPhone}
                    onKeyDown={(e) => handlePhoneKeyDown(e, form.driverPhone)}
                    onPaste={(e) =>
                      handlePhonePaste(e, form.driverPhone, (val) =>
                        setForm((prev) => ({ ...prev, driverPhone: val }))
                      )
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((prev) => ({ ...prev, driverPhone: digits }));
                    }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      const sanitized = target.value.replace(/\D/g, "").slice(0, 10);
                      if (target.value !== sanitized) {
                        target.value = sanitized;
                      }
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 ${form.driverPhone && form.driverPhone.length < 10
                      ? "border-amber-300 focus:border-amber-500 focus:bg-white"
                      : "border-slate-200 focus:border-blue-500 focus:bg-white"
                      }`}
                  />
                </div>
              </div>

              {/* Row 5: Amount */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                  AMOUNT (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Enter trip amount (e.g. 5000)"
                    value={form.baseFare === 0 ? "" : form.baseFare}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      setForm((prev) => ({ ...prev, baseFare: val }));
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 font-mono"
                    required
                  />
                </div>
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
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "list"
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
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid"
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
                <div className="relative w-56 sm:w-64 h-32 sm:h-36 overflow-hidden select-none pointer-events-none">
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black font-mono text-slate-900">
                            {trip.tripNumber || trip.id.slice(0, 8)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[10px] font-black">
                            {getTripReceiptDisplay(trip, trips)}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${trip.status === "completed"
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
                        {trip.driverName && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Driver: <span className="text-slate-700 font-semibold">{trip.driverName}</span>
                            {trip.driverPhone && <span className="text-slate-400"> ({trip.driverPhone})</span>}
                          </p>
                        )}
                        {(() => {
                          const resolvedVeh =
                            trip.vehicleName ||
                            (vehicleList.find((v) => v.id === trip.vehicleId)?.name
                              ? `${vehicleList.find((v) => v.id === trip.vehicleId)?.name} (${vehicleList.find((v) => v.id === trip.vehicleId)?.registrationNumber})`
                              : vehicleList.find((v) => v.id === trip.vehicleId)?.registrationNumber);
                          if (!resolvedVeh) return null;
                          return (
                            <p className="text-[10px] text-slate-600 font-semibold mt-1 truncate flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg w-fit">
                              <Bus className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>{resolvedVeh}</span>
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400">Total:</span>
                          <span className="font-extrabold font-mono text-slate-900">
                            ₹{Number(trip.totalFare).toLocaleString("en-IN")}
                          </span>
                          {Number((trip as any).totalExpenses) > 0 && (
                            <span
                              className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1 rounded"
                              title={`Includes ₹${Number((trip as any).totalExpenses).toLocaleString("en-IN")} expenses added to trip amount`}
                            >
                              +₹{Number((trip as any).totalExpenses).toLocaleString("en-IN")} exp
                            </span>
                          )}
                          {Number(trip.advanceReceived) > 0 && (
                            <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-1 rounded">
                              Adv: ₹{Number(trip.advanceReceived).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {Number(trip.customerBalance) > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                              Due ₹{Number(trip.customerBalance).toLocaleString("en-IN")}
                            </span>
                            <Link
                              href={`/travel/payments?tripId=${trip.tripNumber || trip.id}&amount=${trip.customerBalance}&type=customer_received&stage=balance`}
                              className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-1.5 py-0.2 rounded transition-colors inline-flex items-center gap-0.5"
                              title="Record balance settlement in Payments Ledger"
                            >
                              <CreditCard className="w-2.5 h-2.5" />
                              <span>Collect Balance</span>
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {trip.isConfirmed || isRecordConfirmed('trips', trip.id, trip) ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Confirmed by Admin. Editing and deletion are locked."
                          >
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(trip)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit trip"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === trip.id}
                              onClick={() => handleDelete(trip)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete trip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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
                    className="bg-slate-50/70 hover:bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black font-mono text-slate-900">
                          {trip.tripNumber || trip.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-mono text-[11px] font-black">
                          {getTripReceiptDisplay(trip, trips)}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${trip.status === "completed"
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
                      {(() => {
                        const resolvedVeh =
                          trip.vehicleName ||
                          (vehicleList.find((v) => v.id === trip.vehicleId)?.name
                            ? `${vehicleList.find((v) => v.id === trip.vehicleId)?.name} (${vehicleList.find((v) => v.id === trip.vehicleId)?.registrationNumber})`
                            : vehicleList.find((v) => v.id === trip.vehicleId)?.registrationNumber);
                        return (
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span>{trip.customerName}</span>
                            <span>•</span>
                            <span>{trip.tripDate}</span>
                            {resolvedVeh && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                                  <Bus className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{resolvedVeh}</span>
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5 flex-wrap">
                          <span className="text-xs font-black font-mono text-slate-900">
                            ₹{Number(trip.totalFare).toLocaleString("en-IN")}
                          </span>
                          {Number((trip as any).totalExpenses) > 0 && (
                            <span
                              className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1 rounded"
                              title={`Includes ₹${Number((trip as any).totalExpenses).toLocaleString("en-IN")} expenses added to trip amount`}
                            >
                              +₹{Number((trip as any).totalExpenses).toLocaleString("en-IN")} exp
                            </span>
                          )}
                          {Number(trip.advanceReceived) > 0 && (
                            <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-1 rounded">
                              Adv: ₹{Number(trip.advanceReceived).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {Number(trip.customerBalance) > 0 && (
                          <div className="flex items-center sm:justify-end gap-1 mt-0.5">
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded block">
                              Due ₹{Number(trip.customerBalance).toLocaleString("en-IN")}
                            </span>
                            <Link
                              href={`/travel/payments?tripId=${trip.tripNumber || trip.id}&amount=${trip.customerBalance}&type=customer_received&stage=balance`}
                              className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-1.5 py-0.2 rounded transition-colors inline-flex items-center gap-0.5"
                              title="Record balance settlement in Payments Ledger"
                            >
                              <CreditCard className="w-2.5 h-2.5" />
                              <span>Collect Balance</span>
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {trip.isConfirmed || isRecordConfirmed('trips', trip.id, trip) ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Confirmed by Admin. Editing and deletion are locked."
                          >
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>Confirmed (Locked)</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(trip)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit trip"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === trip.id}
                              onClick={() => handleDelete(trip)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete trip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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

      {/* Quick Add Vehicle Modal for immediate addition inside Trips */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quick Register Vehicle</h3>
                  <p className="text-[10px] text-slate-400">Add vehicle and select it for this trip immediately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddVehicle} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registration Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH 12 AB 1234 or KL 55 AB 2525"
                  autoCapitalize="characters"
                  value={quickVehicleForm.registrationNumber}
                  onChange={(e) =>
                    setQuickVehicleForm({ ...quickVehicleForm, registrationNumber: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase tracking-wider outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Vehicle Name / Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. Force Traveller, Innova Crysta"
                  autoCapitalize="words"
                  value={quickVehicleForm.name}
                  onChange={(e) =>
                    setQuickVehicleForm({ ...quickVehicleForm, name: capitalizeWords(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={quickVehicleForm.type}
                    onChange={(e) =>
                      setQuickVehicleForm({ ...quickVehicleForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Force Traveller">Force Traveller</option>
                    <option value="Innova Crysta">Innova Crysta</option>
                    <option value="Force Urbania">Force Urbania</option>
                    <option value="Volvo Coach">Volvo Coach</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Extra KM Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quickVehicleForm.extraKmRate}
                    onChange={(e) =>
                      setQuickVehicleForm({ ...quickVehicleForm, extraKmRate: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickVehicleLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {quickVehicleLoading ? "Registering..." : "Register & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
