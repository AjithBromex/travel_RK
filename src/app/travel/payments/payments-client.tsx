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
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  Building2,
  Tag,
  ArrowRight,
  Bus,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const emptyForm = {
    tripId: trips[0]?.tripNumber || trips[0]?.id || "",
    type: "customer_received" as PaymentType,
    paymentDate: todayStr,
    amount: "",
    paymentMode: "upi" as PaymentMode,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Dynamic Real KPIs
  const totalCollections = payments
    .filter((p) => p.type === "customer_received")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalDriverPayouts = payments
    .filter((p) => p.type === "driver_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingCustomerDues = trips.reduce(
    (sum, t) => sum + (Number(t.customerBalance) > 0 ? Number(t.customerBalance) : 0),
    0
  );

  const selectedTrip = useMemo(() => {
    return trips.find((t) => (t.tripNumber && t.tripNumber === form.tripId) || t.id === form.tripId);
  }, [trips, form.tripId]);

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
        tripId: form.tripId,
        type: form.type,
        amount: amountNum,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        notes: form.notes.trim(),
      });

      const newPayment: Payment = {
        id: newId,
        tripId: form.tripId,
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
      setFeedback({ message: "Payment entry deleted.", type: "success" });
    } catch {
      setFeedback({ message: "Failed to delete payment.", type: "error" });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matches =
          p.tripId.toLowerCase().includes(query) ||
          p.paymentMode.toLowerCase().includes(query) ||
          (p.notes && p.notes.toLowerCase().includes(query));
        if (!matches) return false;
      }

      if (typeFilter !== "all" && p.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [payments, search, typeFilter]);

  // Pagination
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPayments.slice(startIndex, startIndex + pageSize);
  }, [filteredPayments, currentPage]);

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert("No payments to export.");
      return;
    }
    const data = filteredPayments.map((p) => ({
      "Payment ID": p.id,
      "Trip ID": p.tripId,
      Type: p.type === "customer_received" ? "Customer Inflow" : "Driver Outflow",
      Amount: p.amount,
      Date: p.paymentDate,
      Mode: p.paymentMode.toUpperCase(),
      Notes: p.notes || "-",
    }));
    exportToCSV(data, `Payments_Ledger_${todayStr}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. Header & Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
              TREASURY &amp; LEDGER
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {payments.length} Recorded Entries
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Payment Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Record customer collections, driver settlements, advance vouchers, and manage outstanding balances.
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
          <Link
            href="/travel/cashbook"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Book</span>
          </Link>
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
        {/* TOTAL COLLECTION */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Inflow
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalCollections)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Customer receipts</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Received
            </span>
          </div>
        </div>

        {/* DRIVER PAYOUTS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Driver Payouts
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalDriverPayouts)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Disbursed to drivers</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Disbursed
            </span>
          </div>
        </div>

        {/* PENDING DUES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Receivables
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                pendingCustomerDues > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(pendingCustomerDues)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Uncollected fares</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pendingCustomerDues > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {pendingCustomerDues > 0 ? "Action needed" : "All cleared"}
            </span>
          </div>
        </div>

        {/* NET CASH BALANCE */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Net Treasury Margin
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalCollections - totalDriverPayouts)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Collections - Disbursals</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Net Balance
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Main 2-Column Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Record Payment Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Record Payment Voucher</h2>
                  <p className="text-[11px] text-slate-400">
                    Log customer receipt, advance, or driver payout
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Payment Direction / Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "customer_received" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      form.type === "customer_received"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customer Inflow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "driver_payment" })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      form.type === "driver_payment"
                        ? "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>Driver Payout</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Linked Trip Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Linked Trip Booking
                </label>
                <div className="relative">
                  <select
                    value={form.tripId}
                    onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                    className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer truncate"
                  >
                    <option value="">General / Unlinked Payment</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.tripNumber || t.id}>
                        #{t.tripNumber || t.id.slice(0, 6)} • {t.customerName} ({t.from} ➔ {t.to})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {selectedTrip && (
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Fare: {formatINR(selectedTrip.totalFare)}</span>
                    <span className="font-semibold text-amber-700">
                      Balance Due: {formatINR(selectedTrip.customerBalance)}
                    </span>
                  </p>
                )}
              </div>

              {/* Row 3: Amount & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 font-bold mr-1 text-xs">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 5000"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Mode of Payment */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["upi", "cash", "bank_transfer", "card"] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMode: mode })}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        form.paymentMode === mode
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mode === "bank_transfer" ? "Bank" : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Notes & References */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Voucher Notes / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref #98721345, Advance payment received"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loading ? "Recording..." : "Record Payment Voucher"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Payments Ledger Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Payment Ledger</h2>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  ({filteredPayments.length} entries)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search trip, mode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-36 sm:w-44 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Transactions</option>
                    <option value="customer_received">Customer Inflows</option>
                    <option value="driver_payment">Driver Payouts</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List of Payments */}
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {search ? "No matching payment vouchers found" : "No payment records yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  {search
                    ? "Try adjusting your search query or filter."
                    : "Record your first customer receipt or driver payout using the form on the left."}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPayments.map((payment) => {
                  const isInflow = payment.type === "customer_received";

                  return (
                    <div
                      key={payment.id}
                      className="bg-slate-50/70 hover:bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isInflow
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                              : "bg-blue-50 text-blue-600 border border-blue-200/60"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isInflow
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {isInflow ? "Customer Receipt" : "Driver Payout"}
                            </span>
                            {payment.tripId && (
                              <span className="text-[11px] font-semibold text-slate-700 font-mono">
                                #{payment.tripId}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {formatDate(payment.paymentDate)}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                            {payment.notes || (isInflow ? "Trip Fare Settlement" : "Driver Dispatch Settlement")}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[10px] uppercase">
                              {payment.paymentMode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Delete */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span
                            className={`text-base font-extrabold font-mono-nums block ${
                              isInflow ? "text-emerald-700" : "text-blue-700"
                            }`}
                          >
                            {isInflow ? "+" : "-"}{formatINR(payment.amount)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            Verified
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={deletingId === payment.id}
                          onClick={() => handleDelete(payment)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                  {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} records
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
        <p>© RK Travel Hub • Financial Settlement &amp; Treasury Ledger</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Accounting ledger in sync</span>
        </div>
      </footer>
    </div>
  );
}
