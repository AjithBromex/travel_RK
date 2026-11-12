"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Car,
  Wrench,
  CheckCircle2,
  Download,
  Plus,
  Search,
  ChevronDown,
  Shield,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Calendar,
  X,
  Camera,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCheck,
  BarChart3,
  Users,
  Fuel,
  UploadCloud,
  MoreVertical,
  Navigation,
  FileText,
  Bus,
  Lock,
  Move,
  Maximize2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  normalizeRegNumber,
  isDateExpiringSoon,
  isDocumentExpired,
  exportToCSV,
  exportToPDF,
  capitalizeWords,
} from "@/lib/utils";
import type { Vehicle } from "@/types";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "@/services/vehicles.service";
import {
  getStoredVehicles,
  subscribeDataChanged,
  isRecordConfirmed,
} from "@/lib/storage-sync";

interface VehiclesClientProps {
  initialVehicles: Vehicle[];
}

const DEFAULT_DEMO_FLEET: Vehicle[] = [];

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
    return getStoredVehicles();
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

  const fetchVehiclesData = () => {
    getVehicles(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setVehicles(data);
        }
      })
      .catch((err) => {
        console.warn("[Vehicles] Client data hydration error:", err);
      });
  };

  useEffect(() => {
    fetchVehiclesData();

    // Subscribe to cross-page updates
    const unsubscribe = subscribeDataChanged((entity) => {
      if (entity === "vehicles" || entity === "all") {
        fetchVehiclesData();
      }
    });

    return () => unsubscribe();
  }, []);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [showComplianceFields, setShowComplianceFields] = useState(false);

  // Manual Interactive Mouse Crop State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string>("");
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropAspect, setCropAspect] = useState<number | null>(16 / 9); // null for Free, 16/9, 4/3, 1/1
  const [cropImgDims, setCropImgDims] = useState<{ displayW: number; displayH: number; natW: number; natH: number } | null>(null);

  const cropImgRef = useRef<HTMLImageElement>(null);
  const cropDragRef = useRef<{
    active: boolean;
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startBox: { x: number; y: number; w: number; h: number };
  }>({
    active: false,
    mode: 'move',
    startX: 0,
    startY: 0,
    startBox: { x: 0, y: 0, w: 0, h: 0 },
  });

  const [form, setForm] = useState(EMPTY_FORM);

  const DEFAULT_VEHICLE_TYPES = useMemo(
    () => [
      { id: "Force Traveller", label: "Force Traveller (26/17 Seats)" },
      { id: "Tempo Traveller", label: "Tempo Traveller (12/14 Seats)" },
      { id: "Innova Crysta", label: "Innova Crysta (7/8 Seats)" },
      { id: "Innova Hycross", label: "Innova Hycross (7 Seats)" },
      { id: "Toyota Etios", label: "Toyota Etios (4 Seats)" },
      { id: "Volvo 9600", label: "Volvo 9600 / Coach (45+ Seats)" },
      { id: "Urbania", label: "Force Urbania (17 Seats)" },
      { id: "Bolero Neo", label: "Bolero Neo / SUV (7 Seats)" },
      { id: "Luxury Bus", label: "Luxury Tourist Bus" },
      { id: "Premium Sedan", label: "Premium Sedan" },
    ],
    []
  );

  const [customVehicleTypes, setCustomVehicleTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("rk_custom_vehicle_types");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState("");

  const allVehicleTypes = useMemo(() => {
    const list = [...DEFAULT_VEHICLE_TYPES];
    const existing = new Set(list.map((t) => t.id.toLowerCase()));

    customVehicleTypes.forEach((t) => {
      const clean = t.trim();
      if (clean && !existing.has(clean.toLowerCase())) {
        existing.add(clean.toLowerCase());
        list.push({ id: clean, label: clean });
      }
    });

    vehicles.forEach((v) => {
      const clean = (v.type || "").trim();
      if (clean && !existing.has(clean.toLowerCase())) {
        existing.add(clean.toLowerCase());
        list.push({ id: clean, label: clean });
      }
    });

    return list;
  }, [DEFAULT_VEHICLE_TYPES, customVehicleTypes, vehicles]);

  const handleAddNewVehicleType = (typeToAdd?: string) => {
    const val = (typeToAdd !== undefined ? typeToAdd : newTypeInput).trim();
    if (!val) {
      setIsAddingNewType(false);
      return;
    }

    if (!customVehicleTypes.some((t) => t.toLowerCase() === val.toLowerCase())) {
      const updated = [...customVehicleTypes, val];
      setCustomVehicleTypes(updated);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("rk_custom_vehicle_types", JSON.stringify(updated));
        } catch {}
      }
    }

    setForm((prev) => ({ ...prev, type: val }));
    setNewTypeInput("");
    setIsAddingNewType(false);
    setFeedback({ message: `Added new vehicle type "${val}"`, type: "success" });
  };

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

  const initCropBox = (dW: number, dH: number, aspect: number | null) => {
    let w = dW * 0.88;
    let h = dH * 0.88;
    if (aspect) {
      if (w / h > aspect) {
        w = h * aspect;
      } else {
        h = w / aspect;
      }
    }
    const x = Math.max(0, (dW - w) / 2);
    const y = Math.max(0, (dH - h) / 2);
    setCropBox({ x, y, w, h });
  };

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const displayW = img.offsetWidth || img.clientWidth;
    const displayH = img.offsetHeight || img.clientHeight;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    setCropImgDims({ displayW, displayH, natW, natH });
    initCropBox(displayW, displayH, cropAspect);
  };

  const handleAspectChange = (newAspect: number | null) => {
    setCropAspect(newAspect);
    if (!cropImgDims) return;
    if (newAspect && cropBox) {
      const centerX = cropBox.x + cropBox.w / 2;
      const centerY = cropBox.y + cropBox.h / 2;
      let newW = cropBox.w;
      let newH = newW / newAspect;
      if (newH > cropImgDims.displayH) {
        newH = cropImgDims.displayH * 0.9;
        newW = newH * newAspect;
      }
      if (newW > cropImgDims.displayW) {
        newW = cropImgDims.displayW * 0.9;
        newH = newW / newAspect;
      }
      const newX = Math.max(0, Math.min(cropImgDims.displayW - newW, centerX - newW / 2));
      const newY = Math.max(0, Math.min(cropImgDims.displayH - newH, centerY - newH / 2));
      setCropBox({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handleResetCrop = () => {
    if (!cropImgDims) return;
    initCropBox(cropImgDims.displayW, cropImgDims.displayH, cropAspect);
  };

  const handleCenterCrop = () => {
    if (!cropImgDims || !cropBox) return;
    const newX = Math.max(0, (cropImgDims.displayW - cropBox.w) / 2);
    const newY = Math.max(0, (cropImgDims.displayH - cropBox.h) / 2);
    setCropBox((prev) => (prev ? { ...prev, x: newX, y: newY } : null));
  };

  const startCropDrag = (
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
    clientX: number,
    clientY: number
  ) => {
    if (!cropBox) return;
    cropDragRef.current = {
      active: true,
      mode,
      startX: clientX,
      startY: clientY,
      startBox: { ...cropBox },
    };
  };

  // Global pointer listeners for smooth mouse & touch crop adjustments
  useEffect(() => {
    if (!isCropModalOpen) return;

    const applyDelta = (
      mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
      dx: number,
      dy: number,
      startBox: { x: number; y: number; w: number; h: number },
      dims: { displayW: number; displayH: number },
      aspect: number | null
    ) => {
      const { displayW, displayH } = dims;
      const minW = 40;
      const minH = 40;

      if (mode === 'move') {
        const newX = Math.max(0, Math.min(displayW - startBox.w, startBox.x + dx));
        const newY = Math.max(0, Math.min(displayH - startBox.h, startBox.y + dy));
        setCropBox({ x: newX, y: newY, w: startBox.w, h: startBox.h });
        return;
      }

      if (aspect) {
        if (mode === 'se') {
          const maxW = displayW - startBox.x;
          const maxH = displayH - startBox.y;
          let w = Math.max(minW, Math.min(maxW, startBox.w + dx));
          let h = w / aspect;
          if (h > maxH) {
            h = maxH;
            w = h * aspect;
          }
          setCropBox({ x: startBox.x, y: startBox.y, w, h });
        } else if (mode === 'sw') {
          const maxW = startBox.x + startBox.w;
          const maxH = displayH - startBox.y;
          let w = Math.max(minW, Math.min(maxW, startBox.w - dx));
          let h = w / aspect;
          if (h > maxH) {
            h = maxH;
            w = h * aspect;
          }
          const x = startBox.x + (startBox.w - w);
          setCropBox({ x, y: startBox.y, w, h });
        } else if (mode === 'ne') {
          const maxW = displayW - startBox.x;
          const maxH = startBox.y + startBox.h;
          let w = Math.max(minW, Math.min(maxW, startBox.w + dx));
          let h = w / aspect;
          if (h > maxH) {
            h = maxH;
            w = h * aspect;
          }
          const y = startBox.y + (startBox.h - h);
          setCropBox({ x: startBox.x, y, w, h });
        } else if (mode === 'nw') {
          const maxW = startBox.x + startBox.w;
          const maxH = startBox.y + startBox.h;
          let w = Math.max(minW, Math.min(maxW, startBox.w - dx));
          let h = w / aspect;
          if (h > maxH) {
            h = maxH;
            w = h * aspect;
          }
          const x = startBox.x + (startBox.w - w);
          const y = startBox.y + (startBox.h - h);
          setCropBox({ x, y, w, h });
        } else if (mode === 'e' || mode === 'w') {
          const maxW = mode === 'e' ? displayW - startBox.x : startBox.x + startBox.w;
          const delta = mode === 'e' ? dx : -dx;
          let w = Math.max(minW, Math.min(maxW, startBox.w + delta));
          let h = w / aspect;
          if (h > displayH) {
            h = displayH;
            w = h * aspect;
          }
          const x = mode === 'e' ? startBox.x : startBox.x + (startBox.w - w);
          const y = Math.max(0, Math.min(displayH - h, startBox.y + (startBox.h - h) / 2));
          setCropBox({ x, y, w, h });
        } else if (mode === 's' || mode === 'n') {
          const maxH = mode === 's' ? displayH - startBox.y : startBox.y + startBox.h;
          const delta = mode === 's' ? dy : -dy;
          let h = Math.max(minH, Math.min(maxH, startBox.h + delta));
          let w = h * aspect;
          if (w > displayW) {
            w = displayW;
            h = w / aspect;
          }
          const y = mode === 's' ? startBox.y : startBox.y + (startBox.h - h);
          const x = Math.max(0, Math.min(displayW - w, startBox.x + (startBox.w - w) / 2));
          setCropBox({ x, y, w, h });
        }
      } else {
        // Freeform manual mouse cropping (No aspect lock)
        let { x, y, w, h } = startBox;

        if (mode.includes('e')) {
          w = Math.max(minW, Math.min(displayW - startBox.x, startBox.w + dx));
        }
        if (mode.includes('w')) {
          const newX = Math.max(0, Math.min(startBox.x + startBox.w - minW, startBox.x + dx));
          w = startBox.w - (newX - startBox.x);
          x = newX;
        }
        if (mode.includes('s')) {
          h = Math.max(minH, Math.min(displayH - startBox.y, startBox.h + dy));
        }
        if (mode.includes('n')) {
          const newY = Math.max(0, Math.min(startBox.y + startBox.h - minH, startBox.y + dy));
          h = startBox.h - (newY - startBox.y);
          y = newY;
        }

        setCropBox({ x, y, w, h });
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!cropDragRef.current.active || !cropImgDims) return;
      e.preventDefault();
      const { mode, startX, startY, startBox } = cropDragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      applyDelta(mode, dx, dy, startBox, cropImgDims, cropAspect);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!cropDragRef.current.active || !cropImgDims || !e.touches[0]) return;
      const { mode, startX, startY, startBox } = cropDragRef.current;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      applyDelta(mode, dx, dy, startBox, cropImgDims, cropAspect);
    };

    const handlePointerUp = () => {
      cropDragRef.current.active = false;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: false });
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isCropModalOpen, cropImgDims, cropAspect]);

  const handleApplyCrop = () => {
    if (!cropImgRef.current || !cropImgDims || !cropBox) return;

    const { displayW, displayH, natW, natH } = cropImgDims;

    const scaleX = natW / displayW;
    const scaleY = natH / displayH;

    const sourceX = Math.max(0, Math.min(natW, cropBox.x * scaleX));
    const sourceY = Math.max(0, Math.min(natH, cropBox.y * scaleY));
    const sourceW = Math.max(1, Math.min(natW - sourceX, cropBox.w * scaleX));
    const sourceH = Math.max(1, Math.min(natH - sourceY, cropBox.h * scaleY));

    const canvas = document.createElement("canvas");
    const maxOutputW = 1200;
    const outWidth = Math.min(maxOutputW, Math.round(sourceW));
    const outHeight = Math.max(1, Math.round(outWidth * (sourceH / sourceW)));

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
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      outWidth,
      outHeight
    );

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.90);
    setForm((prev) => ({ ...prev, photoUrl: croppedDataUrl }));
    setIsCropModalOpen(false);
    setFeedback({ message: "Vehicle photo cropped successfully!", type: "success" });
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
    if (v.isConfirmed || isRecordConfirmed('vehicles', v.id, v)) {
      alert("This vehicle has been confirmed by Admin and cannot be edited.");
      return;
    }
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
    if (vehicle.isConfirmed || isRecordConfirmed('vehicles', vehicle.id, vehicle)) {
      alert("This vehicle has been confirmed by Admin and cannot be deleted.");
      return;
    }
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
        seats: Number(form.seats) || 12,
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

  const handleExportPDF = () => {
    if (vehicles.length === 0) {
      alert("No vehicles recorded yet to export.");
      return;
    }
    const headers = [
      "Reg Number",
      "Vehicle Name",
      "Type",
      "Status",
      "Current KM",
      "Insurance Expiry",
      "Permit Expiry",
      "Pollution Expiry",
    ];
    const data = vehicles.map((v) => [
      v.registrationNumber,
      v.name,
      v.type || "General",
      v.status.toUpperCase(),
      (v.currentKm || 0).toLocaleString("en-IN"),
      v.insuranceExpiry || "-",
      v.permitExpiry || "-",
      v.pollutionExpiry || "-",
    ]);

    const activeCount = vehicles.filter((v) => v.status === "active").length;
    const serviceDueCount = vehicles.filter((v) => v.status === "service_due").length;
    const fleetReadiness = vehicles.length > 0 
      ? `${Math.round((activeCount / vehicles.length) * 100)}%` 
      : "100%";

    exportToPDF({
      title: "Fleet Inventory & Compliance Register",
      subtitle: `Master Record of Fleet Vehicles & Document Health • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `RK_Fleet_Vehicles_${new Date().toISOString().slice(0, 10)}.pdf`,
      headers,
      data,
      orientation: "landscape",
      summary: [
        { label: "Total Fleet", value: String(vehicles.length) },
        { label: "Active Fleet", value: String(activeCount) },
        { label: "Service Due", value: String(serviceDueCount) },
        { label: "Fleet Readiness", value: fleetReadiness },
      ],
    });
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
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/vehicles-scenic-hero.jpg"
            alt="RK Travel Fleet on Panoramic Highway"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 1500px"
            className="object-cover object-[70%_65%]"
          />
          {/* Subtle directional gradient restricted to the left for text legibility, leaving the 3 fleet vehicles bright */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>


        {/* Top Floating Action Pill Buttons (Aligned to Right on Desktop, Perfectly Arranged Grid on Mobile) */}
        <div className="relative z-10 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-1.5 sm:gap-2.5 w-full">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto shrink-0"
            title="Export Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2 rounded-full bg-white/95 hover:bg-white text-rose-700 backdrop-blur-md border border-rose-200/80 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto shrink-0"
            title="Download Official PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">PDF</span>
          </button>

          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center justify-center gap-1 px-1.5 sm:px-5 py-2 sm:py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-[11px] sm:text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75] shrink-0" />
            <span className="truncate">Add Vehicle</span>
          </button>
        </div>

        {/* Left Side: Fleet Inventory & Compliance Title + 4 Feature Pills */}
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
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
        className="relative z-20 px-1 sm:px-2 -mt-10 sm:-mt-12 lg:-mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
      >
        {/* CARD 1: TOTAL VEHICLES */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          {/* Subtle Wave Sparkline Curve at Bottom */}
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#EAF2FD] text-[#1A68F8] flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  TOTAL VEHICLES
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {totalVehicles}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Fleet registered
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#EEF5FE] text-[#1A68F8] flex items-center justify-center">
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#EEF5FE] text-[#1A68F8] items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#1A68F8] bg-[#EEF5FE] px-2 sm:px-3 py-0.5 rounded-full border border-blue-100/70 ml-auto sm:ml-0">
              Active fleet
            </span>
          </div>
        </div>

        {/* CARD 2: ACTIVE FLEET */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  ACTIVE FLEET
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {activeVehicles}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  On the road
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#E6F8EF] text-[#059669] flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#E6F8EF] text-[#059669] items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-[#059669] bg-[#ECFDF5] px-2 sm:px-3 py-0.5 rounded-full border border-emerald-100/70 ml-auto sm:ml-0">
              {activePercent}% Operational
            </span>
          </div>
        </div>

        {/* CARD 3: SERVICE DUE */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  SERVICE DUE
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {serviceDueVehicles}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Pending service
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#FEF3D6] text-[#D97706] flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#FEF3D6] text-[#D97706] items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold ${
                serviceDueVehicles > 0
                  ? "text-[#D97706] bg-[#FEF3D6] border-amber-200/70"
                  : "text-emerald-700 bg-emerald-50 border-emerald-100/70"
              } px-2 sm:px-3 py-0.5 rounded-full border ml-auto sm:ml-0`}
            >
              {serviceDueVehicles > 0 ? "Action needed" : "All Good"}
            </span>
          </div>
        </div>

        {/* CARD 4: DOCUMENT EXPIRIES */}
        <div className="group bg-white rounded-[20px] sm:rounded-[22px] p-3 sm:p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.05)] sm:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-lg hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between relative overflow-hidden min-h-[100px] sm:min-h-[86px] h-auto gap-2 sm:gap-0">
          <div className="absolute right-2 sm:right-12 bottom-1 w-20 sm:w-24 h-10 pointer-events-none opacity-40 sm:opacity-50">
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

          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block truncate">
                  DOCUMENT EXPIRIES
                </span>
                <span className="text-xl sm:text-2xl 2xl:text-[26px] font-black text-slate-900 font-mono tracking-tight leading-none mt-0.5 sm:mt-1 block truncate">
                  {expiringDocsCount}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block truncate mt-0.5 sm:mt-1">
                  Insurance / Permits
                </span>
              </div>
            </div>

            <div className="sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-full bg-[#F3F0FF] text-[#7C3AED] flex items-center justify-center">
                <Shield className="w-3 h-3 stroke-[2.2]" />
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-between h-full shrink-0 relative z-10 w-full sm:w-auto pt-1 sm:pt-0">
            <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#F3F0FF] text-[#7C3AED] items-center justify-center">
              <Shield className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold ${
                expiringDocsCount > 0
                  ? "text-rose-700 bg-rose-50 border-rose-200/70"
                  : "text-emerald-700 bg-emerald-50 border-emerald-100/70"
              } px-2 sm:px-3 py-0.5 rounded-full border ml-auto sm:ml-0`}
            >
              {expiringDocsCount > 0 ? "Expiring soon" : "All Valid"}
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
                      autoCapitalize="characters"
                      value={form.registrationNumber}
                      onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans placeholder:font-normal"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      VEHICLE TYPE <span className="text-rose-500">*</span>
                    </label>
                    {!isAddingNewType && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewType(true);
                          setNewTypeInput("");
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Add New Type</span>
                      </button>
                    )}
                  </div>

                  {isAddingNewType ? (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type name (e.g. Scania Bus, Thar)"
                          autoCapitalize="words"
                          value={newTypeInput}
                          onChange={(e) => setNewTypeInput(capitalizeWords(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNewVehicleType();
                            } else if (e.key === "Escape") {
                              setIsAddingNewType(false);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-white border-2 border-blue-500 rounded-xl text-xs font-semibold text-slate-900 outline-none shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewVehicleType()}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewType(false);
                            setNewTypeInput("");
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Type the name and click Save or press Enter.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(e) => {
                          if (e.target.value === "__add_new__") {
                            setIsAddingNewType(true);
                            setNewTypeInput("");
                          } else {
                            setForm({ ...form, type: e.target.value });
                          }
                        }}
                        className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                      >
                        {allVehicleTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                        <option disabled className="text-slate-300">
                          ──────────
                        </option>
                        <option value="__add_new__" className="text-blue-600 font-bold">
                          + Add New Vehicle Type...
                        </option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
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
                    autoCapitalize="words"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: capitalizeWords(e.target.value) })}
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
                    {allVehicleTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="service_due">Service Due</option>
                    <option value="expiring_docs">Expiring Docs</option>
                    <option value="in_maintenance">Maintenance</option>
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
                                  {vehicle.isConfirmed || isRecordConfirmed('vehicles', vehicle.id, vehicle) ? (
                                    <div className="px-3 py-1.5 text-emerald-700 bg-emerald-50/70 flex items-center gap-1.5 text-[11px] font-bold">
                                      <Lock className="w-3 h-3 text-emerald-600" />
                                      <span>Confirmed (Locked)</span>
                                    </div>
                                  ) : (
                                    <>
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
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Registration Number */}
                          <p className="text-[11px] font-extrabold text-slate-700 font-mono tracking-tight mt-0.5">
                            {vehicle.registrationNumber}
                          </p>
                        </div>

                        {/* Row 3: Meta Chips (Seats & Fuel) & Book Trip Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{seats}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Fuel className="w-3 h-3 text-slate-400" />
                              <span>{fuel}</span>
                            </div>
                          </div>

                          <Link
                            href={`/travel/trips?vehicleId=${vehicle.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg transition-colors"
                            title="Dispatch trip with this vehicle"
                          >
                            <Bus className="w-2.5 h-2.5" />
                            <span>Book Trip</span>
                          </Link>
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
                        <Link
                          href={`/travel/trips?vehicleId=${vehicle.id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg transition-colors mr-1"
                          title="Dispatch trip with this vehicle"
                        >
                          <Bus className="w-2.5 h-2.5" />
                          <span>Book Trip</span>
                        </Link>
                        {vehicle.isConfirmed || isRecordConfirmed('vehicles', vehicle.id, vehicle) ? (
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
                              onClick={() => handleEdit(vehicle)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit vehicle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === vehicle.id}
                              onClick={() => handleDelete(vehicle)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete vehicle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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
          4. MANUAL MOUSE IMAGE CROPPER MODAL
          ───────────────────────────────────────────────────────────── */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-[24px] max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Crop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Manual Photo Crop</h3>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Adjust the crop box with your mouse by dragging the handles or center.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Aspect Ratio & Tool Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleAspectChange(16 / 9)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cropAspect === 16 / 9
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  16:9
                </button>
                <button
                  type="button"
                  onClick={() => handleAspectChange(4 / 3)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cropAspect === 4 / 3
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  4:3
                </button>
                <button
                  type="button"
                  onClick={() => handleAspectChange(1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cropAspect === 1
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => handleAspectChange(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cropAspect === null
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Free (Manual)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCenterCrop}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  title="Center Crop Box"
                >
                  <Move className="w-3 h-3 text-slate-500" />
                  Center
                </button>
                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  title="Maximize Crop Area"
                >
                  <Maximize2 className="w-3 h-3 text-slate-500" />
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Image & Crop Box Stage */}
            <div className="relative flex-1 min-h-[260px] max-h-[58vh] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-2 sm:p-4 select-none touch-none">
              <div className="relative inline-block overflow-hidden shadow-2xl">
                {rawPhotoUrl && (
                  <img
                    ref={cropImgRef}
                    src={rawPhotoUrl}
                    alt="Target to crop"
                    onLoad={handleCropImageLoad}
                    className="max-h-[52vh] max-w-full w-auto h-auto object-contain block pointer-events-none select-none"
                    draggable={false}
                  />
                )}

                {/* Interactive Crop Box Overlay */}
                {cropBox && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.w}px`,
                      height: `${cropBox.h}px`,
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startCropDrag("move", e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches[0]) startCropDrag("move", e.touches[0].clientX, e.touches[0].clientY);
                    }}
                    className="border-2 border-white cursor-move pointer-events-auto"
                  >
                    {/* 3x3 Grid Guidelines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div />
                    </div>

                    {/* Drag hint badge */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                      <span className="bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs font-semibold flex items-center gap-0.5">
                        <Move className="w-2.5 h-2.5" /> Drag
                      </span>
                    </div>

                    {/* Corner Handles (4 corners) */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("nw", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("nw", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Top-Left"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("ne", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("ne", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Top-Right"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("sw", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("sw", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Bottom-Left"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("se", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("se", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm shadow-md cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Bottom-Right"
                    />

                    {/* Edge Handles (4 edges) */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("n", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("n", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-7 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ns-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Top Edge"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("s", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("s", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-7 h-2.5 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ns-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Bottom Edge"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("w", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("w", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-7 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ew-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Left Edge"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startCropDrag("e", e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches[0]) startCropDrag("e", e.touches[0].clientX, e.touches[0].clientY);
                      }}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-7 bg-white border-2 border-blue-600 rounded-full shadow-md cursor-ew-resize z-20 hover:scale-125 transition-transform"
                      title="Resize Right Edge"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Tip: Drag corners or edges to crop freely.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-5 py-2 rounded-xl bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
