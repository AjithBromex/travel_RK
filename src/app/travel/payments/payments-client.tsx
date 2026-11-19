"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  CircleDollarSign,
  UserCheck,
  Clock,
  BarChart3,
  CreditCard,
  Receipt,
  Download,
  Wallet,
  Search,
  ChevronDown,
  X,
  Trash2,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  Banknote,
  Building2,
  LayoutGrid,
  List,
  FileText,
  Printer,
  Eye,
  Lock,
  AlertCircle,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV, exportToPDF } from "@/lib/utils";
import type { Payment, Trip, Vehicle, PaymentType, PaymentMode, PaymentStage } from "@/types";
import {
  getPayments,
  createPayment,
  deletePayment,
  sortPaymentsRecentFirst,
  reconcileTripsWithPayments,
} from "@/services/payments.service";
import { getTrips, updateTrip } from "@/services/trips.service";
import { getVehicles } from "@/services/vehicles.service";
import {
  getStoredPayments,
  getStoredTrips,
  getStoredVehicles,
  upsertStoredTrip,
  subscribeDataChanged,
  isRecordConfirmed,
} from "@/lib/storage-sync";
import InvoiceModal from "@/components/InvoiceModal";
import SearchableTripSelect from "@/components/SearchableTripSelect";
import {
  buildInvoiceData,
  downloadInvoicePDF,
  type InvoiceData,
} from "@/lib/invoicePdf";

interface PaymentsClientProps {
  initialPayments: Payment[];
  trips: Trip[];
  vehicles?: Vehicle[];
}

export default function PaymentsClient({ initialPayments, trips, vehicles }: PaymentsClientProps) {
  const [payments, setPayments] = useState<Payment[]>(() => {
    const list = initialPayments && initialPayments.length > 0 ? initialPayments : getStoredPayments();
    return sortPaymentsRecentFirst(list);
  });

  const [tripList, setTripList] = useState<Trip[]>(() => {
    if (trips && trips.length > 0) return trips;
    return getStoredTrips();
  });

  const [vehicleList, setVehicleList] = useState<Vehicle[]>(() => {
    if (vehicles && vehicles.length > 0) return vehicles;
    return getStoredVehicles();
  });

  // Reconcile trip balances dynamically against actual active payments
  const reconciledTripList = useMemo(() => {
    return reconcileTripsWithPayments(tripList, payments);
  }, [tripList, payments]);

  // Synchronize any discrepancies to localStorage and Firestore in the background
  useEffect(() => {
    if (tripList.length > 0) {
      reconciledTripList.forEach((rTrip) => {
        const original = tripList.find((t) => t.id === rTrip.id);
        if (
          original &&
          (Number(original.customerPaid) !== Number(rTrip.customerPaid) ||
           Number(original.customerBalance) !== Number(rTrip.customerBalance) ||
           Number(original.driverPaid) !== Number(rTrip.driverPaid) ||
           Number(original.driverBalance) !== Number(rTrip.driverBalance))
        ) {
          upsertStoredTrip(rTrip);
          updateTrip(rTrip.id, {
            customerPaid: rTrip.customerPaid,
            customerBalance: rTrip.customerBalance,
            driverPaid: rTrip.driverPaid,
            driverBalance: rTrip.driverBalance,
          }).catch(() => {});
        }
      });
    }
  }, [tripList, payments, reconciledTripList]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeInvoiceData, setActiveInvoiceData] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [justAddedInvoice, setJustAddedInvoice] = useState<InvoiceData | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchPaymentsData = () => {
    getPayments(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setPayments(sortPaymentsRecentFirst(data));
        }
      })
      .catch((err) => {
        console.warn("[Payments] Client payments hydration error:", err);
      });
  };

  const fetchTripsData = () => {
    getTrips(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setTripList(data);
        }
      })
      .catch((err) => {
        console.warn("[Payments] Client trips hydration error:", err);
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
        console.warn("[Payments] Client vehicles hydration error:", err);
      });
  };

  useEffect(() => {
    fetchPaymentsData();
    fetchTripsData();
    fetchVehiclesData();

    // Check URL parameters for preset trip selection from Trips page
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qTripId = params.get("tripId");
      const qAmount = params.get("amount");
      const qType = params.get("type") as PaymentType;
      const qStage = params.get("stage") as PaymentStage;
      if (qTripId) {
        setForm((prev) => ({
          ...prev,
          tripId: qTripId,
          amount: qAmount || prev.amount,
          type: qType || prev.type,
          paymentStage: qStage || (qAmount ? "balance" : prev.paymentStage),
        }));
      }
    }

    // Subscribe to cross-page synchronization
    const unsubscribe = subscribeDataChanged((entity) => {
      if (entity === "payments" || entity === "all") {
        fetchPaymentsData();
      }
      if (entity === "trips" || entity === "all") {
        fetchTripsData();
      }
      if (entity === "vehicles" || entity === "all") {
        fetchVehiclesData();
      }
    });

    return () => unsubscribe();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const emptyForm = {
    tripId: "",
    type: "customer_received" as PaymentType,
    paymentStage: "advance" as PaymentStage,
    paymentDate: todayStr,
    amount: "",
    paymentMode: "upi" as PaymentMode,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  const selectedTrip = useMemo(() => {
    if (!form.tripId || form.tripId === "general") return null;
    return (
      reconciledTripList.find(
        (t) => t.id === form.tripId || t.tripNumber === form.tripId
      ) || null
    );
  }, [form.tripId, reconciledTripList]);

  const maxCustomerBalance = useMemo(() => {
    if (!selectedTrip) return null;
    return Number(selectedTrip.customerBalance) || 0;
  }, [selectedTrip]);

  const handleTripSelect = (selectedId: string) => {
    const trip = reconciledTripList.find((t) => t.id === selectedId || t.tripNumber === selectedId);
    let autoAmount = "";
    let autoStage: PaymentStage = form.paymentStage;
    let autoNotes = "";

    if (trip) {
      const adv = Number(trip.advanceReceived) || 0;
      const bal = Number(trip.customerBalance) || 0;
      if (form.type === "customer_received") {
        if (bal > 0 && adv > 0) {
          // Advance was already received before trip, so this is the balance settlement after trip
          autoStage = "balance";
          autoAmount = String(bal);
          autoNotes = `Balance payment after trip completion - Trip #${trip.tripNumber || trip.id.slice(0, 6)} (${trip.customerName})`;
        } else if (bal > 0 && adv === 0) {
          // Pre-trip advance payment
          autoStage = "advance";
          autoNotes = `Advance payment before trip - Trip #${trip.tripNumber || trip.id.slice(0, 6)} (${trip.customerName})`;
        } else if (bal === 0) {
          autoAmount = "";
        }
      } else if (form.type === "driver_payment" && Number(trip.driverBalance) > 0) {
        autoAmount = String(trip.driverBalance);
        autoNotes = `Driver payout voucher - Trip #${trip.tripNumber || trip.id.slice(0, 6)} (${trip.driverName || "Driver"})`;
      }
    }

    setForm((prev) => ({
      ...prev,
      tripId: selectedId,
      paymentStage: autoStage,
      amount: trip ? (autoAmount || prev.amount) : "",
      notes: trip ? (autoNotes || prev.notes) : "",
    }));
  };

  const handleStageSelect = (stage: PaymentStage) => {
    let newAmount = form.amount;
    let newNotes = form.notes;

    if (selectedTrip) {
      if (stage === "advance") {
        newAmount = selectedTrip.advanceReceived ? String(selectedTrip.advanceReceived) : form.amount;
        newNotes = `Advance payment before trip - Trip #${selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} (${selectedTrip.customerName})`;
      } else if (stage === "balance") {
        newAmount = Number(selectedTrip.customerBalance) > 0 ? String(selectedTrip.customerBalance) : "";
        newNotes = `Balance payment after trip completion - Trip #${selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} (${selectedTrip.customerName})`;
      } else {
        newNotes = `Payment receipt - Trip #${selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} (${selectedTrip.customerName})`;
      }
    }

    setForm((prev) => ({
      ...prev,
      paymentStage: stage,
      amount: newAmount,
      notes: newNotes,
    }));
  };

  const handleOpenInvoice = (payment: Payment) => {
    const linkedTrip = reconciledTripList.find((t) => t.id === payment.tripId || t.tripNumber === payment.tripId);
    const linkedVehicle = linkedTrip
      ? vehicleList.find((v) => v.id === linkedTrip.vehicleId || v.registrationNumber === linkedTrip.vehicleName)
      : undefined;
    const invData = buildInvoiceData(payment, linkedTrip, linkedVehicle);
    setActiveInvoiceData(invData);
    setIsInvoiceModalOpen(true);
  };

  const handleDownloadInvoiceDirect = async (payment: Payment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const linkedTrip = reconciledTripList.find((t) => t.id === payment.tripId || t.tripNumber === payment.tripId);
    const linkedVehicle = linkedTrip
      ? vehicleList.find((v) => v.id === linkedTrip.vehicleId || v.registrationNumber === linkedTrip.vehicleName)
      : undefined;
    const invData = buildInvoiceData(payment, linkedTrip, linkedVehicle);
    await downloadInvoicePDF(invData);
  };

  // Dynamic Real KPIs strictly from actual payments & trips data
  const realTotalInflow = payments
    .filter((p) => p.type === "customer_received")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const realDriverPayouts = payments
    .filter((p) => p.type === "driver_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const realPendingDues = reconciledTripList.reduce(
    (sum, t) => sum + (Number(t.customerBalance) > 0 ? Number(t.customerBalance) : 0),
    0
  );

  const displayTotalInflow = realTotalInflow;
  const displayDriverPayouts = realDriverPayouts;
  const displayPendingDues = realPendingDues;
  const displayNetMargin = displayTotalInflow - displayDriverPayouts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    // Enforce trip selection before allowing any payment
    if (!form.tripId || form.tripId === "general" || !selectedTrip) {
      setFeedback({
        message: "Please select a trip booking. Payments can only be recorded after selecting a trip.",
        type: "error",
      });
      setLoading(false);
      return;
    }

    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) {
      setFeedback({ message: "Please enter a valid payment amount", type: "error" });
      setLoading(false);
      return;
    }

    // STRICT CHECK: while adding the balance amount, add only that balance, not more than the balance
    if (
      selectedTrip &&
      form.type === "customer_received" &&
      form.paymentStage === "balance" &&
      maxCustomerBalance !== null
    ) {
      if (maxCustomerBalance <= 0) {
        setFeedback({
          message: "This trip is already fully settled. There is no pending balance due.",
          type: "error",
        });
        setLoading(false);
        return;
      }
      if (amountNum > maxCustomerBalance) {
        setFeedback({
          message: `Cannot enter more than the remaining balance of ${formatINR(maxCustomerBalance)}.`,
          type: "error",
        });
        setLoading(false);
        return;
      }
    }

    try {
      const targetTripId = selectedTrip.tripNumber || selectedTrip.id || form.tripId;
      const newId = await createPayment({
        tripId: targetTripId,
        type: form.type,
        paymentStage: form.type === "customer_received" ? form.paymentStage : undefined,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
      });

      const newPayment: Payment = {
        id: newId,
        tripId: targetTripId,
        type: form.type,
        paymentStage: form.type === "customer_received" ? form.paymentStage : undefined,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPayments((prev) => sortPaymentsRecentFirst([newPayment, ...prev]));

      // Update local trip dues immediately if linked to a trip
      let matchedTrip: Trip | undefined;
      if (form.tripId && form.tripId !== "general") {
        setTripList((prev) =>
          prev.map((t) => {
            if (t.id === form.tripId || t.tripNumber === form.tripId) {
              matchedTrip = t;
              if (form.type === "customer_received") {
                const newPaid = (Number(t.customerPaid) || 0) + amountNum;
                const newBal = Math.max(0, (Number(t.totalFare) || 0) - newPaid);
                const newAdv = form.paymentStage === "advance"
                  ? (Number(t.advanceReceived) || 0) + amountNum
                  : t.advanceReceived;
                return { ...t, customerPaid: newPaid, customerBalance: newBal, advanceReceived: newAdv };
              } else if (form.type === "driver_payment") {
                const newDriverPaid = (Number(t.driverPaid) || 0) + amountNum;
                const newDriverBal = Math.max(0, (Number(t.driverAgreedPay) || 0) - newDriverPaid);
                return { ...t, driverPaid: newDriverPaid, driverBalance: newDriverBal };
              }
            }
            return t;
          })
        );
      }

      const linkedTrip = matchedTrip || reconciledTripList.find((t) => t.id === form.tripId || t.tripNumber === form.tripId);
      const linkedVehicle = linkedTrip
        ? vehicleList.find((v) => v.id === linkedTrip.vehicleId || v.registrationNumber === linkedTrip.vehicleName)
        : undefined;
      const invoiceData = buildInvoiceData(newPayment, linkedTrip, linkedVehicle);
      setJustAddedInvoice(invoiceData);

      setFeedback({
        message: form.type === "customer_received"
          ? form.paymentStage === "advance"
            ? "Advance payment (pre-trip) recorded successfully! Receipt generated."
            : "Balance payment (post-trip) recorded successfully! Final settlement receipt generated."
          : "Driver payout voucher recorded successfully! Voucher generated.",
        type: "success",
      });
      setForm(emptyForm);
    } catch (err: unknown) {
      console.error("Save payment error:", err);
      setFeedback({
        message: (err as Error)?.message || "Failed to record payment",
        type: "error",
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        // Keep invoice accessible longer
      }, 4000);
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (payment.isConfirmed || isRecordConfirmed('payments', payment.id, payment)) {
      alert("This payment has been confirmed by Admin and cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this payment of ${formatINR(payment.amount)}?`)) {
      return;
    }

    // Optimistically remove from UI immediately (instant response, zero lag!)
    const remainingPayments = payments.filter((p) => p.id !== payment.id);
    setPayments(remainingPayments);
    setTripList((prev) => reconcileTripsWithPayments(prev, remainingPayments));
    setFeedback({ message: "Payment entry deleted successfully.", type: "success" });

    try {
      await deletePayment(payment.id);
    } catch {
      setFeedback({ message: "Failed to delete payment.", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert("No payments recorded yet to export.");
      return;
    }
    const data = filteredPayments.map((p) => ({
      "Payment Date": formatDate(p.paymentDate),
      "Trip Reference": p.tripId && p.tripId !== "general" ? `Trip #${p.tripId}` : "General Payment",
      "Transaction Type":
        p.type === "driver_payment"
          ? "Driver Payout"
          : (p.paymentStage === "advance" || (Boolean(p.notes) && /advance/i.test(p.notes!)))
          ? "Advance Payment (Pre-Trip)"
          : (p.paymentStage === "balance" || (Boolean(p.notes) && /balance/i.test(p.notes!)))
          ? "Balance Payment (Post-Trip)"
          : "Customer Inflow",
      "Amount (INR)": p.amount,
      "Payment Mode": p.paymentMode.toUpperCase(),
      Notes: p.notes || "-",
    }));
    exportToCSV(data, `Payments_Ledger_${todayStr}.csv`);
  };

  const handleExportPDF = () => {
    if (filteredPayments.length === 0) {
      alert("No payments recorded yet to export.");
      return;
    }
    const headers = ["Date", "Trip Reference", "Type", "Amount", "Mode", "Notes"];
    const data = filteredPayments.map((p) => [
      formatDate(p.paymentDate),
      p.tripId && p.tripId !== "general" ? `Trip #${p.tripId}` : "General Payment",
      p.type === "driver_payment"
        ? "Driver Payout"
        : (p.paymentStage === "advance" || (Boolean(p.notes) && /advance/i.test(p.notes!)))
        ? "Advance (Pre-Trip)"
        : (p.paymentStage === "balance" || (Boolean(p.notes) && /balance/i.test(p.notes!)))
        ? "Balance (Post-Trip)"
        : "Customer Inflow",
      formatINR(p.amount),
      p.paymentMode.toUpperCase(),
      p.notes || "-",
    ]);
    const totalInflow = filteredPayments
      .filter((p) => p.type === "customer_received")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPayout = filteredPayments
      .filter((p) => p.type === "driver_payment")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    exportToPDF({
      title: "Payments & Treasury Ledger",
      subtitle: `Official Statement of Transactions • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `Payments_Ledger_${todayStr}.pdf`,
      headers,
      data,
      orientation: "landscape",
      summary: [
        { label: "Total Transactions", value: String(filteredPayments.length) },
        { label: "Total Inflow", value: formatINR(totalInflow) },
        { label: "Driver Payouts", value: formatINR(totalPayout) },
        { label: "Net Cash Flow", value: formatINR(totalInflow - totalPayout) },
      ],
    });
  };

  // Filtered Payments - always sorted so recently added payment is listed on top
  const filteredPayments = useMemo(() => {
    const list = payments.filter((p) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          (p.tripId && p.tripId.toLowerCase().includes(query)) ||
          p.paymentMode.toLowerCase().includes(query) ||
          (p.notes && p.notes.toLowerCase().includes(query)) ||
          String(p.amount).includes(query);
        if (!matches) return false;
      }

      if (typeFilter === "advance") {
        const isAdv = p.type === "customer_received" && (p.paymentStage === "advance" || (Boolean(p.notes) && /advance/i.test(p.notes!)));
        if (!isAdv) return false;
      } else if (typeFilter === "balance") {
        const isBal = p.type === "customer_received" && (p.paymentStage === "balance" || (Boolean(p.notes) && /balance/i.test(p.notes!)));
        if (!isBal) return false;
      } else if (typeFilter === "customer_received" && p.type !== "customer_received") {
        return false;
      } else if (typeFilter === "driver_payment" && p.type !== "driver_payment") {
        return false;
      } else if (typeFilter === "upi" && p.paymentMode !== "upi") {
        return false;
      } else if (typeFilter === "cash" && p.paymentMode !== "cash") {
        return false;
      }

      return true;
    });

    return sortPaymentsRecentFirst(list);
  }, [payments, search, typeFilter]);

  const handleFocusNewPayment = () => {
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER (Payments Sunset Alpine Coach)
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[290px] sm:min-h-[320px] lg:min-h-[350px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Tour Coach Highway Image */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/payments-scenic-hero.jpg"
            alt="Scenic Alpine Highway with Luxury Tour Bus"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 1500px"
            className="object-cover object-[70%_50%]"
          />
          {/* Directional text gradient on left for crystal clear readability */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Row: Action Buttons (Aligned to Right on Desktop, Perfectly Arranged Grid on Mobile) */}
        <div className="relative z-10 grid grid-cols-3 sm:flex sm:items-center sm:justify-end gap-1.5 sm:gap-2.5 w-full sm:w-auto">
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

          <Link
            href="/travel/cashbook"
            prefetch={true}
            className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-[11px] sm:text-xs transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Cash Book</span>
          </Link>
        </div>

        {/* Title & Brand Capsule (Left) + Handwritten Script (Right) */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
              <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
                TREASURY &amp; LEDGER
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              <span>Payment </span>
              <span className="text-[#38BDF8]">Management</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow line-clamp-2">
              Record customer collections, driver settlements, advance vouchers, and manage outstanding balances.
            </p>
          </div>

          {/* Elegant Calligraphic Brand Script on Right */}
          <div className="hidden md:block text-right pr-2 pb-1 select-none pointer-events-none">
            <p className="font-serif italic text-white/95 text-xl lg:text-2xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Smooth Operations
            </p>
            <p className="font-serif italic text-white/90 text-sm lg:text-base font-medium tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] -mt-1">
              Stronger Journeys
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-10 sm:-mt-12 lg:-mt-14 relative z-20 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 px-1 sm:px-4">
        {/* CARD 1: TOTAL INFLOW */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CircleDollarSign className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  TOTAL INFLOW
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayTotalInflow)}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
                ↑ 12%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Customer receipts</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
              Received
            </span>
          </div>
        </div>

        {/* CARD 2: DRIVER PAYOUTS */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  DRIVER PAYOUTS
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayDriverPayouts)}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
                ↑ 8%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Disbursed to drivers</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
              Disbursed
            </span>
          </div>
        </div>

        {/* CARD 3: PENDING RECIEVABLES */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  PENDING RECEIVABLES
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayPendingDues)}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700">
                ↓ 5%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Uncollected fares</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              Pending
            </span>
          </div>
        </div>

        {/* CARD 4: NET TREASURY MARGIN */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  NET TREASURY MARGIN
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayNetMargin)}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
                ↑ 15%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Collections - Disbursals</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
              Net Balance
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast & Instant Invoice Download Card */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-950">{feedback.message}</p>
              {justAddedInvoice && (
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  Receipt #{justAddedInvoice.receiptNo} &bull; {justAddedInvoice.customerName} &bull; {formatINR(justAddedInvoice.advanceReceived)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {justAddedInvoice && (
              <>
                <button
                  type="button"
                  onClick={() => downloadInvoicePDF(justAddedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Invoice PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveInvoiceData(justAddedInvoice);
                    setIsInvoiceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Preview Voucher</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setJustAddedInvoice(null);
              }}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-200/50 cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TWO-COLUMN CONTENT: FORM (LEFT) & LEDGER (RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════ LEFT COLUMN: RECORD PAYMENT VOUCHER (5 COLS) ══════════════ */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                <CreditCard className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Record Payment Voucher
                </h2>
                <p className="text-[11px] text-slate-400">
                  Log customer receipt, advance, or driver payout
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Segmented Buttons (Customer Inflow vs Driver Payout) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "customer_received" })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.type === "customer_received"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Customer Inflow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "driver_payment" })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.type === "driver_payment"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Driver Payout</span>
                </button>
              </div>

              {/* Customer Payment Stage (Advance vs Balance Settlement) */}
              {form.type === "customer_received" && (
                <div className="space-y-1.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>Customer Payment Type</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Advance before trip or Balance after trip</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleStageSelect("advance")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        form.paymentStage === "advance"
                          ? "bg-sky-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Advance (Pre-Trip)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStageSelect("balance")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        form.paymentStage === "balance"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Balance (Post-Trip)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Trip Booking Searchable Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>Linked Trip Booking</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <Link
                    href="/travel/trips"
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Trips</span>
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </Link>
                </div>
                <SearchableTripSelect
                  trips={reconciledTripList}
                  value={form.tripId}
                  onChange={(selectedId) => handleTripSelect(selectedId)}
                  placeholder="🔍 Search & select a trip booking (Required)..."
                  requiredTrip={true}
                  showDueBadge={true}
                />
                {!selectedTrip && (
                  <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-amber-950 text-xs">Trip Booking Required</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Please search and select a trip booking above before making a payment. Customer advance, balance settlement, and driver payouts must be linked to a specific trip.
                      </p>
                    </div>
                  </div>
                )}
                {reconciledTripList.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    No trips found. <Link href="/travel/trips" className="font-bold underline text-blue-600">Create a trip here</Link>.
                  </p>
                )}
              </div>

              {/* Selected Trip Financial Breakdown Card with Quick Action Buttons */}
              {selectedTrip && (
                <div className="p-3 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-50 border border-blue-200/70 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate">
                      Trip #{selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} • {selectedTrip.customerName}
                    </span>
                    <span className="font-bold text-slate-900 font-mono-nums shrink-0 ml-2">
                      Total Fare: {formatINR(selectedTrip.totalFare)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/60">
                    <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Advance Paid (Pre-Trip)</span>
                      <span className="font-extrabold text-sky-700 text-xs font-mono-nums">
                        {formatINR(selectedTrip.advanceReceived || 0)}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Remaining Due</span>
                      <span className={`font-extrabold text-xs font-mono-nums ${Number(selectedTrip.customerBalance) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {Number(selectedTrip.customerBalance) > 0 ? formatINR(selectedTrip.customerBalance) : "Fully Settled ✓"}
                      </span>
                    </div>
                  </div>
                  {/* Quick-fill helper buttons */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    {Number(selectedTrip.customerBalance) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            type: "customer_received",
                            paymentStage: "balance",
                            amount: String(selectedTrip.customerBalance),
                            notes: `Balance payment after trip completion - Trip #${selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} (${selectedTrip.customerName})`,
                          }));
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Fill Remaining Balance ({formatINR(selectedTrip.customerBalance)})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          type: "customer_received",
                          paymentStage: "advance",
                          amount: selectedTrip.advanceReceived ? String(selectedTrip.advanceReceived) : prev.amount,
                          notes: `Advance payment before trip - Trip #${selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} (${selectedTrip.customerName})`,
                        }));
                      }}
                      className="text-[10px] font-bold px-2.5 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3 text-sky-700" />
                      <span>Record Advance (Pre-Trip)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Amount & Date (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>Amount (₹)</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {selectedTrip && form.type === "customer_received" && form.paymentStage === "balance" && maxCustomerBalance !== null && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/70">
                        Max: {formatINR(maxCustomerBalance)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      ref={amountInputRef}
                      type="number"
                      min={1}
                      disabled={!selectedTrip}
                      max={
                        selectedTrip && form.type === "customer_received" && form.paymentStage === "balance" && maxCustomerBalance !== null && maxCustomerBalance > 0
                          ? maxCustomerBalance
                          : undefined
                      }
                      placeholder={
                        !selectedTrip
                          ? "Select trip booking first..."
                          : selectedTrip && form.type === "customer_received" && form.paymentStage === "balance" && maxCustomerBalance !== null && maxCustomerBalance > 0
                          ? String(maxCustomerBalance)
                          : "e.g. 5000"
                      }
                      value={form.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          selectedTrip &&
                          form.type === "customer_received" &&
                          form.paymentStage === "balance" &&
                          maxCustomerBalance !== null
                        ) {
                          const num = Number(val);
                          if (num > maxCustomerBalance) {
                            setForm({ ...form, amount: String(maxCustomerBalance) });
                            setFeedback({
                              message: `Amount cannot exceed the remaining balance of ${formatINR(maxCustomerBalance)}. Capped to balance.`,
                              type: "error",
                            });
                            return;
                          }
                        }
                        setForm({ ...form, amount: val });
                      }}
                      required
                      className={`w-full pl-7 pr-3 py-2 border rounded-xl text-xs font-bold outline-none transition-all ${
                        !selectedTrip
                          ? "bg-slate-100/90 text-slate-400 border-slate-200 cursor-not-allowed placeholder:text-slate-400"
                          : selectedTrip &&
                            form.type === "customer_received" &&
                            form.paymentStage === "balance" &&
                            maxCustomerBalance !== null &&
                            Number(form.amount) > maxCustomerBalance
                          ? "bg-slate-50 border-rose-400 focus:border-rose-500 text-slate-900"
                          : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900"
                      }`}
                    />
                  </div>
                  {!selectedTrip ? (
                    <p className="mt-1 text-[10px] text-slate-400 italic">
                      Amount unlocks after selecting a trip booking.
                    </p>
                  ) : selectedTrip &&
                    form.type === "customer_received" &&
                    form.paymentStage === "balance" &&
                    maxCustomerBalance !== null && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Remaining Balance:</span>
                        <span className={`font-bold font-mono-nums ${maxCustomerBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                          {maxCustomerBalance > 0 ? `Only up to ${formatINR(maxCustomerBalance)}` : "Fully Settled ✓"}
                        </span>
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Payment Date</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMode: "upi" })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      form.paymentMode === "upi"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMode: "cash" })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      form.paymentMode === "cash"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMode: "bank_transfer" })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      form.paymentMode === "bank_transfer"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMode: "card" })}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      form.paymentMode === "card"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>CARD</span>
                  </button>
                </div>
              </div>

              {/* Voucher Notes / Reference Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Voucher Notes / Reference Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref #98721345, Advance payment received"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !selectedTrip ||
                  Boolean(
                    selectedTrip &&
                      form.type === "customer_received" &&
                      form.paymentStage === "balance" &&
                      maxCustomerBalance !== null &&
                      (maxCustomerBalance <= 0 || Number(form.amount) > maxCustomerBalance)
                  )
                }
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  !selectedTrip
                    ? "bg-slate-400 hover:bg-slate-400 shadow-none cursor-not-allowed"
                    : form.type === "customer_received"
                    ? form.paymentStage === "advance"
                      ? "bg-sky-600 hover:bg-sky-700 shadow-sky-500/25"
                      : maxCustomerBalance !== null && maxCustomerBalance <= 0
                      ? "bg-slate-400 hover:bg-slate-400 shadow-none"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
                    : "bg-[#0D62FE] hover:bg-[#0952DC] shadow-blue-500/25"
                }`}
              >
                {loading ? (
                  <span>Recording...</span>
                ) : !selectedTrip ? (
                  <>
                    <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Select a Trip Booking to Pay</span>
                  </>
                ) : form.type === "customer_received" ? (
                  form.paymentStage === "advance" ? (
                    <>
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                      <span>Record Advance Payment (Pre-Trip)</span>
                    </>
                  ) : maxCustomerBalance !== null && maxCustomerBalance <= 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Trip is Already Fully Settled ✓</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Record Balance Payment (Post-Trip)</span>
                    </>
                  )
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    <span>Record Driver Payout Voucher</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN: PAYMENT LEDGER (7 COLS) ══════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <Receipt className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Payment Ledger{" "}
                    <span className="text-slate-400 font-normal">
                      ({filteredPayments.length} entries)
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    View and manage all payment transactions
                  </p>
                </div>
              </div>

              {/* Search, Filter, & View Mode Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Input */}
                <div className="relative min-w-[150px] sm:min-w-[170px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search customer, trip, mode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Transactions</option>
                    <option value="advance">Advance (Pre-Trip)</option>
                    <option value="balance">Balance (Post-Trip)</option>
                    <option value="customer_received">All Customer Inflows</option>
                    <option value="driver_payment">Driver Payouts</option>
                    <option value="upi">UPI Payments</option>
                    <option value="cash">Cash Payments</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
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

            {/* ══════════════ CONTENT: EMPTY STATE OR LEDGER ROWS ══════════════ */}
            {filteredPayments.length === 0 ? (
              <div className="py-8 sm:py-10 text-center flex flex-col items-center justify-center space-y-4">
                {/* Illustration with bus, mountain highway, and blue rupee invoice document */}
                <div className="relative w-full max-w-[380px] sm:max-w-[440px] h-[140px] sm:h-[165px] mx-auto overflow-hidden">
                  <Image
                    src="/images/payments-empty-clean.jpg"
                    alt="No payment records yet illustration"
                    fill
                    priority
                    unoptimized
                    className="object-contain"
                  />
                </div>

                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    No payment records yet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record your first customer receipt or driver payout using the form on the left.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFocusNewPayment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0D62FE] text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Record First Payment</span>
                </button>

                {/* Bottom 4 Feature Highlight Cards */}
                <div className="w-full pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-100 mt-4 text-left">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">Track Collections</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Customer receipts &amp; advances</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">Manage Payouts</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Driver settlements &amp; expenses</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">Check Outstanding</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Pending receivables &amp; dues</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">View Reports</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Financial summaries &amp; export</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewMode === "list" ? (
              /* ══════════════ LIST VIEW TABLE ══════════════ */
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Trip / Ref</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(p.paymentDate)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const linkedTrip = reconciledTripList.find((t) => t.id === p.tripId || t.tripNumber === p.tripId);
                            if (linkedTrip) {
                              return (
                                <div>
                                  <Link
                                    href="/travel/trips"
                                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 flex-wrap"
                                    title="View Trip Bookings"
                                  >
                                    <span>Trip #{linkedTrip.tripNumber || linkedTrip.id.slice(0, 6)}</span>
                                    <span className="text-slate-400 font-normal">•</span>
                                    <span className="text-slate-800">{linkedTrip.customerName}</span>
                                  </Link>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {linkedTrip.from} → {linkedTrip.to}
                                  </p>
                                  {p.notes && (
                                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.notes}</p>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div>
                                <div className="font-bold text-slate-900">
                                  {p.tripId && p.tripId !== "general" ? `Trip #${p.tripId}` : "General Payment"}
                                </div>
                                {p.notes && (
                                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.notes}</p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const isAdv =
                              p.type === "customer_received" &&
                              (p.paymentStage === "advance" ||
                                (Boolean(p.notes) && /advance/i.test(p.notes!)));
                            const isBal =
                              p.type === "customer_received" &&
                              (p.paymentStage === "balance" ||
                                (Boolean(p.notes) && /balance/i.test(p.notes!)));

                            if (isAdv) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
                                  <Clock className="w-3 h-3 text-sky-600" />
                                  <span>Advance</span>
                                </span>
                              );
                            }
                            if (isBal) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Balance</span>
                                </span>
                              );
                            }
                            if (p.type === "customer_received") {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                  <span>Inflow</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                <span>Payout</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono-nums whitespace-nowrap">
                          <span
                            className={
                              p.type === "customer_received"
                                ? "text-emerald-600"
                                : "text-blue-600"
                            }
                          >
                            {p.type === "customer_received" ? "+" : "-"}
                            {formatINR(p.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0D62FE] font-bold text-[11px] transition-all cursor-pointer"
                              title="View & Download Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDownloadInvoiceDirect(p, e)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Download Invoice PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {p.isConfirmed || isRecordConfirmed('payments', p.id, p) ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Confirmed by Admin. Deletion is locked."
                              >
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Confirmed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDelete(p)}
                                disabled={deletingId === p.id}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Payment Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ══════════════ GRID VIEW CARDS ══════════════ */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {filteredPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      {(() => {
                        const isAdv =
                          p.type === "customer_received" &&
                          (p.paymentStage === "advance" ||
                            (Boolean(p.notes) && /advance/i.test(p.notes!)));
                        const isBal =
                          p.type === "customer_received" &&
                          (p.paymentStage === "balance" ||
                            (Boolean(p.notes) && /balance/i.test(p.notes!)));

                        if (isAdv) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>Advance (Pre-Trip)</span>
                            </span>
                          );
                        }
                        if (isBal) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Balance (Post-Trip)</span>
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.type === "customer_received"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                : "bg-blue-50 text-blue-700 border border-blue-200/70"
                            }`}
                          >
                            {p.type === "customer_received" ? "Customer Inflow" : "Driver Payout"}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                        {p.paymentMode}
                      </span>
                    </div>

                    <div>
                      <div className="text-xl font-black text-slate-900 font-mono-nums">
                        {formatINR(p.amount)}
                      </div>
                      {(() => {
                        const linkedTrip = reconciledTripList.find((t) => t.id === p.tripId || t.tripNumber === p.tripId);
                        if (linkedTrip) {
                          return (
                            <div className="mt-1">
                              <Link
                                href="/travel/trips"
                                className="text-xs font-bold text-blue-600 hover:underline block truncate"
                              >
                                Trip #{linkedTrip.tripNumber || linkedTrip.id.slice(0, 6)} • {linkedTrip.customerName}
                              </Link>
                              <p className="text-[10px] text-slate-500 truncate">{linkedTrip.from} → {linkedTrip.to}</p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {p.tripId && p.tripId !== "general" ? `Linked: Trip #${p.tripId}` : "General / Unlinked Voucher"}
                          </p>
                        );
                      })()}
                      {p.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400">
                        {formatDate(p.paymentDate)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenInvoice(p)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0D62FE] font-bold text-[11px] transition-all cursor-pointer"
                          title="View & Download Invoice"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadInvoiceDirect(p, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {p.isConfirmed || isRecordConfirmed('payments', p.id, p) ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Confirmed by Admin. Deletion is locked."
                          >
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Voucher Modal Preview & Download */}
      {activeInvoiceData && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setActiveInvoiceData(null);
          }}
          data={activeInvoiceData}
        />
      )}
    </div>
  );
}

