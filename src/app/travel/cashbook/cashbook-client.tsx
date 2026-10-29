"use client";

import { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Download,
  Search,
  Check,
  Plus,
  Calendar,
  Lock,
  ArrowLeftRight,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
import type { CashBookEntry, ExpenseCategory, PaymentMode, Trip } from "@/types";
import { createExpense } from "@/services/expenses.service";
import { createPayment } from "@/services/payments.service";

interface CashBookClientProps {
  initialEntries: CashBookEntry[];
  trips?: Trip[];
}

export default function CashBookClient({
  initialEntries,
  trips = [],
}: CashBookClientProps) {
  const [entries, setEntries] = useState<CashBookEntry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "inflow" | "outflow">("all");

  const todayStr = new Date().toISOString().split("T")[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgoStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Clean form state without hardcoded dummy business data
  const initialForm = {
    direction: "inflow" as "inflow" | "outflow",
    category: "Trip Fare Collection (Passenger Cash)",
    linkedTripId: trips[0]?.id || "",
    entryDate: todayStr,
    voucherNumber: `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: "",
    cashDesk: "Main Cash Desk (Pune Central)",
    remarks: "",
  };

  const [form, setForm] = useState(initialForm);

  const appendQuickTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      remarks: prev.remarks ? `${prev.remarks} [${tag}]` : `[${tag}]`,
    }));
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) {
      setFeedback({ message: "Please enter a valid cash amount in INR", type: "error" });
      setSaving(false);
      return;
    }

    try {
      if (form.direction === "outflow") {
        await createExpense({
          expenseDate: form.entryDate,
          category: "other" as ExpenseCategory,
          description: `${form.category} (${form.voucherNumber})`,
          amount: amountNum,
          paymentMode: "cash" as PaymentMode,
          tripId: form.linkedTripId || undefined,
          notes: `${form.remarks} • Handled by: ${form.cashDesk}`,
        });
      } else if (form.direction === "inflow" && form.linkedTripId) {
        await createPayment({
          tripId: form.linkedTripId,
          type: "customer_received",
          amount: amountNum,
          paymentMode: "cash",
          paymentDate: form.entryDate,
          notes: `Cash Voucher ${form.voucherNumber} • ${form.category} • ${form.remarks}`,
        });
      }

      const newEntry: CashBookEntry = {
        id: `vch-${Date.now()}`,
        date: form.entryDate,
        description: `${form.category}${form.remarks ? ` — ${form.remarks}` : ""}`,
        cashIn: form.direction === "inflow" ? amountNum : 0,
        cashOut: form.direction === "outflow" ? amountNum : 0,
        balance: 0,
        type: form.direction === "inflow" ? "receipt" : "expense",
        paymentMode: "cash",
        tripId: form.linkedTripId || undefined,
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setFeedback({
        message: `Cash voucher ${form.voucherNumber} recorded successfully!`,
        type: "success",
      });
      setForm({
        ...initialForm,
        voucherNumber: `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: "",
        remarks: "",
      });
    } catch (err: unknown) {
      console.error("Voucher save error:", err);
      setFeedback({
        message: (err as Error)?.message || "Failed to save cash voucher",
        type: "error",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleExport = () => {
    const csvData = entries.map((e) => ({
      Date: formatDate(e.date),
      "Trip ID": e.tripId || "-",
      Description: e.description,
      "Cash In (INR)": e.cashIn || 0,
      "Cash Out (INR)": e.cashOut || 0,
      Type: e.type,
      "Payment Mode": e.paymentMode,
    }));
    exportToCSV(csvData, `CashBook_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  // Dynamic KPIs derived directly from live entries
  const totalCashInSum = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.cashIn) || 0), 0),
    [entries]
  );
  const totalCashOutSum = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.cashOut) || 0), 0),
    [entries]
  );
  const currentBalance = totalCashInSum - totalCashOutSum;

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.tripId && e.tripId.toLowerCase().includes(q)) ||
        e.id.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "inflow" && (e.cashIn || 0) > 0) ||
        (typeFilter === "outflow" && (e.cashOut || 0) > 0);

      const matchesDate =
        (!dateFrom || e.date >= dateFrom) &&
        (!dateTo || e.date <= dateTo);

      return matchesSearch && matchesType && matchesDate;
    });
  }, [entries, search, typeFilter, dateFrom, dateTo]);

  // Working Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* ─── PAGE SUB-HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">
              ACCOUNTS &amp; TREASURY
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              REAL-TIME CASH REGISTER
            </span>
          </div>
          <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Cash Book
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Track verified cash receipts, driver trip advances, toll &amp; FASTag expenses, and daybook liquidity.
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("record-cash-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Cash Entry</span>
          </button>
        </div>
      </div>

      {/* ─── 4 DYNAMIC KPI CARDS ROW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Cash In */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL CASH IN
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalCashInSum)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Collections &amp; receipts</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {entries.filter((e) => (e.cashIn || 0) > 0).length} Inflows
            </span>
          </div>
        </div>

        {/* 2. Total Cash Out */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL CASH OUT
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {formatINR(totalCashOutSum)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Driver advances &amp; expenses</span>
            <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              {entries.filter((e) => (e.cashOut || 0) > 0).length} Outflows
            </span>
          </div>
        </div>

        {/* 3. Current Cash Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CURRENT CASH BALANCE
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span
              className={`text-3xl font-extrabold font-mono-nums tracking-tight ${
                currentBalance >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {formatINR(currentBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Net physical &amp; vault cash</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                currentBalance >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {currentBalance >= 0 ? "Positive Liquidity" : "Deficit / Negative"}
            </span>
          </div>
        </div>

        {/* 4. Total Transactions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL TRANSACTIONS
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {entries.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Total ledger transactions</span>
            <span className="bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              Live Records
            </span>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Record Cash Form ════ */}
        <div className="lg:col-span-5 space-y-4">
          <div
            id="record-cash-form"
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 font-bold text-base">
                  ₹
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    Record Cash Transaction
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Log cash receipt or operational outlay
                  </p>
                </div>
              </div>
              <span className="border border-blue-200 bg-blue-50/50 text-blue-700 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full">
                {form.voucherNumber}
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
                {feedback.type === "success" && <Check className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveVoucher} className="space-y-3.5">
              {/* Direction Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  TRANSACTION DIRECTION
                </label>
                <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: "inflow" })}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      form.direction === "inflow"
                        ? "bg-white text-emerald-800 border border-emerald-300 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Cash In (Receipt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: "outflow" })}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      form.direction === "outflow"
                        ? "bg-white text-rose-800 border border-rose-300 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Cash Out (Expense)</span>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="Trip Fare Collection (Passenger Cash)">
                      Trip Fare Collection (Passenger Cash)
                    </option>
                    <option value="Driver Fuel Advance & Batta">
                      Driver Fuel Advance &amp; Batta
                    </option>
                    <option value="FASTag Cash Top-up">FASTag Cash Top-up</option>
                    <option value="Toll & Parking Outlay">Toll &amp; Parking Outlay</option>
                    <option value="Vehicle Maintenance & Repair">
                      Vehicle Maintenance &amp; Repair
                    </option>
                    <option value="Office Petty Cash / Miscellaneous">
                      Office Petty Cash / Miscellaneous
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Linked Trip from real database */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Linked Trip (Optional)
                </label>
                <div className="relative">
                  <select
                    value={form.linkedTripId}
                    onChange={(e) => setForm({ ...form, linkedTripId: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="">-- General / Non-Trip Overhead --</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tripNumber || t.id.slice(0, 8)} • {t.from} ➔ {t.to} ({t.customerName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Entry Date & Voucher # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.entryDate}
                    onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Voucher #
                  </label>
                  <input
                    type="text"
                    required
                    value={form.voucherNumber}
                    onChange={(e) => setForm({ ...form, voucherNumber: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cash Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-slate-600">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Enter amount (e.g. 2500)"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full h-11 pl-8 pr-16 rounded-xl bg-slate-100/80 border border-slate-200 text-sm font-bold font-mono-nums text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <span className="absolute right-3 px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                    CASH
                  </span>
                </div>
              </div>

              {/* Cash Desk */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cash Desk / Handled By
                </label>
                <input
                  type="text"
                  value={form.cashDesk}
                  onChange={(e) => setForm({ ...form, cashDesk: e.target.value })}
                  placeholder="e.g. Main Cash Desk, Driver Name, or Office Lead"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks &amp; Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes, receipt slip reference, or party details..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Tags:</span>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Customer Payment")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Customer Payment
                </button>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Fuel Receipt Attached")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Fuel Receipt
                </button>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Toll Expense")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Toll Expense
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving Voucher..." : "Save Cash Voucher"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...initialForm,
                      voucherNumber: `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
                      amount: "",
                      remarks: "",
                    })
                  }
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: Cash Register & Day Book Ledger ════ */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          {/* Header & Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Cash Register &amp; Day Book
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Showing {filteredEntries.length} verified cash transaction{filteredEntries.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Segmented Pill Filter */}
            <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  typeFilter === "all"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("inflow");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  typeFilter === "inflow"
                    ? "bg-white text-emerald-800 shadow-xs border border-emerald-300"
                    : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                Inflows (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("outflow");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  typeFilter === "outflow"
                    ? "bg-white text-rose-800 shadow-xs border border-rose-300"
                    : "text-rose-700 hover:text-rose-900"
                }`}
              >
                Outflows (-)
              </button>
            </div>
          </div>

          {/* Sub-filter row: Search + Date Range */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search description, trip #, voucher..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 pl-9 pr-3 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 shrink-0">
              <span className="font-semibold text-slate-500 text-[10px]">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-mono outline-none text-slate-800 cursor-pointer"
              />
              <span className="font-semibold text-slate-500 text-[10px]">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-mono outline-none text-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Ledger List */}
          <div className="space-y-2.5">
            {paginatedEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold text-slate-700">No cash entries found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {entries.length === 0
                    ? "Record a cash voucher using the form on the left to start your daybook."
                    : "No transactions match your current search and date filters."}
                </p>
                {(search || typeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("all");
                      setDateFrom(thirtyDaysAgoStr);
                      setDateTo(todayStr);
                    }}
                    className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedEntries.map((entry) => {
                const isInflow = (entry.cashIn || 0) > 0;
                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isInflow
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
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
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {entry.description}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isInflow
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isInflow ? "RECEIPT" : "EXPENSE"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {entry.tripId ? `Trip #${entry.tripId} • ` : ""}
                          {formatDate(entry.date)} • Mode: {entry.paymentMode.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-extrabold font-mono-nums ${
                          isInflow ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isInflow ? `+${formatINR(entry.cashIn)}` : `-${formatINR(entry.cashOut)}`}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {entry.id.startsWith("vch-") ? entry.id.slice(0, 10) : "Verified"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Working Pagination Bar */}
          {filteredEntries.length > pageSize && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredEntries.length)} of{" "}
                {filteredEntries.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM 3 FINANCIAL SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Verified Cash Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              NET VAULT CASH BALANCE
            </p>
            <p
              className={`text-2xl font-extrabold font-mono-nums tracking-tight mt-1 ${
                currentBalance >= 0 ? "text-slate-900" : "text-rose-600"
              }`}
            >
              {formatINR(currentBalance)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated from all daybook vouchers</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Recorded Vouchers */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL RECORDED VOUCHERS
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              {entries.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Inflow and outflow transactions</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Reconciliation Status */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              LEDGER AUDIT STATUS
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-display tracking-tight mt-1">
              Live &amp; Synchronized
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time Cloud Firestore Ledger</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="pt-6 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>RK Travel Hub • Fleet Logistics &amp; Trip Dispatch Management System</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Active Cloud Sync</span>
          <span className="mx-1">•</span>
          <span>System Operational</span>
        </div>
      </footer>
    </div>
  );
}
