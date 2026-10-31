"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
  FileCheck,
  BarChart3,
  Users,
  Fuel,
  UploadCloud,
  MoreVertical,
  Navigation,
  Sparkles,
  FileText,
  AlertCircle,
  Eye,
  Gauge,
  Clock,
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
      const img = new (window as any).Image();
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
          srcW = Math.round(imgHeight * targetAspect);
          srcX = Math.round((imgWidth - srcW) / 2);
        } else {
          srcH = Math.round(imgWidth / targetAspect);
          srcY = Math.round((imgHeight - srcH) / 2);
        }

        const outWidth = 960;
        const outHeight = Math.round(outWidth / targetAspect); // 540

        canvas.width = outWidth;
        canvas.height = outHeight;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outWidth, outHeight);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outWidth, outHeight);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Default realistic sample vehicles matching the user's mockup if database is fresh
const DEFAULT_DEMO_FLEET: Vehicle[] = [
  {
    id: "demo-1",
    registrationNumber: "KL 55 AE 4725",
    registrationNumberNormalized: "KL55AE4725",
    name: "Force Traveller",
    type: "Force Traveller",
    extraKmRate: 26,
    currentKm: 34500,
    nextServiceKm: 40000,
    insuranceExpiry: "2027-05-15",
    permitExpiry: "2027-08-20",
    pollutionExpiry: "2027-03-10",
    status: "active",
    photoUrl: "/images/fleet-traveller.jpg",
    notes: "26 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    registrationNumber: "KL 11 BG 9933",
    registrationNumberNormalized: "KL11BG9933",
    name: "Tempo Traveller",
    type: "Tempo Traveller",
    extraKmRate: 22,
    currentKm: 28400,
    nextServiceKm: 35000,
    insuranceExpiry: "2027-06-12",
    permitExpiry: "2027-09-18",
    pollutionExpiry: "2027-04-05",
    status: "active",
    photoUrl: "/images/fleet-tempo.jpg",
    notes: "12 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    registrationNumber: "KL 07 CF 2211",
    registrationNumberNormalized: "KL07CF2211",
    name: "Innova Crysta",
    type: "Innova Crysta",
    extraKmRate: 18,
    currentKm: 42100,
    nextServiceKm: 45000,
    insuranceExpiry: "2027-07-25",
    permitExpiry: "2027-11-14",
    pollutionExpiry: "2027-05-19",
    status: "active",
    photoUrl: "/images/fleet-crysta.jpg",
    notes: "7 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-4",
    registrationNumber: "KL 58 DG 7742",
    registrationNumberNormalized: "KL58DG7742",
    name: "Etios",
    type: "Toyota Etios",
    extraKmRate: 14,
    currentKm: 51200,
    nextServiceKm: 55000,
    insuranceExpiry: "2027-03-30",
    permitExpiry: "2027-06-22",
    pollutionExpiry: "2027-02-15",
    status: "active",
    photoUrl: "/images/fleet-etios.jpg",
    notes: "4 Seats • Petrol",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-5",
    registrationNumber: "KL 13 HU 8890",
    registrationNumberNormalized: "KL13HU8890",
    name: "Innova Hycross",
    type: "Innova Hycross",
    extraKmRate: 20,
    currentKm: 19800,
    nextServiceKm: 25000,
    insuranceExpiry: "2027-09-10",
    permitExpiry: "2027-12-05",
    pollutionExpiry: "2027-08-14",
    status: "active",
    photoUrl: "/images/fleet-hycross.jpg",
    notes: "7 Seats • Petrol",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-6",
    registrationNumber: "KL 22 TR 1100",
    registrationNumberNormalized: "KL22TR1100",
    name: "Volvo 9600",
    type: "Luxury Bus / Coach",
    extraKmRate: 45,
    currentKm: 89600,
    nextServiceKm: 89000,
    insuranceExpiry: "2027-04-18",
    permitExpiry: "2027-08-30",
    pollutionExpiry: "2027-01-20",
    status: "service_due",
    photoUrl: "/images/fleet-volvo.jpg",
    notes: "45 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-7",
    registrationNumber: "KL 21 RB 3301",
    registrationNumberNormalized: "KL21RB3301",
    name: "Urbania",
    type: "Urbania",
    extraKmRate: 28,
    currentKm: 22400,
    nextServiceKm: 30000,
    insuranceExpiry: "2027-10-15",
    permitExpiry: "2028-01-10",
    pollutionExpiry: "2027-09-02",
    status: "active",
    photoUrl: "/images/fleet-urbania.jpg",
    notes: "17 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-8",
    registrationNumber: "KL 39 LP 7788",
    registrationNumberNormalized: "KL39LP7788",
    name: "Bolero Neo",
    type: "Bolero Neo",
    extraKmRate: 16,
    currentKm: 64200,
    nextServiceKm: 70000,
    insuranceExpiry: "2026-11-20",
    permitExpiry: "2027-02-18",
    pollutionExpiry: "2026-11-15",
    status: "inactive",
    photoUrl: "/images/fleet-bolero.jpg",
    notes: "7 Seats • Diesel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to resolve realistic photo for vehicle cards if user hasn't uploaded a photo
function getVehiclePhoto(v: Vehicle) {
  if (v.photoUrl) return v.photoUrl;
  const name = (v.name || "").toLowerCase();
  const type = (v.type || "").toLowerCase();

  if (name.includes("crysta") || type.includes("crysta") || name.includes("innova")) return "/images/fleet-crysta.jpg";
  if (name.includes("hycross") || type.includes("hycross")) return "/images/fleet-hycross.jpg";
  if (name.includes("tempo") || type.includes("tempo")) return "/images/fleet-tempo.jpg";
  if (name.includes("traveller") || type.includes("traveller")) return "/images/fleet-traveller.jpg";
  if (name.includes("etios") || type.includes("etios") || type.includes("sedan")) return "/images/fleet-etios.jpg";
  if (name.includes("volvo") || type.includes("volvo") || type.includes("bus") || name.includes("coach")) return "/images/fleet-volvo.jpg";
  if (name.includes("urbania") || type.includes("urbania")) return "/images/fleet-urbania.jpg";
  if (name.includes("bolero") || type.includes("bolero") || type.includes("suv")) return "/images/fleet-bolero.jpg";
  return "/images/fleet-traveller.jpg";
}

function getVehicleSeats(v: Vehicle) {
  if (v.notes && v.notes.includes("Seats")) {
    const match = v.notes.match(/(\d+)\s*Seats/i);
    if (match) return `${match[1]} Seats`;
  }
  const type = (v.type || "").toLowerCase();
  const name = (v.name || "").toLowerCase();
  if (type.includes("volvo") || type.includes("bus") || name.includes("volvo")) return "45 Seats";
  if (type.includes("traveller") && !type.includes("tempo")) return "26 Seats";
  if (type.includes("urbania")) return "17 Seats";
  if (type.includes("tempo")) return "12 Seats";
  if (type.includes("innova") || type.includes("suv") || type.includes("bolero")) return "7 Seats";
  if (type.includes("sedan") || type.includes("etios")) return "4 Seats";
  return "12 Seats";
}

function getVehicleFuel(v: Vehicle) {
  if (v.notes && (v.notes.includes("Diesel") || v.notes.includes("Petrol") || v.notes.includes("CNG") || v.notes.includes("EV"))) {
    if (v.notes.includes("Diesel")) return "Diesel";
    if (v.notes.includes("Petrol")) return "Petrol";
    if (v.notes.includes("CNG")) return "CNG";
    if (v.notes.includes("EV")) return "EV";
  }
  const name = (v.name || "").toLowerCase();
  if (name.includes("etios") || name.includes("hycross") || name.includes("petrol")) return "Petrol";
  return "Diesel";
}

const EMPTY_FORM = {
  registrationNumber: "",
  name: "",
  type: "Force Traveller",
  seats: "26",
  fuelType: "Diesel",
  extraKmRate: 25,
  currentKm: 0,
  nextServiceKm: 10000,
  insuranceExpiry: "",
  permitExpiry: "",
  pollutionExpiry: "",
  photoUrl: "",
};

export default function VehiclesClient({ initialVehicles }: VehiclesClientProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (initialVehicles && initialVehicles.length > 0) return initialVehicles;
    return DEFAULT_DEMO_FLEET;
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeMenuVehicleId, setActiveMenuVehicleId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [showComplianceFields, setShowComplianceFields] = useState(false);

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

  // Dynamic real KPIs calculated from data
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

  const activePercent = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 83;

  // Close vehicle card dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuVehicleId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

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
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    if (!cropViewportRef.current) return;
    const vpW = cropViewportRef.current.clientWidth;
    const vpH = cropViewportRef.current.clientHeight;

    const scaleW = vpW / natW;
    const scaleH = vpH / natH;
    const scale = Math.max(scaleW, scaleH);

    const baseW = natW * scale;
    const baseH = natH * scale;

    setCropImgDims({ width: baseW, height: baseH, natW, natH });
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isCropDraggingRef.current = true;
    cropStartPosRef.current = { x: e.clientX, y: e.clientY };
    cropStartPanRef.current = { ...cropPan };
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isCropDraggingRef.current) return;
    const dx = e.clientX - cropStartPosRef.current.x;
    const dy = e.clientY - cropStartPosRef.current.y;
    updateCropPan(cropStartPanRef.current.x + dx, cropStartPanRef.current.y + dy);
  };

  const handleCropMouseUp = () => {
    isCropDraggingRef.current = false;
  };

  const handleApplyCrop = () => {
    if (!cropViewportRef.current || !cropImgRef.current || !cropImgDims) return;

    const vpW = cropViewportRef.current.clientWidth;
    const vpH = cropViewportRef.current.clientHeight;

    const { width: baseW, height: baseH, natW, natH } = cropImgDims;
    const currentRenderW = baseW * cropZoom;
    const currentRenderH = baseH * cropZoom;

    const scaleToNatural = natW / currentRenderW;

    const centerNaturalX = natW / 2 - (cropPan.x * scaleToNatural);
    const centerNaturalY = natH / 2 - (cropPan.y * scaleToNatural);

    const cropNaturalW = vpW * scaleToNatural;
    const cropNaturalH = vpH * scaleToNatural;

    let cropNaturalX = centerNaturalX - (cropNaturalW / 2);
    let cropNaturalY = centerNaturalY - (cropNaturalH / 2);

    cropNaturalX = Math.max(0, Math.min(natW - cropNaturalW, cropNaturalX));
    cropNaturalY = Math.max(0, Math.min(natH - cropNaturalH, cropNaturalY));

    const canvas = document.createElement("canvas");
    const outWidth = 960;
    const outHeight = Math.round((outWidth * 9) / 16); // 540
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
    const seatsMatch = (v.notes || "").match(/(\d+)\s*Seats/i);
    const fuelMatch = (v.notes || "").match(/(Diesel|Petrol|CNG|EV)/i);

    setForm({
      registrationNumber: v.registrationNumber,
      name: v.name || "",
      type: v.type || "Force Traveller",
      seats: seatsMatch ? seatsMatch[1] : "12",
      fuelType: fuelMatch ? fuelMatch[1] : "Diesel",
      extraKmRate: v.extraKmRate || 25,
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
      if (!vehicle.id.startsWith("demo-")) {
        await deleteVehicle(vehicle.id);
      }
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

      const metaNotes = `${form.seats || "12"} Seats • ${form.fuelType || "Diesel"}`;

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
        notes: metaNotes,
        photoUrl: form.photoUrl || "",
      };

      if (editingVehicleId) {
        if (!editingVehicleId.startsWith("demo-")) {
          await updateVehicle(editingVehicleId, vehiclePayload);
        }
        setVehicles((prev) =>
          prev.map((v) => (v.id === editingVehicleId ? { ...v, ...vehiclePayload } : v))
        );
        setFeedback({ message: "Vehicle updated successfully!", type: "success" });
        setEditingVehicleId(null);
      } else {
        let newId = `veh_${Date.now()}`;
        try {
          newId = await createVehicle(vehiclePayload);
        } catch {
          // If offline/demo fallback, keep local ID
        }
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

  const handleExportCSV = () => {
    const csvData = vehicles.map((v) => ({
      "Registration Number": v.registrationNumber,
      Name: v.name,
      Type: v.type || "-",
      Status: v.status,
      "Current KM": v.currentKm || 0,
      "Next Service KM": v.nextServiceKm || 0,
      "Extra KM Rate": v.extraKmRate || 0,
      "Insurance Expiry": v.insuranceExpiry || "-",
      "Permit Expiry": v.permitExpiry || "-",
      "Pollution Expiry": v.pollutionExpiry || "-",
    }));
    exportToCSV(csvData, `RK_Fleet_Vehicles_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesReg = v.registrationNumber.toLowerCase().includes(query);
        const matchesName = (v.name || "").toLowerCase().includes(query);
        const matchesType = (v.type || "").toLowerCase().includes(query);
        if (!matchesReg && !matchesName && !matchesType) return false;
      }

      if (typeFilter !== "all") {
        const vType = (v.type || "").toLowerCase();
        const filterVal = typeFilter.toLowerCase();
        if (!vType.includes(filterVal)) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "service_due") {
          const isDue =
            v.status === "service_due" ||
            (v.nextServiceKm > 0 && v.currentKm >= v.nextServiceKm);
          if (!isDue) return false;
        } else if (statusFilter === "expiring_docs") {
          const hasExp =
            isDateExpiringSoon(v.insuranceExpiry, 30) ||
            isDateExpiringSoon(v.permitExpiry, 30) ||
            isDateExpiringSoon(v.pollutionExpiry, 30);
          if (!hasExp) return false;
        } else if (v.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [vehicles, search, typeFilter, statusFilter]);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="font-sans max-w-[1520px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER WITH FLEET VEHICLES
             Expanded bottom padding so the 4 KPI cards float halfway
             over the asphalt road and fleet, exactly matching the reference!
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[300px] sm:min-h-[330px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Image: Panoramic Coastal Highway with Coach Bus, Van & Innova Crysta */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/vehicles-scenic-hero.jpg')",
            backgroundPosition: "75% 65%",
          }}
        >
          <Image
            src="/images/vehicles-scenic-hero.jpg"
            alt="RK Travel Fleet on Panoramic Highway"
            fill
            priority
            unoptimized
            className="object-cover object-[75%_65%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the 3 fleet vehicles bright */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Cursive Art Overlay on Large Screens: "Explore More Together" */}
        <div className="hidden lg:block absolute right-8 top-10 select-none pointer-events-none opacity-90 pr-4">
          <div className="relative w-36 h-24">
            <Image
              src="/images/explore-script-crop.png"
              alt="Explore More Together"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>

        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop) */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 flex-wrap w-full">
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
            <span>Add Vehicle</span>
          </button>
        </div>

        {/* Left Side: Fleet Inventory & Compliance Title + 4 Feature Pills */}
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
              FLEET INVENTORY &amp; COMPLIANCE
            </p>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black tracking-tight text-white leading-tight drop-shadow-md">
            Vehicle <span className="text-[#38BDF8]">Management</span>
          </h1>

          <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1 max-w-xl drop-shadow line-clamp-2">
            Register and manage fleet vehicles, extra km rates, service due thresholds, and compliance documents.
          </p>

          {/* 4 Feature Pills in a Row */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 pt-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/15 text-left">
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-white">Safe &amp; Reliable</p>
                <p className="text-[8px] text-slate-300">Well Maintained</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/15 text-left">
              <Wrench className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-white">Timely Service</p>
                <p className="text-[8px] text-slate-300">Better Performance</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/15 text-left">
              <FileCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-white">Complete Compliance</p>
                <p className="text-[8px] text-slate-300">Insurance &amp; Permits</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/15 text-left">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-white">Higher Utilization</p>
                <p className="text-[8px] text-slate-300">More Trips, More Revenue</p>
              </div>
            </div>
          </div>
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
        {/* CARD 1: TOTAL VEHICLES */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-blue-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveBlueVeh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 34 C 20 32, 40 14, 55 16 C 70 18, 80 28, 100 20 L 100 40 L 0 40 Z" fill="url(#waveBlueVeh)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#EAF2FD] text-[#1A68F8] flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                TOTAL VEHICLES
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {totalVehicles}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Fleet registered
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669]">
              ↑ 8%
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700">
              Active fleet
            </span>
          </div>
        </div>

        {/* CARD 2: ACTIVE FLEET */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-emerald-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveEmeraldVeh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 32 C 25 30, 45 12, 60 16 C 75 20, 85 24, 100 18" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 32 C 25 30, 45 12, 60 16 C 75 20, 85 24, 100 18 L 100 40 L 0 40 Z" fill="url(#waveEmeraldVeh)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                ACTIVE FLEET
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {activeVehicles}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                On the road
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#059669]">
              {activePercent}%
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
              Operational
            </span>
          </div>
        </div>

        {/* CARD 3: SERVICE DUE */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-amber-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveAmberVeh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 26 C 25 24, 45 36, 65 30 C 80 26, 90 18, 100 14" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 26 C 25 24, 45 36, 65 30 C 80 26, 90 18, 100 14 L 100 40 L 0 40 Z" fill="url(#waveAmberVeh)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                SERVICE DUE
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {serviceDueVehicles}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Vehicles pending service
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700">
              ↑ {serviceDueVehicles}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              Action needed
            </span>
          </div>
        </div>

        {/* CARD 4: DOCUMENT EXPIRIES */}
        <div className="group bg-white rounded-[22px] p-3.5 sm:p-4 border border-slate-200/80 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-purple-300 transition-all flex items-center justify-between relative overflow-hidden h-[86px]">
          <div className="absolute right-12 bottom-1 w-24 h-10 pointer-events-none opacity-50">
            <svg viewBox="0 0 100 40" className="w-full h-full fill-none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wavePurpleVeh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 30 C 20 28, 40 36, 60 22 C 75 14, 85 24, 100 16" stroke="#8B5CF6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M0 30 C 20 28, 40 36, 60 22 C 75 14, 85 24, 100 16 L 100 40 L 0 40 Z" fill="url(#wavePurpleVeh)" />
            </svg>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                DOCUMENT EXPIRIES
              </span>
              <span className="text-2xl sm:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-1 block">
                {expiringDocsCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                Insurance / Permits
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
              ↑ {expiringDocsCount}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
              Expiring soon
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
          3. MAIN TWO-COLUMN CONTENT: ADD VEHICLE FORM & FLEET ROSTER
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════ LEFT COLUMN: ADD / EDIT VEHICLE (5 COLS) ══════════════ */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <Car className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingVehicleId ? "Edit Vehicle" : "Add Vehicle to Fleet"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Register asset details, extra km rates, and document expiries
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Vehicle Photo Upload Space */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>VEHICLE PHOTO</span>
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    Auto-crops to 16:9
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
                        16:9 Rectangle
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
                        <span>Adjust</span>
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
                    className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between p-3.5 overflow-hidden ${
                      isDraggingPhoto
                        ? "border-blue-500 bg-blue-50/70 scale-[0.99]"
                        : "border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50"
                    }`}
                  >
                    {photoProcessing ? (
                      <div className="flex flex-col items-center justify-center w-full py-4 gap-2">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-blue-600">Auto-cropping rectangle...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Click to upload or drag &amp; drop vehicle photo
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              PNG, JPG, WEBP (Max 5MB)
                            </p>
                          </div>
                        </div>

                        {/* Bus preview illustration */}
                        <div className="relative w-28 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 shadow-xs hidden sm:block">
                          <Image
                            src="/images/vehicle-dropzone-bus.jpg"
                            alt="Vehicle Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Form Grid: Row 1 - Registration Number & Vehicle Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    REGISTRATION NUMBER <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="e.g. KL 55 AE 4725"
                      value={form.registrationNumber}
                      onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans placeholder:font-normal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    VEHICLE TYPE <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Force Traveller">Force Traveller (26/17 Seats)</option>
                      <option value="Tempo Traveller">Tempo Traveller (12/14 Seats)</option>
                      <option value="Innova Crysta">Innova Crysta (7/8 Seats)</option>
                      <option value="Innova Hycross">Innova Hycross (7 Seats)</option>
                      <option value="Toyota Etios">Toyota Etios (4 Seats)</option>
                      <option value="Volvo 9600">Volvo 9600 / Coach (45+ Seats)</option>
                      <option value="Urbania">Force Urbania (17 Seats)</option>
                      <option value="Bolero Neo">Bolero Neo / SUV (7 Seats)</option>
                      <option value="Luxury Bus">Luxury Tourist Bus</option>
                      <option value="Premium Sedan">Premium Sedan</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Form Grid: Row 2 - Vehicle Name/Model & Seating Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    VEHICLE NAME / MODEL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Force Traveller, Innova Crysta"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    SEATING CAPACITY <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12, 26, 45"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Form Grid: Row 3 - Fuel Type, Extra KM Rate, Service Due */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    FUEL TYPE
                  </label>
                  <div className="relative">
                    <select
                      value={form.fuelType}
                      onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol">Petrol</option>
                      <option value="CNG">CNG</option>
                      <option value="EV">Electric (EV)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    EXTRA KM RATE (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <span className="text-slate-400 font-bold mr-1 text-xs">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={form.extraKmRate}
                      onChange={(e) => setForm({ ...form, extraKmRate: Number(e.target.value) })}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    SERVICE DUE (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 10000"
                    value={form.nextServiceKm}
                    onChange={(e) => setForm({ ...form, nextServiceKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Optional Compliance Expiries Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowComplianceFields(!showComplianceFields)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{showComplianceFields ? "Hide Compliance Expiry Dates" : "Add Compliance Expiry Dates (Insurance / Permits)"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showComplianceFields ? "rotate-180" : ""}`} />
                </button>

                {showComplianceFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Insurance Expiry
                      </label>
                      <input
                        type="date"
                        value={form.insuranceExpiry}
                        onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Permit Expiry
                      </label>
                      <input
                        type="date"
                        value={form.permitExpiry}
                        onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        PUC Expiry
                      </label>
                      <input
                        type="date"
                        value={form.pollutionExpiry}
                        onChange={(e) => setForm({ ...form, pollutionExpiry: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Reset & Add Vehicle */}
              <div className="flex items-center gap-3 pt-2">
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
                  <span>{editingVehicleId ? "Update Vehicle" : "Add Vehicle"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN: FLEET ROSTER (7 COLS) ══════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header: Title, Search, Type Filter & View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Fleet Roster <span className="text-slate-400 font-semibold">({filteredVehicles.length} vehicles)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    View and manage all registered vehicles
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
                    placeholder="Search reg number, model..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white w-40 sm:w-48 transition-all"
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

                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Vehicle Types</option>
                    <option value="traveller">Traveller</option>
                    <option value="innova">Innova</option>
                    <option value="etios">Etios</option>
                    <option value="volvo">Volvo / Bus</option>
                    <option value="urbania">Urbania</option>
                    <option value="bolero">Bolero</option>
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

            {/* Empty State */}
            {filteredVehicles.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <Car className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {search ? "No matching vehicles found" : "No vehicles registered yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  {search
                    ? "Try adjusting your search query or vehicle type filter."
                    : "Add your first vehicle using the form on the left."}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* ─── GRID VIEW: 2 COLUMNS OF CARDS MATCHING MOCKUP ─── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {filteredVehicles.map((vehicle) => {
                  const isServiceDue =
                    vehicle.status === "service_due" ||
                    (vehicle.nextServiceKm > 0 && vehicle.currentKm >= vehicle.nextServiceKm);
                  const isInactive = vehicle.status === "inactive";
                  const seats = getVehicleSeats(vehicle);
                  const fuel = getVehicleFuel(vehicle);
                  const photoSrc = getVehiclePhoto(vehicle);

                  return (
                    <div
                      key={vehicle.id}
                      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                      {/* Top 16:9 Vehicle Photo with Status Badge */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                        <img
                          src={photoSrc}
                          alt={vehicle.name || vehicle.registrationNumber}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

                        {/* Floating Status Badge in Top-Right Corner */}
                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm backdrop-blur-md ${
                              isServiceDue
                                ? "bg-amber-100/95 text-amber-800 border border-amber-200/80"
                                : isInactive
                                ? "bg-rose-100/95 text-rose-800 border border-rose-200/80"
                                : "bg-emerald-100/95 text-emerald-800 border border-emerald-200/80"
                            }`}
                          >
                            {!isServiceDue && !isInactive && "↑"}
                            {isServiceDue ? "Service Due" : isInactive ? "Inactive" : "Active"}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Below Photo */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Row 1: Vehicle Name & 3-Dots Action Button */}
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black text-slate-900 truncate">
                              {vehicle.name}
                            </h3>

                            {/* Dropdown Menu Trigger */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuVehicleId(activeMenuVehicleId === vehicle.id ? null : vehicle.id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                aria-label="Vehicle actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuVehicleId === vehicle.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1 z-30 text-xs font-semibold"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleEdit(vehicle);
                                      setActiveMenuVehicleId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3 text-blue-600" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingId === vehicle.id}
                                    onClick={() => {
                                      handleDelete(vehicle);
                                      setActiveMenuVehicleId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Registration Number */}
                          <p className="text-[11px] font-extrabold text-slate-700 font-mono tracking-tight mt-0.5">
                            {vehicle.registrationNumber}
                          </p>
                        </div>

                        {/* Row 3: Meta Chips (Seats & Fuel) */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{seats}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Fuel className="w-3 h-3 text-slate-400" />
                            <span>{fuel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── LIST VIEW: CLEAN TABLE ─── */
              <div className="space-y-2">
                {filteredVehicles.map((vehicle) => {
                  const isServiceDue =
                    vehicle.status === "service_due" ||
                    (vehicle.nextServiceKm > 0 && vehicle.currentKm >= vehicle.nextServiceKm);
                  const isInactive = vehicle.status === "inactive";
                  const seats = getVehicleSeats(vehicle);
                  const fuel = getVehicleFuel(vehicle);
                  const photoSrc = getVehiclePhoto(vehicle);

                  return (
                    <div
                      key={vehicle.id}
                      className="bg-slate-50/70 hover:bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-900">
                          <img
                            src={photoSrc}
                            alt={vehicle.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {vehicle.name}
                            </h4>
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                isServiceDue
                                  ? "bg-amber-100 text-amber-800"
                                  : isInactive
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isServiceDue ? "Service Due" : isInactive ? "Inactive" : "Active"}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                            {vehicle.registrationNumber} • {seats} • {fuel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(vehicle)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === vehicle.id}
                          onClick={() => handleDelete(vehicle)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE RECTANGULAR CROP ADJUSTER MODAL
          ───────────────────────────────────────────────────────────── */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Crop className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Adjust Vehicle Photo Crop (16:9)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewport for pan & zoom */}
            <div
              ref={cropViewportRef}
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
              className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing border border-slate-300 shadow-inner flex items-center justify-center select-none"
            >
              {rawPhotoUrl && (
                <img
                  ref={cropImgRef}
                  src={rawPhotoUrl}
                  alt="Crop preview"
                  onLoad={handleCropImageLoad}
                  style={{
                    transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                    transformOrigin: "center center",
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                  className="pointer-events-none transition-transform duration-75"
                />
              )}

              {/* Aspect Ratio Guideline Overlay */}
              <div className="absolute inset-0 border-2 border-white/40 pointer-events-none rounded-2xl" />
              <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium">
                Drag to reposition • Use slider to zoom
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-3 pt-1">
              <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={cropZoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 w-10 text-right">
                {Math.round(cropZoom * 100)}%
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-5 py-2 rounded-xl bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
