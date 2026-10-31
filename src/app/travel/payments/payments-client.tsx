"use client";

import { useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import { formatINR, formatDate, exportToCSV, exportToPDF } from "@/lib/utils";
import type { Payment, Trip, PaymentType, PaymentMode } from "@/types";
import { createPayment, deletePayment } from "@/services/payments.service";

interface PaymentsClientProps {
  initialPayments: Payment[];
  trips: Trip[];
}

export default function PaymentsClient({ initialPayments, trips }: PaymentsClientProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const emptyForm = {
    tripId: "",
    type: "customer_received" as PaymentType,
    paymentDate: todayStr,
    amount: "",
    paymentMode: "upi" as PaymentMode,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Dynamic Real KPIs strictly from actual payments & trips data
  const realTotalInflow = payments
    .filter((p) => p.type === "customer_received")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const realDriverPayouts = payments
    .filter((p) => p.type === "driver_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const realPendingDues = trips.reduce(
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

    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) {
      setFeedback({ message: "Please enter a valid payment amount", type: "error" });
      setLoading(false);
      return;
    }

    try {
      const newId = await createPayment({
        tripId: form.tripId || "general",
        type: form.type,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
      });

      const newPayment: Payment = {
        id: newId,
        tripId: form.tripId || "general",
        type: form.type,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPayments((prev) => [newPayment, ...prev]);
      setFeedback({
        message: form.type === "customer_received"
          ? "Customer receipt recorded successfully!"
          : "Driver payout voucher recorded successfully!",
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
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm(`Are you sure you want to delete this payment of ${formatINR(payment.amount)}?`)) {
      return;
    }

    setDeletingId(payment.id);
    try {
      await deletePayment(payment.id);
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
      setFeedback({ message: "Payment entry deleted successfully.", type: "success" });
    } catch {
      setFeedback({ message: "Failed to delete payment.", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      alert("No payments recorded yet to export.");
      return;
    }
    const data = payments.map((p) => ({
      "Payment ID": p.id,
      "Trip ID": p.tripId || "General",
      Type: p.type === "customer_received" ? "Customer Inflow" : "Driver Payout",
      Amount: p.amount,
      Date: p.paymentDate,
      Mode: p.paymentMode.toUpperCase(),
      Notes: p.notes || "-",
    }));
    exportToCSV(data, `Payments_Ledger_${todayStr}.csv`);
  };

  const handleExportPDF = () => {
    if (payments.length === 0) {
      alert("No payments recorded yet to export.");
      return;
    }
    const headers = ["Payment ID", "Trip ID", "Type", "Amount (INR)", "Date", "Mode", "Notes"];
    const data = payments.map((p) => [
      p.id,
      p.tripId || "General",
      p.type === "customer_received" ? "Customer Inflow" : "Driver Payout",
      formatINR(p.amount),
      formatDate(p.paymentDate),
      p.paymentMode.toUpperCase(),
      p.notes || "-",
    ]);
    const totalInflow = payments
      .filter((p) => p.type === "customer_received")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPayout = payments
      .filter((p) => p.type === "driver_payment")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    exportToPDF({
      title: "Payments & Treasury Ledger",
      subtitle: `Official Statement of Transactions • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `Payments_Ledger_${todayStr}.pdf`,
      headers,
      data,
      summary: [
        { label: "Total Transactions", value: String(payments.length) },
        { label: "Total Inflow", value: formatINR(totalInflow) },
        { label: "Driver Payouts", value: formatINR(totalPayout) },
        { label: "Net Cash Flow", value: formatINR(totalInflow - totalPayout) },
      ],
    });
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          (p.tripId && p.tripId.toLowerCase().includes(query)) ||
          p.paymentMode.toLowerCase().includes(query) ||
          (p.notes && p.notes.toLowerCase().includes(query)) ||
          String(p.amount).includes(query);
        if (!matches) return false;
      }

      if (typeFilter === "customer_received" && p.type !== "customer_received") return false;
      if (typeFilter === "driver_payment" && p.type !== "driver_payment") return false;
      if (typeFilter === "upi" && p.paymentMode !== "upi") return false;
      if (typeFilter === "cash" && p.paymentMode !== "cash") return false;

      return true;
    });
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
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/payments-scenic-hero.jpg')",
            backgroundPosition: "center right",
          }}
        >
          <Image
            src="/images/payments-scenic-hero.jpg"
            alt="Scenic Alpine Highway with Luxury Tour Bus"
            fill
            priority
            unoptimized
            className="object-cover object-[70%_50%]"
          />
          {/* Directional text gradient on left for crystal clear readability */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Row: Action Buttons on Desktop */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2.5 flex-wrap w-full">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Export Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-rose-700 backdrop-blur-md border border-rose-200/80 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Download Official PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <Link
            href="/travel/cashbook"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Book</span>
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
      <div className="-mt-10 sm:-mt-12 lg:-mt-14 relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 px-2 sm:px-4">
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
                  PENDING RECIEVABLES
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
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
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

              {/* Linked Trip Booking Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>Linked Trip Booking</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">🔍 General / Unlinked Payment</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.tripNumber || t.id}>
                        Trip #{t.tripNumber || t.id.slice(0, 6)} • {t.customerName || "Customer"} ({t.from || "Start"} → {t.to || "End"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Amount & Date (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Amount (₹)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      ref={amountInputRef}
                      type="number"
                      min={1}
                      placeholder="e.g. 5000"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
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
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.75]" />
                <span>{loading ? "Recording..." : "Record Payment Voucher"}</span>
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
                    <option value="customer_received">Customer Inflows</option>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                          <div className="font-bold text-slate-900">
                            {p.tripId ? `Trip #${p.tripId}` : "General Payment"}
                          </div>
                          {p.notes && (
                            <p className="text-[10px] text-slate-400 line-clamp-1">{p.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.type === "customer_received"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {p.type === "customer_received" ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                <span>Inflow</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                <span>Payout</span>
                              </>
                            )}
                          </span>
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
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.type === "customer_received"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {p.type === "customer_received" ? "Customer Inflow" : "Driver Payout"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                        {p.paymentMode}
                      </span>
                    </div>

                    <div>
                      <div className="text-xl font-black text-slate-900 font-mono-nums">
                        {formatINR(p.amount)}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {p.tripId ? `Linked: Trip #${p.tripId}` : "General / Unlinked Voucher"}
                      </p>
                      {p.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400">
                        {formatDate(p.paymentDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
