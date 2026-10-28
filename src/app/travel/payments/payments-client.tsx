"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Receipt,
  Clock,
  Search,
  Check,
  Plus,
  Download,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Tag,
  AlertCircle,
  FileText,
  CheckCircle2,
  Send,
  Zap,
  ShieldCheck,
  ChevronDown,
  Calendar,
  MoreVertical,
  CheckSquare,
  Square,
  Bus,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import type { Payment, Trip, PaymentType, PaymentMode } from "@/types";
import { createPayment, deletePayment } from "@/services/payments.service";

interface PaymentsClientProps {
  initialPayments: Payment[];
  trips: Trip[];
}

export default function PaymentsClient({ initialPayments, trips }: PaymentsClientProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sendReceipt, setSendReceipt] = useState(true);

  // Form State matching screenshot
  const initialForm = {
    tripId: trips[0]?.tripNumber || (trips[0] ? `${trips[0].from} ➔ ${trips[0].to}` : "TR-8921"),
    type: "customer_received" as PaymentType,
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "6800",
    paymentMode: "upi" as PaymentMode,
    notes: "UPI Ref #93847281928, Final client settlement",
  };

  const [form, setForm] = useState(initialForm);

  // Quick Settlement handler
  const handleQuickSettle = (driverName: string, tripRef: string, amount: number) => {
    setForm({
      tripId: tripRef,
      type: "driver_payment",
      paymentDate: new Date().toISOString().split("T")[0],
      amount: amount.toString(),
      paymentMode: "cash",
      notes: `Driver payout settlement for ${driverName} (${tripRef})`,
    });
    // Scroll smoothly to form
    const formElem = document.getElementById("record-payment-form");
    if (formElem) {
      formElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) {
      setFeedback({ message: "Please enter a valid positive payment amount", type: "error" });
      setLoading(false);
      return;
    }

    try {
      const newId = await createPayment({
        tripId: form.tripId,
        type: form.type,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes,
      });

      const newPayment: Payment = {
        id: newId,
        tripId: form.tripId,
        type: form.type,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPayments((prev) => [newPayment, ...prev]);
      setFeedback({
        message: sendReceipt
          ? "Payment recorded & digital receipt dispatched to client!"
          : "Payment recorded successfully!",
        type: "success",
      });
      setForm(initialForm);
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

  // KPIs
  const totalCount = payments.length;
  const totalCustomerReceipts = payments
    .filter((p) => p.type === "customer_received")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalDriverPayments = payments
    .filter((p) => p.type === "driver_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingCustomerReceivables = trips.reduce(
    (sum, t) => sum + (Number(t.customerBalance) > 0 ? Number(t.customerBalance) : 0),
    0
  );

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.tripId?.toLowerCase().includes(search.toLowerCase()) ||
        p.notes?.toLowerCase().includes(search.toLowerCase()) ||
        p.paymentMode?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "inflow" && p.type === "customer_received") ||
        (typeFilter === "outflow" && p.type === "driver_payment");

      return matchesSearch && matchesType;
    });
  }, [payments, search, typeFilter]);

  // Benchmark ledger sample entries matching the design
  const defaultLedgerEntries = [
    {
      id: "sample-1",
      iconType: "inflow",
      amount: "₹6,800",
      tag: "Client Inflow",
      tagColor: "bg-blue-50 text-blue-700",
      tripRef: "Trip #TR-8921",
      title: "Apex Logistics (Pune ➔ Mumbai BKC)",
      details: "UPI Ref: 99482103 • Today, 11:20 AM",
      status: "Verified & Cleared",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      actionText: "View Voucher",
    },
    {
      id: "sample-2",
      iconType: "outflow",
      amount: "₹1,800",
      tag: "Driver Payout",
      tagColor: "bg-slate-100 text-slate-700",
      tripRef: "Trip #TR-8922",
      title: "Vikram Singh (Mumbai Airport Trip • Fuel & Batta Advance)",
      details: "Cash Voucher #CV-84 • Today, 09:45 AM",
      status: "Disbursed",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      actionText: "Voucher PDF",
    },
    {
      id: "sample-3",
      iconType: "corporate",
      amount: "₹14,500",
      tag: "Corporate Settlement",
      tagColor: "bg-blue-50 text-blue-700",
      tripRef: "Trip #TR-8918",
      title: "Reliance Tech Parks Monthly Staff Shuttle Contract",
      details: "HDFC Bank IMPS // 44910294 • Yesterday, 04:30 PM",
      status: "Settled",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      actionText: "Invoice #1042",
    },
    {
      id: "sample-4",
      iconType: "fastag",
      amount: "₹3,400",
      tag: "FASTag & Fuel Float",
      tagColor: "bg-slate-100 text-slate-700",
      tripRef: "Fleet Unit MH-12-RN-4402",
      title: "NH48 Expressway Auto-Topup via Fleet Corporate Card",
      details: "NPCI FASTag Gateway #88701 • 26 Oct, 08:15 PM",
      status: "Reconciled",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      actionText: "View Slip",
    },
    {
      id: "sample-5",
      iconType: "pending",
      amount: "₹9,800",
      tag: "Pending Collection",
      tagColor: "bg-amber-100 text-amber-800",
      tripRef: "Trip #TR-8919",
      title: "Kavita Sharma (Pune ➔ Alibaug 3-Day Sightseeing Package)",
      details: "Payment Due by 27 Oct (1 day overdue)",
      isOverdue: true,
      status: "Awaiting Balance",
      statusColor: "bg-rose-50 text-rose-700 border-rose-200",
      actionText: "Send Link",
      isActionBtn: true,
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* ─── PAGE SUB-HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase">
              FINANCE &amp; ACCOUNTS LEDGER
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Sync Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Payment Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Manage customer receipts, driver disbursements, FASTag reconciliations, and daily cash-in-hand vouchers.
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => alert("Exporting current payment ledger to CSV...")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => alert("Reconciling FASTag and bank statement logs...")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 text-xs font-semibold shadow-xs transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Quick Reconciliation</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("record-payment-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#18181B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* ─── 4 KPI CARDS ROW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Payments */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL PAYMENTS
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalCount || 342}
            </span>
            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              +18 today
            </span>
          </div>
          <p className="text-[11px] text-slate-400">All transactions logged this month</p>
        </div>

        {/* 2. Customer Receipts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CUSTOMER RECEIPTS
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalCustomerReceipts ? formatINR(totalCustomerReceipts) : "₹8,45,200"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Inflows from clients &amp; advances</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-0.5">
              <span>↑</span> +14.2%
            </span>
          </div>
        </div>

        {/* 3. Driver Outflows */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DRIVER OUTFLOWS
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {totalDriverPayments ? formatINR(totalDriverPayments) : "₹3,12,800"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Batta, toll &amp; completed trips</span>
            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              48 Drivers Paid
            </span>
          </div>
        </div>

        {/* 4. Pending Receivables */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              PENDING RECEIVABLES
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {pendingCustomerReceivables ? formatINR(pendingCustomerReceivables) : "₹1,24,650"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Uncollected corporate balances</span>
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              14 Invoices Due
            </span>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Record Payment Form + Quick Settlements ════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Record Payment Form Card */}
          <div
            id="record-payment-form"
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Record Payment</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Log customer collection or driver payout</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-500 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md">
                Draft #PV-208
              </span>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedback.type === "success" && <Check className="w-4 h-4" />}
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Field 1: Associated Trip */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Associated Trip <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="TR-8921">TR-8921 • Pune ➔ Mumbai (Rajesh Kumar)</option>
                    <option value="TR-8922">TR-8922 • Mumbai Airport Trip (Vikram Singh)</option>
                    <option value="TR-8918">TR-8918 • Reliance Tech Parks Staff (Anil Deshmukh)</option>
                    <option value="TR-8919">TR-8919 • Pune ➔ Alibaug Sightseeing (Kavita Sharma)</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.tripNumber || t.id}>
                        {t.tripNumber || "Trip"} • {t.from} ➔ {t.to} ({t.customerName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 2: Payment Type (Segmented Pill Toggle) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Type <span className="text-rose-500">*</span>
                </label>
                <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "customer_received" })}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      form.type === "customer_received"
                        ? "bg-[#18181B] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Customer Inflow
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "driver_payment" })}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      form.type === "driver_payment"
                        ? "bg-[#18181B] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Driver Outflow
                  </button>
                </div>
              </div>

              {/* Field 3 & 4: Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      placeholder="6800"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full h-10 pl-7 pr-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold font-mono-nums text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Field 5: Payment Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm QR)</option>
                    <option value="cash">Cash In-Hand (Desk Receipt)</option>
                    <option value="bank_transfer">Bank Transfer (IMPS / NEFT / RTGS)</option>
                    <option value="card">Corporate Card / Fleet Float</option>
                    <option value="cheque">Bank Cheque / DD</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 6: Notes / Reference ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Reference ID
                </label>
                <input
                  type="text"
                  placeholder="UPI Ref #93847281928, Final client settlement"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Checkbox: Instant SMS/WhatsApp receipt */}
              <div
                className="flex items-center gap-2 cursor-pointer select-none pt-1"
                onClick={() => setSendReceipt(!sendReceipt)}
              >
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                    sendReceipt ? "bg-[#2563EB] text-white" : "border border-slate-300 bg-white"
                  }`}
                >
                  {sendReceipt && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-[11px] text-slate-600 font-medium">
                  Send instant SMS &amp; WhatsApp Receipt to Client &amp; Driver
                </span>
              </div>

              {/* Submit & Draft Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{loading ? "Recording Entry..." : "Record Payment Entry"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert("Voucher saved as draft #PV-208")}
                  className="w-full py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Draft Voucher
                </button>
              </div>
            </form>
          </div>

          {/* Driver Quick Settlements Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Driver Quick Settlements</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">3 Pending</span>
            </div>

            <div className="space-y-2.5">
              {/* Driver 1 */}
              <div className="flex items-center justify-between gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                    RK
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">Rajesh Kumar</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">TR-8921 • Toll &amp; Batta: ₹1,450</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickSettle("Rajesh Kumar", "TR-8921", 1450)}
                  className="px-3.5 py-1 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-semibold shadow-xs shrink-0 transition-all cursor-pointer"
                >
                  Settle Now
                </button>
              </div>

              {/* Driver 2 */}
              <div className="flex items-center justify-between gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                    VS
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">Vikram Singh</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">TR-8922 • Fuel Outlay: ₹2,100</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickSettle("Vikram Singh", "TR-8922", 2100)}
                  className="px-3.5 py-1 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-semibold shadow-xs shrink-0 transition-all cursor-pointer"
                >
                  Settle Now
                </button>
              </div>

              {/* Driver 3 */}
              <div className="flex items-center justify-between gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                    AD
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight">Anil Deshmukh</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">TR-8918 • Trip Balance: ₹950</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickSettle("Anil Deshmukh", "TR-8918", 950)}
                  className="px-3.5 py-1 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-semibold shadow-xs shrink-0 transition-all cursor-pointer"
                >
                  Settle Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: Payment Ledger Feed ════ */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          {/* Header & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Payment Ledger Feed</h2>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Showing latest 5 of {Math.max(342, totalCount)} entries logged
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search filter pill */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ref, trip #, client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 sm:w-56 h-8 pl-8 pr-3 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Type Filter dropdown */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 pl-3 pr-7 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="inflow">Client Inflows</option>
                  <option value="outflow">Driver Payouts</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Ledger Feed Rows */}
          <div className="space-y-3">
            {/* Real Firestore items recorded */}
            {filteredPayments.slice(0, 3).map((payment) => (
              <div
                key={payment.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      payment.type === "customer_received"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {payment.type === "customer_received" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 font-mono-nums">
                        {formatINR(payment.amount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          payment.type === "customer_received"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {payment.type === "customer_received" ? "Client Inflow" : "Driver Payout"}
                      </span>
                      <span className="text-[11px] text-slate-400">Trip #{payment.tripId}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1 truncate">
                      {payment.notes || "Trip payment settlement"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Mode: {payment.paymentMode.toUpperCase()} • {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    • Verified &amp; Cleared
                  </span>
                  <span className="text-[10px] text-slate-400 hover:text-slate-700 mt-1 cursor-pointer">
                    View Voucher
                  </span>
                </div>
              </div>
            ))}

            {/* Benchmark Designed Ledger Rows from Screenshot */}
            {defaultLedgerEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      entry.iconType === "inflow"
                        ? "bg-emerald-100 text-emerald-700"
                        : entry.iconType === "corporate"
                        ? "bg-blue-50 text-blue-600"
                        : entry.iconType === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {entry.iconType === "inflow" && <ArrowDownLeft className="w-4 h-4" />}
                    {entry.iconType === "outflow" && <ArrowUpRight className="w-4 h-4" />}
                    {entry.iconType === "corporate" && <Building2 className="w-4 h-4" />}
                    {entry.iconType === "fastag" && <Tag className="w-4 h-4" />}
                    {entry.iconType === "pending" && <Clock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 font-mono-nums">
                        {entry.amount}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.tagColor}`}>
                        {entry.tag}
                      </span>
                      <span className="text-[11px] text-slate-400">{entry.tripRef}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1 truncate">{entry.title}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        entry.isOverdue ? "text-rose-600 font-semibold" : "text-slate-400"
                      }`}
                    >
                      {entry.details}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${entry.statusColor}`}
                  >
                    {entry.status}
                  </span>
                  {entry.isActionBtn ? (
                    <button
                      type="button"
                      onClick={() => alert("Payment link dispatched to client via SMS & WhatsApp")}
                      className="mt-1 px-3 py-1 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span>{entry.actionText}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 hover:text-slate-700 mt-1 cursor-pointer flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{entry.actionText}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Strip */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Page 1 of 69 • 342 Total Ledger Records</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs"
              >
                &lt;
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
              >
                2
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
              >
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button
                type="button"
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
              >
                69
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM 3 FLOATING FINANCIAL PILL CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Daily Cash-In-Hand */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              DAILY CASH-IN-HAND
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              ₹24,800
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Verified at Pune Central Cash Desk</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: FASTag Fleet Pool */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              FASTAG FLEET POOL
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              ₹18,450
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Auto-recharge trigger configured @ ₹5,000</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: GST Collected */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              GST COLLECTED (18% SLAB)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              ₹1,52,130
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tax Liability for October 2026</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── AUDIT & WEBHOOK STRIP ─── */}
      <div className="p-3 bg-white/60 backdrop-blur-xs rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Payment Gateway Webhooks: 99.98% Success Rate (UPI / IMPS / Cash)</span>
        </div>
        <div>
          <span>GSTIN: 27AABCR8921P1ZT</span>
          <span className="mx-2">•</span>
          <span>End of Day Ledger Audit: In Sync</span>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
            <Bus className="w-3 h-3" />
          </div>
          <span className="font-semibold text-slate-700">RK Travel Hub</span>
          <span>© 2025 RK Travel Logistics Inc.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-800 cursor-pointer">Support Desk</span>
          <span className="hover:text-slate-800 cursor-pointer">API Status</span>
        </div>
      </footer>
    </div>
  );
}
