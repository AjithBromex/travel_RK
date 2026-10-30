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
  Camera,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Check,
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

// Client-side automatic rectangular crop (16:9 landscape aspect ratio)
async function autoCropToRectangle(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload an image file (JPG, PNG, WEBP)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unable to load selected image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is not available"));
          return;
        }

        const targetAspect = 16 / 9; // Clean landscape rectangular ratio
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const imgAspect = imgWidth / imgHeight;

        let srcX = 0;
        let srcY = 0;
        let srcW = imgWidth;
        let srcH = imgHeight;

        // Auto center-crop to rectangular aspect ratio
        if (imgAspect > targetAspect) {
          // Source is wider than target rectangle -> crop horizontal edges centered
          srcW = Math.round(imgHeight * targetAspect);
          srcX = Math.round((imgWidth - srcW) / 2);
        } else {
          // Source is taller than target rectangle -> crop vertical edges centered
          srcH = Math.round(imgWidth / targetAspect);
          srcY = Math.round((imgHeight - srcH) / 2);
        }

        // Standard crisp rectangular dimensions
        const outWidth = 960;
        const outHeight = Math.round(outWidth / targetAspect); // 540

        canvas.width = outWidth;
        canvas.height = outHeight;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outWidth, outHeight);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outWidth, outHeight);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
  photoUrl: "",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);

  // Interactive Crop Adjuster State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string>("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropImgDims, setCropImgDims] = useState<{ width: number; height: number; natW: number; natH: number } | null>(null);

  const cropViewportRef = useRef<HTMLDivElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const isCropDraggingRef = useRef(false);
  const cropStartPosRef = useRef({ x: 0, y: 0 });
  const cropStartPanRef = useRef({ x: 0, y: 0 });

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

  const updateCropPan = (newX: number, newY: number, currentZoom = cropZoom) => {
    if (!cropViewportRef.current || !cropImgDims) return;
    const W_vp = cropViewportRef.current.clientWidth;
    const H_vp = cropViewportRef.current.clientHeight;

    const renderW = cropImgDims.width * currentZoom;
    const renderH = cropImgDims.height * currentZoom;

    const maxPanX = Math.max(0, (renderW - W_vp) / 2);
    const maxPanY = Math.max(0, (renderH - H_vp) / 2);

    const clampedX = Math.min(maxPanX, Math.max(-maxPanX, newX));
    const clampedY = Math.min(maxPanY, Math.max(-maxPanY, newY));

    setCropPan({ x: clampedX, y: clampedY });
  };

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(newZoom.toFixed(2))));
    setCropZoom(clampedZoom);
    updateCropPan(cropPan.x, cropPan.y, clampedZoom);
  };

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!cropViewportRef.current) return;
    const W_vp = cropViewportRef.current.clientWidth || 540;
    const H_vp = cropViewportRef.current.clientHeight || Math.round(W_vp * 9 / 16);
    const natW = img.naturalWidth || W_vp;
    const natH = img.naturalHeight || H_vp;

    const imgAspect = natW / natH;
    const vpAspect = W_vp / H_vp;

    let fitScale = 1;
    if (imgAspect > vpAspect) {
      fitScale = H_vp / natH;
    } else {
      fitScale = W_vp / natW;
    }

    const baseW = natW * fitScale;
    const baseH = natH * fitScale;

    setCropImgDims({ width: baseW, height: baseH, natW, natH });
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!cropImgRef.current || !cropViewportRef.current || !cropImgDims) return;
    const W_vp = cropViewportRef.current.clientWidth;
    const H_vp = cropViewportRef.current.clientHeight;
    const { natW, natH } = cropImgDims;

    const imgAspect = natW / natH;
    const vpAspect = W_vp / H_vp;

    let fitScale = 1;
    if (imgAspect > vpAspect) {
      fitScale = H_vp / natH;
    } else {
      fitScale = W_vp / natW;
    }

    const scaleFactor = fitScale * cropZoom;

    const cropNaturalW = W_vp / scaleFactor;
    const cropNaturalH = H_vp / scaleFactor;

    const centerNaturalX = (natW / 2) - (cropPan.x / scaleFactor);
    const centerNaturalY = (natH / 2) - (cropPan.y / scaleFactor);

    let cropNaturalX = centerNaturalX - (cropNaturalW / 2);
    let cropNaturalY = centerNaturalY - (cropNaturalH / 2);

    cropNaturalX = Math.max(0, Math.min(natW - cropNaturalW, cropNaturalX));
    cropNaturalY = Math.max(0, Math.min(natH - cropNaturalH, cropNaturalY));

    const canvas = document.createElement("canvas");
    const outWidth = 960;
    const outHeight = Math.round(outWidth * 9 / 16); // 540
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outWidth, outHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      cropImgRef.current,
      cropNaturalX,
      cropNaturalY,
      cropNaturalW,
      cropNaturalH,
      0,
      0,
      outWidth,
      outHeight
    );

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setForm((prev) => ({ ...prev, photoUrl: croppedDataUrl }));
    setIsCropModalOpen(false);
    setFeedback({ message: "Vehicle photo adjusted and cropped successfully!", type: "success" });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setFeedback({ message: "Please select an image file (JPG, PNG, WEBP)", type: "error" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setPhotoProcessing(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setPhotoProcessing(false);
      setFeedback({ message: "Failed to read image file", type: "error" });
      setTimeout(() => setFeedback(null), 3000);
    };
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setRawPhotoUrl(dataUrl);
      setPhotoProcessing(false);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
    e.target.value = "";
  };

  const handleDropPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handleOpenCropAdjuster = () => {
    if (rawPhotoUrl) {
      setIsCropModalOpen(true);
    } else if (form.photoUrl) {
      setRawPhotoUrl(form.photoUrl);
      setIsCropModalOpen(true);
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: "" }));
    setRawPhotoUrl("");
  };

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
      photoUrl: v.photoUrl || "",
    });
    setRawPhotoUrl(v.photoUrl || "");
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingVehicleId(null);
    setForm(EMPTY_FORM);
    setRawPhotoUrl("");
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
      const existingVehicle = editingVehicleId
        ? vehicles.find((v) => v.id === editingVehicleId)
        : null;

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
        status: existingVehicle?.status || ("active" as Vehicle["status"]),
        notes: existingVehicle?.notes || "",
        photoUrl: form.photoUrl || "",
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
              {/* Vehicle Photo Upload Space with Auto Rectangular Crop */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Vehicle Photo</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    Auto-crops to 16:9 rectangle
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {form.photoUrl ? (
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-xs group">
                    <img
                      src={form.photoUrl}
                      alt="Vehicle photo"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

                    {/* Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        16:9 Rectangle Cropped
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={handleOpenCropAdjuster}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Adjust crop, zoom and position"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Adjust Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-bold backdrop-blur-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold backdrop-blur-md shadow-xs transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(true);
                    }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={handleDropPhoto}
                    className={`relative aspect-[16/9] w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center ${
                      isDraggingPhoto
                        ? "border-blue-500 bg-blue-50/70 scale-[0.99]"
                        : "border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50"
                    }`}
                  >
                    {photoProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-blue-600">Auto-cropping rectangle...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                          <Camera className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to upload or drag &amp; drop vehicle photo
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Automatically center-crops to landscape rectangle (16:9) • PNG, JPG, WEBP
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
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
                      {/* Grid Mode Rectangular Banner */}
                      {viewMode === "grid" && vehicle.photoUrl && (
                        <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs">
                          <img
                            src={vehicle.photoUrl}
                            alt={vehicle.name || vehicle.registrationNumber}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Top Row: Photo Thumbnail (List Mode), Reg number, Status badge, Edit/Delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {viewMode === "list" && vehicle.photoUrl && (
                            <div className="relative w-20 h-13 sm:w-24 sm:h-15 aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 shrink-0 shadow-2xs">
                              <img
                                src={vehicle.photoUrl}
                                alt={vehicle.name || vehicle.registrationNumber}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
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

      {/* ─── 5. Interactive Crop Adjustment Modal ─── */}
      {isCropModalOpen && rawPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Crop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Adjust Vehicle Photo Crop
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Drag to reposition • Zoom to frame the vehicle in 16:9 rectangle
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewport Frame */}
            <div
              ref={cropViewportRef}
              onMouseDown={(e) => {
                isCropDraggingRef.current = true;
                cropStartPosRef.current = { x: e.clientX, y: e.clientY };
                cropStartPanRef.current = { ...cropPan };
              }}
              onMouseMove={(e) => {
                if (!isCropDraggingRef.current) return;
                const dx = e.clientX - cropStartPosRef.current.x;
                const dy = e.clientY - cropStartPosRef.current.y;
                updateCropPan(cropStartPanRef.current.x + dx, cropStartPanRef.current.y + dy);
              }}
              onMouseUp={() => {
                isCropDraggingRef.current = false;
              }}
              onMouseLeave={() => {
                isCropDraggingRef.current = false;
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  isCropDraggingRef.current = true;
                  cropStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                  cropStartPanRef.current = { ...cropPan };
                }
              }}
              onTouchMove={(e) => {
                if (!isCropDraggingRef.current || e.touches.length !== 1) return;
                const dx = e.touches[0].clientX - cropStartPosRef.current.x;
                const dy = e.touches[0].clientY - cropStartPosRef.current.y;
                updateCropPan(cropStartPanRef.current.x + dx, cropStartPanRef.current.y + dy);
              }}
              onTouchEnd={() => {
                isCropDraggingRef.current = false;
              }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                handleZoomChange(cropZoom + delta);
              }}
              className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-slate-800 shadow-inner group"
            >
              <img
                ref={cropImgRef}
                src={rawPhotoUrl}
                alt="Vehicle crop source"
                onLoad={handleCropImageLoad}
                draggable={false}
                style={{
                  transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  maxHeight: "none",
                  width: cropImgDims ? `${cropImgDims.width}px` : "100%",
                  height: cropImgDims ? `${cropImgDims.height}px` : "100%",
                }}
                className="pointer-events-none transition-transform duration-75 ease-out select-none"
              />

              {/* 16:9 Rule-of-Thirds Framing Overlay */}
              <div className="absolute inset-0 pointer-events-none border-2 border-white/70 rounded-2xl">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div />
                </div>
              </div>

              {/* Status Pills */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                  <Crop className="w-3 h-3 text-blue-400" />
                  16:9 Rectangle
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[10px] font-semibold text-slate-300 border border-white/10">
                  <Move className="w-3 h-3 text-slate-400" />
                  Drag to pan
                </span>
              </div>
            </div>

            {/* Zoom and Reset Controls */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                  Zoom &amp; Frame
                </span>
                <span className="font-mono font-bold text-blue-600 text-xs">
                  {Math.round(cropZoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleZoomChange(cropZoom - 0.15)}
                  disabled={cropZoom <= 1}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={cropZoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => handleZoomChange(cropZoom + 0.15)}
                  disabled={cropZoom >= 3}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1);
                    setCropPan({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  title="Center and Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply &amp; Save Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
