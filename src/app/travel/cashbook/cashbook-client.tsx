"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Wallet,
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  Plus,
  Bus,
  ChevronDown,
  CheckCircle2,
  X,
  MoreVertical,
  Smartphone,
  Banknote,
  Building2,
  CreditCard,
  Fuel,
  Wrench,
  Utensils,
  Tag,
  User,
  Clock,
  Coins,
  Trash2,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV, exportToPDF } from "@/lib/utils";
import type { CashBookEntry, PaymentMode, Trip, ExpenseCategory } from "@/types";
import { createPayment } from "@/services/payments.service";
import { createExpense } from "@/services/expenses.service";

interface CashBookClientProps {
  initialEntries: CashBookEntry[];
  trips?: Trip[];
}

interface DisplayCashBookItem {
  id: string;
  date: string;
  direction: "inflow" | "outflow";
  typeTitle: string;
  typeSubtitle: string;
  tripNumber?: string;
  tripRoute?: string;
  amount: number;
  paymentMode: PaymentMode;
  balance: number;
  notes?: string;
}

const MODE_META: Record<PaymentMode, { label: string; badgeClass: string }> = {
  upi: { label: "UPI", badgeClass: "bg-purple-50 text-purple-700" },
  cash: { label: "Cash", badgeClass: "bg-emerald-50 text-emerald-700" },
  bank_transfer: { label: "Bank", badgeClass: "bg-blue-50 text-blue-700" },
  card: { label: "Card", badgeClass: "bg-amber-50 text-amber-700" },
  other: { label: "Other", badgeClass: "bg-slate-100 text-slate-700" },
};

export default function CashBookClient({
  initialEntries,
  trips = [],
}: CashBookClientProps) {
  // Map raw initialEntries to DisplayCashBookItems if available, otherwise start with empty array
  const [items, setItems] = useState<DisplayCashBookItem[]>(() => {
    if (initialEntries && initialEntries.length > 0) {
      return initialEntries.map((e) => {
        const trip = trips.find((t) => t.id === e.tripId || t.tripNumber === e.tripId);
        const isInflow = (e.cashIn || 0) > 0;
        return {
          id: e.id,
          date: e.date,
          direction: isInflow ? "inflow" : "outflow",
          typeTitle: isInflow ? "Customer Payment" : e.type === "driver_payment" ? "Driver Settlement" : "Expense",
          typeSubtitle: e.description || "General Cash Entry",
          tripNumber: trip?.tripNumber || e.tripId || "",
          tripRoute: trip ? `${trip.from || "Origin"} → ${trip.to || "Destination"}` : "",
          amount: isInflow ? e.cashIn : e.cashOut,
          paymentMode: e.paymentMode || "cash",
          balance: e.balance || 0,
          notes: e.description || "",
        };
      });
    }
    return [];
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Form State
  const [formDirection, setFormDirection] = useState<"inflow" | "outflow">("inflow");
  const [form, setForm] = useState({
    date: todayStr,
    type: "customer_payment",
    tripId: "",
    amount: "",
    paymentMode: "cash" as PaymentMode,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("this_month");
  const [directionFilter, setDirectionFilter] = useState<"all" | "inflow" | "outflow">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Real KPIs strictly from actual items
  const totalCashIn = useMemo(() => {
    return items
      .filter((i) => i.direction === "inflow")
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [items]);

  const totalCashOut = useMemo(() => {
    return items
      .filter((i) => i.direction === "outflow")
      .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [items]);

  const netCashFlow = totalCashIn - totalCashOut;
  const displayNetCashFlow = netCashFlow;
  const displayTotalTransactions = items.length;

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesDate = item.date.toLowerCase().includes(q);
        const matchesTitle = item.typeTitle.toLowerCase().includes(q);
        const matchesSub = item.typeSubtitle.toLowerCase().includes(q);
        const matchesTrip = (item.tripNumber || "").toLowerCase().includes(q);
        const matchesRoute = (item.tripRoute || "").toLowerCase().includes(q);
        const matchesMode = item.paymentMode.toLowerCase().includes(q);
        const matchesAmount = String(item.amount).includes(q);
        if (!matchesDate && !matchesTitle && !matchesSub && !matchesTrip && !matchesRoute && !matchesMode && !matchesAmount) {
          return false;
        }
      }

      if (directionFilter !== "all" && item.direction !== directionFilter) {
        return false;
      }

      return true;
    });
  }, [items, search, directionFilter]);

  // Pagination (8 entries per page matching mockup)
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(form.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({ message: "Please enter a valid amount.", type: "error" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const selectedTrip = trips.find((t) => t.id === form.tripId || t.tripNumber === form.tripId);
      const tripNumberStr = selectedTrip?.tripNumber || form.tripId || "";
      const tripRouteStr = selectedTrip ? `${selectedTrip.from || "Origin"} → ${selectedTrip.to || "Destination"}` : "";

      let typeTitle = "Customer Payment";
      let typeSubtitle = form.notes.trim() || "General Inflow";

      if (formDirection === "inflow") {
        if (form.type === "trip_advance") {
          typeTitle = "Advance Payment";
        } else {
          typeTitle = "Customer Payment";
        }
        await createPayment({
          tripId: form.tripId || "general",
          type: "customer_received",
          amount: parsedAmount,
          paymentDate: form.date,
          paymentMode: form.paymentMode,
          notes: form.notes.trim(),
        });
      } else {
        if (form.type === "driver_payment") {
          typeTitle = "Driver Settlement";
          typeSubtitle = form.notes.trim() || "Driver Payout";
          await createPayment({
            tripId: form.tripId || "general",
            type: "driver_payment",
            amount: parsedAmount,
            paymentDate: form.date,
            paymentMode: form.paymentMode,
            notes: form.notes.trim(),
          });
        } else {
          const catMap: Record<string, ExpenseCategory> = {
            fuel: "fuel",
            tolls: "tolls",
            maintenance: "maintenance",
            food: "food",
            office: "office_expense",
          };
          const cat = catMap[form.type] || "other";
          if (cat === "fuel") {
            typeTitle = "Fuel Expense";
            typeSubtitle = form.notes.trim() || "Diesel - Station fill";
          } else if (cat === "tolls") {
            typeTitle = "Toll Charges";
            typeSubtitle = form.notes.trim() || "Expressway toll";
          } else if (cat === "food") {
            typeTitle = "Food & Refreshments";
            typeSubtitle = form.notes.trim() || "Driver allowance";
          } else if (cat === "maintenance") {
            typeTitle = "Maintenance";
            typeSubtitle = form.notes.trim() || "Vehicle repair";
          } else {
            typeTitle = "Operating Expense";
            typeSubtitle = form.notes.trim() || "Office outlays";
          }

          await createExpense({
            tripId: form.tripId || "",
            tripNumber: tripNumberStr,
            expenseDate: form.date,
            category: cat,
            amount: parsedAmount,
            paymentMode: form.paymentMode,
            description: form.notes.trim() || typeTitle,
            notes: form.notes.trim(),
          });
        }
      }

      // Calculate new running balance
      const currentHeadBalance = items[0]?.balance || 0;
      const newBalance =
        formDirection === "inflow"
          ? currentHeadBalance + parsedAmount
          : currentHeadBalance - parsedAmount;

      const newItem: DisplayCashBookItem = {
        id: `cb-${Date.now()}`,
        date: form.date,
        direction: formDirection,
        typeTitle,
        typeSubtitle,
        tripNumber: tripNumberStr,
        tripRoute: tripRouteStr,
        amount: parsedAmount,
        paymentMode: form.paymentMode,
        balance: newBalance,
        notes: form.notes.trim(),
      };

      setItems((prev) => [newItem, ...prev]);
      setFeedback({
        message: `${formDirection === "inflow" ? "Cash In (Receipt)" : "Cash Out (Expense)"} recorded successfully!`,
        type: "success",
      });

      setForm({
        date: todayStr,
        type: formDirection === "inflow" ? "customer_payment" : "fuel",
        tripId: "",
        amount: "",
        paymentMode: "cash",
        notes: "",
      });
    } catch (err: unknown) {
      console.error("Cashbook record error:", err);
      setFeedback({
        message: (err as Error)?.message || "Failed to record cash transaction.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteItem = (id: string) => {
    setActiveMenuId(null);
    if (!window.confirm("Are you sure you want to remove this cash book entry?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    setFeedback({ message: "Entry removed from cash book.", type: "success" });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      alert("No cash book entries to export.");
      return;
    }
    const data = filteredItems.map((i) => ({
      Date: i.date,
      Type: i.direction === "inflow" ? "Inflow" : "Outflow",
      Description: `${i.typeTitle} (${i.typeSubtitle})`,
      "Trip ID": i.tripNumber || "-",
      Route: i.tripRoute || "-",
      Amount: i.amount,
      Mode: i.paymentMode.toUpperCase(),
      "Running Balance": i.balance,
      Notes: i.notes || "-",
    }));
    exportToCSV(data, `RK_CashBook_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0) {
      alert("No cash book entries to export.");
      return;
    }
    const headers = [
      "Date",
      "Type",
      "Description",
      "Trip ID",
      "Amount",
      "Mode",
      "Balance",
    ];
    const data = filteredItems.map((i) => [
      formatDate(i.date),
      i.direction === "inflow" ? "INFLOW" : "OUTFLOW",
      `${i.typeTitle} (${i.typeSubtitle})`,
      i.tripNumber || "-",
      `${i.direction === "inflow" ? "+" : "-"}${formatINR(i.amount)}`,
      i.paymentMode.toUpperCase(),
      formatINR(i.balance),
    ]);

    const totalInflow = filteredItems
      .filter((i) => i.direction === "inflow")
      .reduce((sum, i) => sum + i.amount, 0);
    const totalOutflow = filteredItems
      .filter((i) => i.direction === "outflow")
      .reduce((sum, i) => sum + i.amount, 0);

    exportToPDF({
      title: "Cash Book & Daily Treasury Ledger",
      subtitle: `Real-time Cash Flow & Balance Reconciliation • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `RK_CashBook_${new Date().toISOString().slice(0, 10)}.pdf`,
      headers,
      data,
      summary: [
        { label: "Total Entries", value: String(filteredItems.length) },
        { label: "Total Inflows", value: formatINR(totalInflow) },
        { label: "Total Outflows", value: formatINR(totalOutflow) },
        { label: "Net Cash Flow", value: formatINR(totalInflow - totalOutflow) },
      ],
    });
  };

  // Description icon selector
  const renderItemIcon = (typeTitle: string) => {
    const title = typeTitle.toLowerCase();
    if (title.includes("fuel") || title.includes("diesel")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Fuel className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (title.includes("toll")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Tag className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (title.includes("driver") || title.includes("bata")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (title.includes("food") || title.includes("refreshment")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Utensils className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (title.includes("maintenance") || title.includes("repair")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <Wrench className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (title.includes("advance")) {
      return (
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Wallet className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <User className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER (Tour Coach Golden Hour Highway)
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[300px] sm:min-h-[330px] lg:min-h-[360px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Tour Coach Highway Image */}
        <div
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/cashbook-scenic-hero.jpg')",
            backgroundPosition: "center right",
          }}
        >
          <Image
            src="/images/cashbook-scenic-hero.jpg"
            alt="Scenic Sunlit Highway with Tour Coach"
            fill
            priority
            unoptimized
            className="object-cover object-[70%_50%]"
          />
          {/* Subtle directional text gradient on left for contrast */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Row / Spacer */}
        <div className="relative z-10 flex items-center justify-end w-full" />

        {/* Title, Brand Capsule & 4 Feature Pills (Left) + Script (Right) */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
              <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
                FINANCIAL MANAGEMENT
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              <span>Cash </span>
              <span className="text-[#38BDF8]">Book</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow line-clamp-2">
              Track cash inflows and outflows across trips, driver settlements, expenses, and daily operations.
            </p>

            {/* 4 Feature Capsules directly matching mockup under subtitle */}
            <div className="hidden sm:flex items-center gap-2.5 pt-3.5 flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <div className="w-5 h-5 rounded-full bg-[#0D62FE] text-white flex items-center justify-center shrink-0">
                  <Plus className="w-3 h-3 stroke-[2.75]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white leading-tight">Track Collections</p>
                  <p className="text-[8px] text-slate-300 leading-tight">Customer payments</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <div className="w-5 h-5 rounded-full bg-[#0D62FE] text-white flex items-center justify-center shrink-0">
                  <Wallet className="w-3 h-3" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white leading-tight">Manage Expenses</p>
                  <p className="text-[8px] text-slate-300 leading-tight">Fuel, Toll, Food, Maint.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <div className="w-5 h-5 rounded-full bg-[#0D62FE] text-white flex items-center justify-center shrink-0">
                  <User className="w-3 h-3" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white leading-tight">Trip Settlements</p>
                  <p className="text-[8px] text-slate-300 leading-tight">Driver payouts</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-white shadow-xs">
                <div className="w-5 h-5 rounded-full bg-[#0D62FE] text-white flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white leading-tight">Real-time Balance</p>
                  <p className="text-[8px] text-slate-300 leading-tight">Accurate cash position</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calligraphic Script on Right matching mockup */}
          <div className="hidden md:block text-right pr-2 select-none pointer-events-none">
            <p className="font-serif italic text-white/95 text-xl lg:text-2xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Miles Create
            </p>
            <p className="font-serif italic text-white/90 text-sm lg:text-base font-medium tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] -mt-1">
              Memories
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-10 sm:-mt-12 lg:-mt-14 relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 px-2 sm:px-4">
        {/* CARD 1: CASH IN */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ArrowDown className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  CASH IN
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(totalCashIn)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
              ↑ 12%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Total receipts</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
              This Month
            </span>
          </div>
        </div>

        {/* CARD 2: CASH OUT */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ArrowUp className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  CASH OUT
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(totalCashOut)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
              ↑ 8%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Total expenses</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
              This Month
            </span>
          </div>
        </div>

        {/* CARD 3: NET CASH FLOW */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  NET CASH FLOW
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayNetCashFlow)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
              ↑ Balanced
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Inflow - Outflow</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
              Active
            </span>
          </div>
        </div>

        {/* CARD 4: TRANSACTIONS */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  TRANSACTIONS
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {displayTotalTransactions}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Total cash book records</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
              All Time
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
          3. MAIN TWO-COLUMN CONTENT: FORM (LEFT) & REGISTER (RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════ LEFT COLUMN: RECORD CASH TRANSACTION (5 COLS) ══════════════ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                <Coins className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Record Cash Transaction
                </h2>
                <p className="text-[11px] text-slate-400">
                  Add cash inflow (receipts) or outflow (expenses) with trip reference.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Inflow vs Outflow Segmented Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setFormDirection("inflow");
                    setForm((f) => ({ ...f, type: "customer_payment" }));
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formDirection === "inflow"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Cash In (Receipt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormDirection("outflow");
                    setForm((f) => ({ ...f, type: "fuel" }));
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formDirection === "outflow"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Cash Out (Expense)</span>
                </button>
              </div>

              {/* Row 1: Date * & Type * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Date</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Type</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      {formDirection === "inflow" ? (
                        <>
                          <option value="customer_payment">Customer Payment</option>
                          <option value="trip_advance">Trip Advance</option>
                          <option value="other_inflow">Other Collection</option>
                        </>
                      ) : (
                        <>
                          <option value="fuel">Fuel Expense</option>
                          <option value="tolls">Toll Charges</option>
                          <option value="driver_payment">Driver Settlement</option>
                          <option value="food">Food &amp; Refreshments</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="office">Office Outlays</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 2: Related Trip (Optional) & Amount (₹) * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Related Trip</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Bus className="w-3.5 h-3.5" />
                    </span>
                    <select
                      value={form.tripId}
                      onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select trip</option>
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          Trip #{t.tripNumber || t.id.slice(0, 5)} • {t.from || "Start"} → {t.to || "End"}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <span>Amount (₹)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
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
                      className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Payment Mode Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
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
                    <span>Cash</span>
                  </button>

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
                    <span>Card</span>
                  </button>
                </div>
              </div>

              {/* Row 4: Reference No. / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Reference No. / Notes
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <textarea
                    rows={2}
                    placeholder="e.g. Receipt #12345, Customer advance, etc."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
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
                <span>{loading ? "Recording..." : "Record Transaction"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN: CASH BOOK LEDGER TABLE (7 COLS) ══════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Cash Book Ledger{" "}
                    <span className="text-slate-400 font-normal">
                      ({filteredItems.length} entries)
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    All cash inflows and outflows with trip and operation details.
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative min-w-[130px] sm:min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search date, type, trip, notes..."
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

                {/* Time Filter Pill */}
                <div className="relative">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="appearance-none pl-6 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="this_month">This Month</option>
                    <option value="all_time">All Time</option>
                  </select>
                  <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Type Filter Pill */}
                <div className="relative">
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value as "all" | "inflow" | "outflow")}
                    className="appearance-none pl-6 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Filter</option>
                    <option value="inflow">Inflows Only</option>
                    <option value="outflow">Outflows Only</option>
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Export Excel */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Export Excel / CSV"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Excel</span>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100/60 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Download Official PDF Report"
                >
                  <FileText className="w-3 h-3 text-rose-600" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">DESCRIPTION</th>
                    <th className="py-2.5 px-3">TRIP</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT</th>
                    <th className="py-2.5 px-3">MODE</th>
                    <th className="py-2.5 px-3 text-right">BALANCE</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No cash transactions matching the filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const modeInfo = MODE_META[item.paymentMode] || MODE_META.other;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.direction === "inflow"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
                              }`}
                            >
                              {item.direction === "inflow" ? (
                                <>
                                  <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Inflow</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>Outflow</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {renderItemIcon(item.typeTitle)}
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">
                                  {item.typeTitle}
                                </p>
                                <p className="text-[10px] text-slate-400 leading-tight">
                                  {item.typeSubtitle}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {item.tripNumber ? (
                              <div>
                                <p className="font-bold text-slate-800 leading-tight">
                                  Trip #{item.tripNumber}
                                </p>
                                {item.tripRoute && (
                                  <p className="text-[10px] text-slate-400 leading-tight">
                                    {item.tripRoute}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono-nums whitespace-nowrap">
                            <span
                              className={
                                item.direction === "inflow"
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }
                            >
                              {item.direction === "inflow" ? "+" : "-"}
                              {formatINR(item.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${modeInfo.badgeClass}`}
                            >
                              {modeInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono-nums whitespace-nowrap">
                            {formatINR(item.balance)}
                          </td>
                          <td className="py-3 px-3 text-right relative">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === item.id && (
                                <div className="absolute right-0 mt-1 w-24 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-left">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-medium cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-500" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400">
                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} entries
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  ‹
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#0D62FE] text-white shadow-xs"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
