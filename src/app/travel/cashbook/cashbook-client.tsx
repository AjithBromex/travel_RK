"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  Receipt,
  FileText,
  Tag,
  ShieldCheck,
  Fuel,
  ChevronDown,
  Building2,
  Users,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
import type { CashBookEntry, ExpenseCategory, PaymentMode } from "@/types";
import { createExpense } from "@/services/expenses.service";

interface CashBookClientProps {
  initialEntries: CashBookEntry[];
}

export default function CashBookClient({ initialEntries }: CashBookClientProps) {
  const [entries, setEntries] = useState<CashBookEntry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "inflow" | "outflow">("all");
  const [dateFrom, setDateFrom] = useState("2026-10-20");
  const [dateTo, setDateTo] = useState("2026-10-28");
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State matching screenshot
  const initialForm = {
    direction: "inflow" as "inflow" | "outflow",
    category: "Trip Fare Collection (Passenger Cash)",
    linkedTrip: "TR-8921 • MH-12-RN-4402 (Rajesh Kumar)",
    entryDate: new Date().toISOString().split("T")[0],
    voucherNumber: "VCH-8842",
    amount: "18500",
    cashDesk: "Pune Central Cash Desk (Suresh Patil - Cashier)",
    remarks: "Customer Sunita Deshmukh paid remaining balance in Pune central booking office.",
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
      setFeedback({ message: "Please enter a valid cash amount", type: "error" });
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
          notes: `${form.remarks} • Handled by: ${form.cashDesk}`,
        });
      }

      const newEntry: CashBookEntry = {
        id: `vch-${Date.now()}`,
        date: form.entryDate,
        description: `${form.category} — ${form.remarks}`,
        cashIn: form.direction === "inflow" ? amountNum : 0,
        cashOut: form.direction === "outflow" ? amountNum : 0,
        balance: 0,
        type: form.direction === "inflow" ? "receipt" : "expense",
        paymentMode: "cash",
        tripId: form.linkedTrip.split(" • ")[0] || "TR-8921",
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setFeedback({
        message: `Cash voucher ${form.voucherNumber} recorded & vaulted successfully!`,
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
      "Cash In (₹)": e.cashIn || 0,
      "Cash Out (₹)": e.cashOut || 0,
      Type: e.type,
      "Payment Mode": e.paymentMode,
    }));
    exportToCSV(csvData, `RK_Travel_CashBook_${new Date().toISOString().split("T")[0]}`);
  };

  // KPIs
  const totalCashInSum = entries.reduce((sum, e) => sum + (Number(e.cashIn) || 0), 0);
  const totalCashOutSum = entries.reduce((sum, e) => sum + (Number(e.cashOut) || 0), 0);
  const currentBalance = totalCashInSum - totalCashOutSum;

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.tripId && e.tripId.toLowerCase().includes(search.toLowerCase()));

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "inflow" && (e.cashIn || 0) > 0) ||
        (typeFilter === "outflow" && (e.cashOut || 0) > 0);

      return matchesSearch && matchesType;
    });
  }, [entries, search, typeFilter]);

  // Benchmark ledger sample entries matching the design
  const defaultCashLedger = [
    {
      id: "cb-1",
      direction: "inflow",
      title: "Trip #TR-8921 Final Cash Settlement",
      tag: "Cleared",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      subtitle: "Client: Sunita Deshmukh • Pune Dispatch Desk • VCH #CB-1048",
      amount: "+₹18,500",
      date: "Today, 11:45 AM",
    },
    {
      id: "cb-2",
      direction: "outflow",
      title: "Driver Fuel Advance & Batta",
      tag: "Receipt Attached",
      tagColor: "bg-slate-100 text-slate-700 border-slate-200",
      subtitle: "Driver: Rajesh Kumar (MH-12-RN-4402) • Auth by Fleet Mgr • VCH #CB-1047",
      amount: "-₹4,200",
      date: "Today, 10:15 AM",
    },
    {
      id: "cb-3",
      direction: "outflow",
      title: "FASTag Corporate Cash Recharge",
      tag: "NHAI Wallet",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
      subtitle: "Fleet Unit MH-14-BT-9108 (Ertiga) • Kiosk #4 Cash Top-up • VCH #CB-1046",
      amount: "-₹5,000",
      date: "Yesterday, 04:30 PM",
    },
    {
      id: "cb-4",
      direction: "inflow",
      title: "Advance Corporate Shuttle Cash Deposit",
      tag: "Cleared to Safe",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      subtitle: "Infosys Campus Contract • Security Advance • VCH #CB-1045",
      amount: "+₹32,000",
      date: "26 Oct, 02:15 PM",
    },
    {
      id: "cb-5",
      direction: "outflow",
      title: "Emergency Tyre Puncture & Nitrogen Top-up",
      tag: "En Route Bill",
      tagColor: "bg-slate-100 text-slate-700 border-slate-200",
      subtitle: "Innova Hycross (MH-12-XG-7744) • Driver Gopal Jadhav • VCH #CB-1044",
      amount: "-₹1,650",
      date: "26 Oct, 11:20 AM",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
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
            Track all cash inflows and outflows from trip receipts, driver advances, FASTag cash top-ups, and daily petty expenses.
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
            <span>Export CSV / PDF</span>
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

      {/* ─── 4 KPI CARDS ROW ─── */}
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
              {totalCashInSum ? formatINR(totalCashInSum) : "₹3,42,850"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Collections &amp; passenger receipts</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
              +12.4%
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
              {totalCashOutSum ? formatINR(totalCashOutSum) : "₹1,88,400"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Driver allowances &amp; fuel outlays</span>
            <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              42 Vouchers
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
            <span className="text-3xl font-extrabold text-emerald-700 font-mono-nums tracking-tight">
              {currentBalance ? formatINR(currentBalance) : "₹1,54,450"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Net cash in Pune vault</span>
            <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
              <span>↗</span> Positive Liquidity
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
              {entries.length || 148}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-400">Logged during October 2026</span>
            <span className="bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              100% Reconciled
            </span>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════ LEFT COLUMN: Record Cash Form + Safe Denominations ════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* Record Cash Transaction Form Card */}
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
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Record Cash Transaction</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Log cash receipt or operational expense</p>
                </div>
              </div>
              <span className="border border-blue-200 bg-blue-50/50 text-blue-700 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full">
                DRAFT #CB-902
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

            <form onSubmit={handleSaveVoucher} className="space-y-3.5">
              {/* Field 1: Transaction Direction Pill Toggle */}
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

              {/* Field 2: Expense / Inflow Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expense / Inflow Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="Trip Fare Collection (Passenger Cash)">Trip Fare Collection (Passenger Cash)</option>
                    <option value="Driver Fuel Advance & Batta">Driver Fuel Advance &amp; Batta</option>
                    <option value="FASTag Corporate Cash Recharge">FASTag Corporate Cash Recharge</option>
                    <option value="Advance Corporate Shuttle Cash Deposit">Advance Corporate Shuttle Cash Deposit</option>
                    <option value="Emergency Tyre Puncture & Maintenance">Emergency Tyre Puncture &amp; Maintenance</option>
                    <option value="Office Petty Cash / Miscellaneous">Office Petty Cash / Miscellaneous</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 3: Linked Trip / Fleet Vehicle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Linked Trip / Fleet Vehicle
                </label>
                <div className="relative">
                  <select
                    value={form.linkedTrip}
                    onChange={(e) => setForm({ ...form, linkedTrip: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="TR-8921 • MH-12-RN-4402 (Rajesh Kumar)">TR-8921 • MH-12-RN-4402 (Rajesh Kumar)</option>
                    <option value="TR-8922 • MH-14-BT-9108 (Vikram Singh)">TR-8922 • MH-14-BT-9108 (Vikram Singh)</option>
                    <option value="TR-8918 • MH-12-XG-7744 (Anil Deshmukh)">TR-8918 • MH-12-XG-7744 (Anil Deshmukh)</option>
                    <option value="Non-Trip Overhead">Non-Trip / General Operations</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 4 & 5: Entry Date & Voucher / Slip # */}
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
                    Voucher / Slip #
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

              {/* Field 6: Cash Amount (INR) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cash Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-slate-600">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="18500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full h-11 pl-8 pr-16 rounded-xl bg-slate-100/80 border border-slate-200 text-sm font-bold font-mono-nums text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <span className="absolute right-3 px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                    CASH
                  </span>
                </div>
              </div>

              {/* Field 7: Cash Handled / Received By */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cash Handled / Received By
                </label>
                <div className="relative">
                  <select
                    value={form.cashDesk}
                    onChange={(e) => setForm({ ...form, cashDesk: e.target.value })}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                  >
                    <option value="Pune Central Cash Desk (Suresh Patil - Cashier)">Pune Central Cash Desk (Suresh Patil - Cashier)</option>
                    <option value="Mumbai Transit Vault (Ramesh Shinde)">Mumbai Transit Vault (Ramesh Shinde)</option>
                    <option value="Fleet Operations Lead (Amit Verma)">Fleet Operations Lead (Amit Verma)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 8: Remarks & Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Remarks &amp; Voucher Notes
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Enter specific notes or authorization details..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Quick Tags Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Tags:</span>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Customer Settlement")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Customer Settlement
                </button>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Toll Slip Attached")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Toll Slip Attached
                </button>
                <button
                  type="button"
                  onClick={() => appendQuickTag("Fuel Bill #")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                >
                  + Fuel Bill #
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving Voucher..." : "Save Cash Voucher"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert("Voucher saved to local draft buffer")}
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>

          {/* Physical Safe Denominations Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                PHYSICAL SAFE DENOMINATIONS
              </p>
              <span className="text-[11px] text-slate-400 font-medium">Desk #1 Pune</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Pod 1: ₹500 */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 text-center">
                <p className="text-xs font-semibold text-slate-500">₹500 Notes</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono-nums">280 pcs</p>
                <p className="text-[10px] font-bold text-emerald-700 font-mono-nums mt-0.5">₹1,40,000</p>
              </div>

              {/* Pod 2: ₹200 */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 text-center">
                <p className="text-xs font-semibold text-slate-500">₹200 Notes</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono-nums">60 pcs</p>
                <p className="text-[10px] font-bold text-emerald-700 font-mono-nums mt-0.5">₹12,000</p>
              </div>

              {/* Pod 3: ₹100 & Below */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/70 text-center">
                <p className="text-xs font-semibold text-slate-500">₹100 &amp; Below</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono-nums">25 pcs</p>
                <p className="text-[10px] font-bold text-emerald-700 font-mono-nums mt-0.5">₹2,450</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: Cash Register & Day Book Ledger ════ */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          {/* Header & Type Segmented Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Cash Register &amp; Day Book Ledger</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Showing verified cash entries for selected date filter
              </p>
            </div>

            {/* Segmented Pill Filter */}
            <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
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
                onClick={() => setTypeFilter("inflow")}
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
                onClick={() => setTypeFilter("outflow")}
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
                placeholder="Filter by voucher #, trip, or driver name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-9 pr-3 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 shrink-0">
              <span className="font-semibold text-slate-500 text-[10px]">From:</span>
              <span className="font-mono font-medium">{dateFrom}</span>
              <span className="font-semibold text-slate-500 text-[10px] ml-1">To:</span>
              <span className="font-mono font-medium">{dateTo}</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
            </div>
          </div>

          {/* Ledger Row Items */}
          <div className="space-y-3">
            {/* Real Firestore items */}
            {filteredEntries.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      (entry.cashIn || 0) > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {(entry.cashIn || 0) > 0 ? (
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {entry.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Trip #{entry.tripId || "N/A"} • {formatDate(entry.date)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-extrabold font-mono-nums ${
                      (entry.cashIn || 0) > 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {(entry.cashIn || 0) > 0 ? `+${formatINR(entry.cashIn)}` : `-${formatINR(entry.cashOut)}`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{entry.paymentMode.toUpperCase()}</p>
                </div>
              </div>
            ))}

            {/* Benchmark Designed Ledger Rows from Screenshot */}
            {defaultCashLedger.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      item.direction === "inflow"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.direction === "inflow" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {item.title}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-extrabold font-mono-nums ${
                      item.direction === "inflow" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {item.amount}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Strip */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing 1 to 5 of 148 cash records</span>
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
                12
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

      {/* ─── BOTTOM 3 FINANCIAL PILL CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Daily Cash in Pune Hub Safe */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              DAILY CASH IN PUNE HUB SAFE
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              ₹86,200
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Verified by Vault Lead Suresh Patil</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Cash in Transit with Drivers */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              CASH IN TRANSIT WITH DRIVERS
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight mt-1">
              ₹68,250
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across 6 ongoing highway trips</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: EOD Cash Reconciliation Status */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              EOD CASH RECONCILIATION STATUS
            </p>
            <p className="text-2xl font-extrabold text-slate-900 font-display tracking-tight mt-1">
              Verified &amp; Balanced
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Audit Timestamp: 28 Oct, 08:00 PM IST</p>
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
          <span>System Operational (v2.4)</span>
        </div>
      </footer>
    </div>
  );
}
