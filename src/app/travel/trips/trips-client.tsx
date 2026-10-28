"use client";

import { useState, useMemo } from "react";
import {
  Car,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Edit,
  Eye,
  X,
  Check,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatINR, formatDate, calculateTripFare } from "@/lib/utils";
import type { Trip, Vehicle, TripStatus } from "@/types";
import { createTrip, updateTrip, deleteTrip } from "@/services/trips.service";

interface TripsClientProps {
  initialTrips: Trip[];
  vehicles: Vehicle[];
}

export default function TripsClient({ initialTrips, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const initialFormState = {
    tripDate: new Date().toISOString().split("T")[0],
    vehicleId: vehicles[0]?.id || "",
    vehicleName: vehicles[0]?.name || "",
    driverName: "",
    customerName: "",
    customerPhone: "",
    from: "",
    to: "",
    startingKm: 0,
    endingKm: 0,
    includedKm: 100,
    extraKmRate: vehicles[0]?.extraKmRate || 12,
    baseFare: 2500,
    advanceReceived: 500,
    driverAgreedPay: 1200,
    status: "scheduled" as TripStatus,
    notes: "",
  };

  const [form, setForm] = useState(initialFormState);

  // Live calculation of distance, extra km, total fare
  const calculations = useMemo(() => {
    return calculateTripFare({
      startingKm: Number(form.startingKm) || 0,
      endingKm: Number(form.endingKm) || 0,
      includedKm: Number(form.includedKm) || 0,
      extraKmRate: Number(form.extraKmRate) || 0,
      baseFare: Number(form.baseFare) || 0,
      advanceReceived: Number(form.advanceReceived) || 0,
      customerPaid: 0,
      driverAgreedPay: Number(form.driverAgreedPay) || 0,
      driverPaid: 0,
    });
  }, [
    form.startingKm,
    form.endingKm,
    form.includedKm,
    form.extraKmRate,
    form.baseFare,
    form.advanceReceived,
    form.driverAgreedPay,
  ]);

  // Handle vehicle select change
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
      tripDate: trip.tripDate || new Date().toISOString().split("T")[0],
      vehicleId: trip.vehicleId || "",
      vehicleName: trip.vehicleName || "",
      driverName: trip.driverName || "",
      customerName: trip.customerName || "",
      customerPhone: trip.customerPhone || "",
      from: trip.from || "",
      to: trip.to || "",
      startingKm: trip.startingKm || 0,
      endingKm: trip.endingKm || 0,
      includedKm: trip.includedKm || 100,
      extraKmRate: trip.extraKmRate || 12,
      baseFare: trip.baseFare || 0,
      advanceReceived: trip.advanceReceived || 0,
      driverAgreedPay: trip.driverAgreedPay || 0,
      status: trip.status || "scheduled",
      notes: trip.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingTripId(null);
    setForm(initialFormState);
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
        extraKmCharge: calculations.extraKmCharge,
        advanceReceived: Number(form.advanceReceived),
        driverAgreedPay: Number(form.driverAgreedPay),
        totalFare: calculations.totalFare,
        customerPaid: 0,
        customerBalance: calculations.customerBalance,
        driverPaid: 0,
        driverBalance: calculations.driverBalance,
        status: form.status,
        notes: form.notes,
      };

      if (editingTripId) {
        await updateTrip(editingTripId, tripData);
        setTrips((prev) =>
          prev.map((t) => (t.id === editingTripId ? { ...t, ...tripData } : t))
        );
        setFeedback({ message: "Trip updated successfully!", type: "success" });
        setEditingTripId(null);
      } else {
        const newId = await createTrip(tripData);
        const newTrip: Trip = {
          id: newId,
          tripNumber: `TRP-${Date.now().toString().slice(-6)}`,
          ...tripData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTrips((prev) => [newTrip, ...prev]);
        setFeedback({ message: "New trip scheduled successfully!", type: "success" });
      }

      setForm(initialFormState);
    } catch (err: unknown) {
      console.error("Trip save error:", err);
      const msg = (err as Error)?.message || "Failed to save trip";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip record?")) return;
    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      if (editingTripId === id) handleCancelEdit();
    } catch {
      alert("Failed to delete trip");
    }
  };

  // KPIs
  const todayStr = new Date().toISOString().split("T")[0];
  const totalTripsCount = trips.length;
  const todayTripsCount = trips.filter((t) => t.tripDate === todayStr).length;
  const scheduledCount = trips.filter((t) => t.status === "scheduled").length;
  const completedCount = trips.filter((t) => t.status === "completed").length;

  // Filtered trips
  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.from?.toLowerCase().includes(search.toLowerCase()) ||
      t.to?.toLowerCase().includes(search.toLowerCase()) ||
      t.tripNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.driverName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Trip Management"
        subtitle="Manage trips, drivers, customers and trip payments."
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Trips"
          value={totalTripsCount}
          icon={Car}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="All recorded dispatches"
        />
        <StatCard
          label="Today's Trips"
          value={todayTripsCount}
          icon={Calendar}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          subtitle="Trips scheduled today"
        />
        <StatCard
          label="Scheduled"
          value={scheduledCount}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle="Upcoming departures"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Successfully fulfilled"
        />
      </div>

      {/* Main 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trip Entry Form */}
        <div className="lg:col-span-5 card">
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {editingTripId ? "Edit Trip Details" : "New Trip Entry"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingTripId
                    ? "Update trip parameters and fares"
                    : "Enter trip details to schedule or log a trip"}
                </p>
              </div>
            </div>
            {editingTripId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary py-1 px-3 text-xs text-rose-600 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </button>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Trip Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={form.tripDate}
                  onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Vehicle *</label>
                <select
                  required
                  className="select"
                  value={form.vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                >
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registrationNumber})
                    </option>
                  ))}
                  {vehicles.length === 0 && (
                    <option value="fleet-demo">Demo Vehicle (MH-12-AB-1234)</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  className="input"
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Driver Agreed Pay (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.driverAgreedPay}
                  onChange={(e) => setForm({ ...form, driverAgreedPay: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="input"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Customer Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  className="input"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Origin (From) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune"
                  className="input"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Destination (To) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai"
                  className="input"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                />
              </div>
            </div>

            {/* Distance & Odometer */}
            <div className="form-inset space-y-3">
              <div className="flex items-center gap-1.5 text-blue-700">
                <Car className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Odometer & KM Allowance
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">Start KM</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-xs"
                    value={form.startingKm}
                    onChange={(e) => setForm({ ...form, startingKm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">End KM</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-xs"
                    value={form.endingKm}
                    onChange={(e) => setForm({ ...form, endingKm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">Included KM</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-xs"
                    value={form.includedKm}
                    onChange={(e) => setForm({ ...form, includedKm: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                <span className="text-slate-600 font-medium">
                  Distance: <strong className="text-slate-900 font-mono-nums font-bold">{calculations.distanceTraveled} KM</strong>
                </span>
                <span className="text-slate-600 font-medium">
                  Extra: <strong className="text-amber-700 font-mono-nums font-bold">{calculations.extraKm} KM</strong>
                </span>
              </div>
            </div>

            {/* Fares and Advances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Base Fare (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input font-mono-nums"
                  value={form.baseFare}
                  onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Extra KM Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input font-mono-nums"
                  value={form.extraKmRate}
                  onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Advance (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input font-mono-nums"
                  value={form.advanceReceived}
                  onChange={(e) => setForm({ ...form, advanceReceived: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Glassmorphic Summary Strip */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200/90 rounded-xl flex items-center justify-between text-xs shadow-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Total Fare</span>
                <span className="text-blue-950 font-bold text-sm font-mono-nums">
                  {formatINR(calculations.totalFare)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px] font-medium">Customer Balance</span>
                <span className="text-amber-800 font-bold text-sm font-mono-nums">
                  {formatINR(calculations.customerBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Trip Status *</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as TripStatus })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-sm font-semibold justify-center shadow-md shadow-blue-500/25"
            >
              {loading ? (
                "Saving Trip..."
              ) : editingTripId ? (
                <>
                  <Check className="w-4 h-4" />
                  Update Trip Record
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Save and Schedule Trip
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Recent Trips Table */}
        <div className="lg:col-span-7 card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Trips History</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Showing {filteredTrips.length} of {trips.length} records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search customer, route..."
                  className="input pl-8 py-1.5 text-xs w-44"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="select py-1.5 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredTrips.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No trips matching criteria</p>
            </div>
          ) : (
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th className="text-right">Fare</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id}>
                      <td className="font-semibold text-primary font-mono text-xs">
                        {trip.tripNumber || trip.id.slice(0, 8)}
                      </td>
                      <td className="text-xs whitespace-nowrap">{formatDate(trip.tripDate)}</td>
                      <td>
                        <div className="font-medium text-text-primary text-xs">{trip.customerName}</div>
                        {trip.customerPhone && (
                          <div className="text-[10px] text-text-muted">{trip.customerPhone}</div>
                        )}
                      </td>
                      <td className="text-xs">
                        <div className="font-medium">
                          {trip.from} → {trip.to}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {trip.vehicleName || "Fleet Vehicle"}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={trip.status} variant="trip" />
                      </td>
                      <td className="text-right font-medium font-mono-nums text-xs">
                        <div>{formatINR(trip.totalFare)}</div>
                        {trip.customerBalance > 0 && (
                          <div className="text-[10px] text-amber-600 font-bold">
                            Due: {formatINR(trip.customerBalance)}
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingTrip(trip)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            title="View Trip Summary"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(trip)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-primary"
                            title="Edit Trip"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-danger"
                            title="Delete Trip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details View Modal */}
      {viewingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    Trip {viewingTrip.tripNumber || viewingTrip.id}
                  </h3>
                  <p className="text-xs text-slate-500">{formatDate(viewingTrip.tripDate)}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingTrip(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Customer</span>
                <span className="font-semibold text-slate-900">{viewingTrip.customerName}</span>
                {viewingTrip.customerPhone && <div className="text-slate-500">{viewingTrip.customerPhone}</div>}
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Driver</span>
                <span className="font-semibold text-slate-900">{viewingTrip.driverName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Vehicle</span>
                <span className="font-semibold text-slate-900">{viewingTrip.vehicleName || "Fleet Vehicle"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={viewingTrip.status} variant="trip" />
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Route</span>
                <span className="font-semibold text-slate-900">{viewingTrip.from} → {viewingTrip.to}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Odometer</span>
                <span className="font-semibold text-slate-900 font-mono-nums">
                  {viewingTrip.startingKm} - {viewingTrip.endingKm} KM
                </span>
              </div>
            </div>

            <div className="form-inset space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Base Fare:</span>
                <span className="font-semibold font-mono-nums">{formatINR(viewingTrip.baseFare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Extra KM Charge:</span>
                <span className="font-semibold font-mono-nums">{formatINR(viewingTrip.extraKmCharge || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-2 font-bold text-sm">
                <span className="text-slate-900">Total Fare:</span>
                <span className="text-blue-600 font-mono-nums">{formatINR(viewingTrip.totalFare)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Advance Received:</span>
                <span className="font-mono-nums">{formatINR(viewingTrip.advanceReceived)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Customer Due:</span>
                <span className="font-mono-nums">{formatINR(viewingTrip.customerBalance)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingTrip(null)}
                className="btn btn-secondary px-6 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
