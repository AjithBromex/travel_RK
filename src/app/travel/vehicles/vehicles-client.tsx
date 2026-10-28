"use client";

import { useState } from "react";
import {
  Car,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatINR, normalizeRegNumber, isDateExpiringSoon } from "@/lib/utils";
import type { Vehicle } from "@/types";
import { createVehicle, updateVehicle, deleteVehicle } from "@/services/vehicles.service";

interface VehiclesClientProps {
  initialVehicles: Vehicle[];
}

export default function VehiclesClient({ initialVehicles }: VehiclesClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const initialForm = {
    registrationNumber: "",
    name: "",
    type: "Sedan",
    extraKmRate: 12,
    currentKm: 0,
    nextServiceKm: 10000,
    insuranceExpiry: "",
    permitExpiry: "",
    pollutionExpiry: "",
    status: "active" as Vehicle["status"],
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

  const handleEdit = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type || "Sedan",
      extraKmRate: v.extraKmRate || 12,
      currentKm: v.currentKm || 0,
      nextServiceKm: v.nextServiceKm || 10000,
      insuranceExpiry: v.insuranceExpiry || "",
      permitExpiry: v.permitExpiry || "",
      pollutionExpiry: v.pollutionExpiry || "",
      status: v.status || "active",
      notes: v.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingVehicleId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const normalizedReg = normalizeRegNumber(form.registrationNumber);
      const vehiclePayload = {
        ...form,
        registrationNumber: normalizedReg,
        registrationNumberNormalized: normalizedReg.replace(/[^A-Z0-9]/g, ""),
        extraKmRate: Number(form.extraKmRate),
        currentKm: Number(form.currentKm),
        nextServiceKm: Number(form.nextServiceKm),
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
        setFeedback({ message: "Vehicle added to fleet successfully!", type: "success" });
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate or remove this vehicle?")) return;
    try {
      await deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      if (editingVehicleId === id) handleCancelEdit();
    } catch {
      alert("Failed to remove vehicle");
    }
  };

  // KPIs
  const totalCount = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const serviceDueCount = vehicles.filter(
    (v) => v.status === "service_due" || (v.nextServiceKm && v.currentKm >= v.nextServiceKm)
  ).length;
  const expiringDocsCount = vehicles.filter((v) => {
    return (
      (v.insuranceExpiry && isDateExpiringSoon(v.insuranceExpiry, 30)) ||
      (v.permitExpiry && isDateExpiringSoon(v.permitExpiry, 30)) ||
      (v.pollutionExpiry && isDateExpiringSoon(v.pollutionExpiry, 30))
    );
  }).length;

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (v.type && v.type.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Vehicle Management"
        subtitle="Manage vehicles, service schedules, insurance and permits."
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vehicles"
          value={totalCount}
          icon={Car}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Fleet assets recorded"
        />
        <StatCard
          label="Active Vehicles"
          value={activeCount}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Currently roadworthy & active"
        />
        <StatCard
          label="Service Due"
          value={serviceDueCount}
          icon={Wrench}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle="Odometer near maintenance threshold"
        />
        <StatCard
          label="Expiring Documents"
          value={expiringDocsCount}
          icon={ShieldAlert}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          subtitle="Insurance, permit or PUC within 30 days"
        />
      </div>

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add/Edit Vehicle Form */}
        <div className="lg:col-span-5 card">
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {editingVehicleId ? "Edit Vehicle Details" : "Add Vehicle to Fleet"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingVehicleId ? "Modify vehicle parameters & compliance" : "Register a new vehicle with documents"}
                </p>
              </div>
            </div>
            {editingVehicleId && (
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
                <label className="label">Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-AB-1234"
                  className="input uppercase font-mono"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="label">Vehicle Name / Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innova Crysta"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Vehicle Type</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="Sedan">Sedan (Dzire, Etios)</option>
                  <option value="SUV">SUV (Innova, Ertiga)</option>
                  <option value="Tempo Traveller">Tempo Traveller (13/17 seater)</option>
                  <option value="Bus">Luxury Bus (32/45 seater)</option>
                  <option value="Hatchback">Hatchback (WagonR, Swift)</option>
                </select>
              </div>
              <div>
                <label className="label">Default Extra KM Rate (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input"
                  value={form.extraKmRate}
                  onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Current Odometer (KM)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.currentKm}
                  onChange={(e) => setForm({ ...form, currentKm: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Next Service Due at (KM)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.nextServiceKm}
                  onChange={(e) => setForm({ ...form, nextServiceKm: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Document Expiry Dates */}
            <div className="form-inset space-y-3">
              <div className="flex items-center gap-1.5 text-blue-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Compliance & Documents Expiry
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">Insurance</label>
                  <input
                    type="date"
                    className="input text-xs"
                    value={form.insuranceExpiry}
                    onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">Permit</label>
                  <input
                    type="date"
                    className="input text-xs"
                    value={form.permitExpiry}
                    onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 mb-1 block">Pollution (PUC)</label>
                  <input
                    type="date"
                    className="input text-xs"
                    value={form.pollutionExpiry}
                    onChange={(e) => setForm({ ...form, pollutionExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Status *</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle["status"] })}
                >
                  <option value="active">Active (Ready)</option>
                  <option value="service_due">Service Due</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="label">Notes / Specs</label>
                <input
                  type="text"
                  placeholder="e.g. AC 7-seater, Carrier"
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
                "Saving Vehicle..."
              ) : editingVehicleId ? (
                <>
                  <Check className="w-4 h-4" />
                  Update Vehicle Record
                </>
              ) : (
                <>
                  <Car className="w-4 h-4" />
                  Save Vehicle to Fleet
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Fleet Table */}
        <div className="lg:col-span-7 card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Fleet Roster</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Showing {filteredVehicles.length} of {vehicles.length} fleet vehicles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search vehicle or reg..."
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
                <option value="active">Active</option>
                <option value="service_due">Service Due</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No vehicles found</p>
            </div>
          ) : (
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Reg Number</th>
                    <th>Extra KM</th>
                    <th>Current KM</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => {
                    const isServiceDue =
                      v.status === "service_due" ||
                      (v.nextServiceKm > 0 && v.currentKm >= v.nextServiceKm);

                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-text-primary text-xs">{v.name}</div>
                              <div className="text-[10px] text-text-muted">{v.type || "Vehicle"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-xs font-semibold text-slate-700">
                          {v.registrationNumber}
                        </td>
                        <td className="text-xs font-mono-nums">
                          {formatINR(v.extraKmRate)}/km
                        </td>
                        <td className="text-xs font-mono-nums">
                          <div>{v.currentKm.toLocaleString()} KM</div>
                          {isServiceDue && (
                            <span className="text-[10px] text-rose-600 font-bold inline-flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Service Due
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={v.status} variant="vehicle" />
                        </td>
                        <td className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(v)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-primary"
                              title="Edit Vehicle"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-danger"
                              title="Remove Vehicle"
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
