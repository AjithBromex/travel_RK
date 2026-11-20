"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Coins,
  Fuel,
  Wrench,
  FileText,
  Search,
  Calendar,
  Filter,
  Download,
  Plus,
  Bus,
  ChevronDown,
  Trash2,
  CheckCircle2,
  X,
  MoreVertical,
  Tag,
  CreditCard,
  Edit2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV, exportToPDF } from "@/lib/utils";
import type { Expense, ExpenseCategory, PaymentMode, Trip } from "@/types";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/services/expenses.service";
import { getTrips } from "@/services/trips.service";
import {
  getStoredExpenses,
  getStoredTrips,
  subscribeDataChanged,
  isRecordConfirmed,
} from "@/lib/storage-sync";
import SearchableTripSelect from "@/components/SearchableTripSelect";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  trips: Trip[];
}

const CATEGORY_META: Record<
  string,
  { label: string; badgeClass: string; barColor: string }
> = {
  fuel: {
    label: "Fuel",
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    barColor: "bg-emerald-500",
  },
  tolls: {
    label: "Tolls",
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-200/60",
    barColor: "bg-sky-500",
  },
  food: {
    label: "Food",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/60",
    barColor: "bg-amber-500",
  },
  maintenance: {
    label: "Maintenance",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/60",
    barColor: "bg-rose-500",
  },
  office_expense: {
    label: "Office Expense",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200/60",
    barColor: "bg-slate-500",
  },
  parking: {
    label: "Parking",
    badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200/60",
    barColor: "bg-indigo-500",
  },
  other: {
    label: "Other",
    badgeClass: "bg-purple-50 text-purple-700 border border-purple-200/60",
    barColor: "bg-purple-500",
  },
};

const MODE_META: Record<PaymentMode, { label: string; badgeClass: string }> = {
  upi: { label: "UPI", badgeClass: "bg-purple-50 text-purple-700" },
  cash: { label: "Cash", badgeClass: "bg-emerald-50 text-emerald-700" },
  bank_transfer: { label: "Bank", badgeClass: "bg-blue-50 text-blue-700" },
  card: { label: "Card", badgeClass: "bg-amber-50 text-amber-700" },
  other: { label: "Other", badgeClass: "bg-slate-100 text-slate-700" },
};

const DEFAULT_DEMO_EXPENSES: Expense[] = [];

const EMPTY_FORM = {
  tripId: "",
  expenseDate: new Date().toISOString().split("T")[0],
  category: "fuel" as ExpenseCategory,
  amount: "",
  paymentMode: "cash" as PaymentMode,
  billRef: "",
  notes: "",
};

export default function ExpensesClient({
  initialExpenses,
  trips,
}: ExpensesClientProps) {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (initialExpenses && initialExpenses.length > 0) return initialExpenses;
    return getStoredExpenses();
  });
  const [tripList, setTripList] = useState<Trip[]>(() => {
    if (trips && trips.length > 0) return trips;
    return getStoredTrips();
  });

  const [form, setForm] = useState(() => {
    const queryTripId = searchParams?.get("tripId") || "";
    return {
      ...EMPTY_FORM,
      tripId: queryTripId,
    };
  });

  const selectedTrip = useMemo(() => {
    if (!form.tripId || form.tripId === "general") return null;
    return (
      tripList.find(
        (t) => t.id === form.tripId || t.tripNumber === form.tripId
      ) || null
    );
  }, [form.tripId, tripList]);

  const [customCategories, setCustomCategories] = useState<{ id: string; label: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("rk_custom_expense_categories");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [categoryModalError, setCategoryModalError] = useState("");

  const allCustomCategories = useMemo(() => {
    const map = new Map<string, string>();
    customCategories.forEach((c) => map.set(c.id, c.label));
    expenses.forEach((e) => {
      if (e.category && !CATEGORY_META[e.category] && !map.has(e.category)) {
        const formatted = e.category
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        map.set(e.category, formatted);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [customCategories, expenses]);

  const getCategoryInfo = (cat: string) => {
    if (CATEGORY_META[cat]) return CATEGORY_META[cat];
    const found = allCustomCategories.find((c) => c.id === cat);
    if (found) {
      return {
        label: found.label,
        badgeClass: "bg-teal-50 text-teal-700 border border-teal-200/60",
        barColor: "bg-teal-500",
      };
    }
    const formatted = cat
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      label: formatted || cat,
      badgeClass: "bg-teal-50 text-teal-700 border border-teal-200/60",
      barColor: "bg-teal-500",
    };
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryModalError("Please enter a category name");
      return;
    }

    const id = trimmed.toLowerCase().replace(/\s+/g, "_");

    if (CATEGORY_META[id] || CATEGORY_META[trimmed.toLowerCase()]) {
      const existingKey = id in CATEGORY_META ? id : trimmed.toLowerCase();
      setForm((prev) => ({ ...prev, category: existingKey as ExpenseCategory }));
      setShowAddCategoryModal(false);
      setNewCategoryInput("");
      setCategoryModalError("");
      return;
    }

    const existing = customCategories.find(
      (c) => c.id === id || c.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setForm((prev) => ({ ...prev, category: existing.id as ExpenseCategory }));
      setShowAddCategoryModal(false);
      setNewCategoryInput("");
      setCategoryModalError("");
      return;
    }

    const newCat = { id, label: trimmed };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    try {
      localStorage.setItem("rk_custom_expense_categories", JSON.stringify(updated));
    } catch {}

    setForm((prev) => ({ ...prev, category: id as ExpenseCategory }));
    setShowAddCategoryModal(false);
    setNewCategoryInput("");
    setCategoryModalError("");
    setFeedback({
      message: `Category "${trimmed}" added and selected.`,
      type: "success",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Client-side hydration & real-time sync
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        const [freshExpenses, freshTrips] = await Promise.all([
          getExpenses(100),
          getTrips(100),
        ]);
        if (Array.isArray(freshExpenses)) setExpenses(freshExpenses);
        if (Array.isArray(freshTrips)) setTripList(freshTrips);
      } catch (err) {
        console.warn("[ExpensesClient] Background fetch failed:", err);
      }
    };

    fetchFreshData();

    const unsubscribe = subscribeDataChanged((entity) => {
      if (entity === "expenses" || entity === "trips" || entity === "all") {
        fetchFreshData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Update tripId if query param changes
  useEffect(() => {
    const paramTripId = searchParams?.get("tripId");
    if (paramTripId) {
      setForm((prev) => ({ ...prev, tripId: paramTripId }));
    }
  }, [searchParams]);

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("this_month");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);

  // Dynamic Real KPIs (strictly real data)
  const thisMonthExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.expenseDate && e.expenseDate.startsWith(currentMonthPrefix)
    );
  }, [expenses, currentMonthPrefix]);

  const realTotalMonth = useMemo(() => {
    return thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [thisMonthExpenses]);

  const realDieselMonth = useMemo(() => {
    return thisMonthExpenses
      .filter((e) => e.category === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [thisMonthExpenses]);

  const realOtherMonth = Math.max(0, realTotalMonth - realDieselMonth);

  const displayTotalMonth = realTotalMonth;
  const displayDieselMonth = realDieselMonth;
  const displayOtherMonth = realOtherMonth;
  const displayTotalRecords = expenses.length;

  // Category breakdown amounts & percentages for the bottom cards
  const categoryBreakdown = useMemo(() => {
    const dieselAmt = expenses
      .filter((e) => e.category === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const tollAmt = expenses
      .filter((e) => e.category === "tolls")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const maintAmt = expenses
      .filter((e) => e.category === "maintenance")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const foodAmt = expenses
      .filter((e) => e.category === "food")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const otherAmt = expenses
      .filter((e) => e.category !== "fuel" && e.category !== "tolls" && e.category !== "maintenance" && e.category !== "food")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalSum = (dieselAmt + tollAmt + maintAmt + foodAmt + otherAmt) || 1;

    return {
      diesel: { amount: dieselAmt, pct: ((dieselAmt / totalSum) * 100).toFixed(1) },
      toll: { amount: tollAmt, pct: ((tollAmt / totalSum) * 100).toFixed(1) },
      maint: { amount: maintAmt, pct: ((maintAmt / totalSum) * 100).toFixed(1) },
      food: { amount: foodAmt, pct: ((foodAmt / totalSum) * 100).toFixed(1) },
      other: { amount: otherAmt, pct: ((otherAmt / totalSum) * 100).toFixed(1) },
    };
  }, [expenses]);

  const handleEdit = (expense: Expense) => {
    if (expense.isConfirmed || isRecordConfirmed('expenses', expense.id, expense)) {
      alert("This expense has been confirmed by Admin and cannot be edited.");
      return;
    }
    setEditingExpenseId(expense.id);
    setActiveMenuId(null);
    setForm({
      tripId: expense.tripId || (expense.tripNumber ? "general" : ""),
      expenseDate: expense.expenseDate || new Date().toISOString().split("T")[0],
      category: expense.category || "fuel",
      amount: String(expense.amount || ""),
      paymentMode: expense.paymentMode || "cash",
      billRef: expense.description && expense.description.startsWith("Bill #") ? expense.description : "",
      notes: expense.notes || "",
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 200);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (expense: Expense) => {
    if (expense.isConfirmed || isRecordConfirmed('expenses', expense.id, expense)) {
      alert("This expense has been confirmed by Admin and cannot be deleted.");
      return;
    }
    setActiveMenuId(null);
    const confirmMsg = `Are you sure you want to delete this ${
      CATEGORY_META[expense.category]?.label || "expense"
    } of ${formatINR(expense.amount)}?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(expense.id);
    try {
      if (!expense.id.startsWith("demo-exp-")) {
        await deleteExpense(expense.id);
      }
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      if (editingExpenseId === expense.id) {
        handleCancelEdit();
      }
      setFeedback({
        message: "Expense record deleted successfully.",
        type: "success",
      });
    } catch (err: unknown) {
      console.error("Delete expense error:", err);
      setFeedback({
        message: "Failed to delete expense. Please try again.",
        type: "error",
      });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce trip selection before allowing any expense to be recorded
    if (!form.tripId || form.tripId === "general" || !selectedTrip) {
      setFeedback({
        message: "Please select a trip booking. Expenses can only be recorded after selecting a trip.",
        type: "error",
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const parsedAmount = Number(form.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({
        message: "Please enter a valid expense amount.",
        type: "error",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const targetTripId = selectedTrip.tripNumber || selectedTrip.id || form.tripId;
      const descText = form.billRef.trim()
        ? `Bill #${form.billRef.replace(/^Bill\s*#?/i, "").trim()}`
        : form.notes.trim() || `${CATEGORY_META[form.category].label} Expense`;

      const payload = {
        tripId: targetTripId,
        tripNumber: targetTripId,
        expenseDate: form.expenseDate,
        category: form.category,
        amount: parsedAmount,
        paymentMode: form.paymentMode,
        description: descText,
        vehicleName: selectedTrip ? `${selectedTrip.vehicleName ? selectedTrip.vehicleName + ' • ' : ''}${selectedTrip.from || "Origin"} → ${selectedTrip.to || "Destination"}` : "",
        notes: form.notes.trim(),
      };

      if (editingExpenseId) {
        if (!editingExpenseId.startsWith("demo-exp-")) {
          await updateExpense(editingExpenseId, payload);
        }
        setExpenses((prev) =>
          prev.map((item) =>
            item.id === editingExpenseId
              ? { ...item, ...payload, updatedAt: new Date().toISOString() }
              : item
          )
        );
        setFeedback({ message: "Expense updated successfully!", type: "success" });
        setEditingExpenseId(null);
      } else {
        const newId = await createExpense(payload);
        const newRecord: Expense = {
          id: newId,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setExpenses((prev) => [newRecord, ...prev]);
        setFeedback({ message: "Expense recorded successfully!", type: "success" });
      }

      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      console.error("Save expense error:", err);
      setFeedback({
        message: (err as Error)?.message || "Failed to save expense.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesCategory = getCategoryInfo(e.category).label.toLowerCase().includes(query);
        const matchesNotes = (e.notes || "").toLowerCase().includes(query);
        const matchesDesc = (e.description || "").toLowerCase().includes(query);
        const matchesTrip = (e.tripNumber || e.tripId || "").toLowerCase().includes(query);
        const matchesRoute = (e.vehicleName || "").toLowerCase().includes(query);
        const matchesAmount = String(e.amount).includes(query);
        const matchesDate = (e.expenseDate || "").toLowerCase().includes(query);
        if (!matchesCategory && !matchesNotes && !matchesDesc && !matchesTrip && !matchesRoute && !matchesAmount && !matchesDate) {
          return false;
        }
      }

      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }

      if (timeFilter === "this_month" && (!e.expenseDate || !e.expenseDate.startsWith(currentMonthPrefix))) {
        // If demo items exist from current month
      }

      return true;
    });
  }, [expenses, search, categoryFilter, timeFilter, currentMonthPrefix]);

  // Pagination (8 entries per page matching mockup)
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage]);

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses recorded yet to export.");
      return;
    }
    const data = filteredExpenses.map((e) => ({
      Date: e.expenseDate,
      "Trip ID": e.tripNumber || e.tripId || "-",
      Route: e.vehicleName || "-",
      Category: getCategoryInfo(e.category).label,
      Amount: e.amount,
      Mode: e.paymentMode.toUpperCase(),
      Notes: e.notes || e.description || "-",
    }));
    exportToCSV(data, `RK_Expenses_Register_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPDF = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses recorded yet to export.");
      return;
    }
    const headers = [
      "Date",
      "Trip ID",
      "Route / Vehicle",
      "Category",
      "Amount",
      "Payment Mode",
      "Notes",
    ];
    const data = filteredExpenses.map((e) => [
      formatDate(e.expenseDate),
      e.tripNumber || e.tripId || "-",
      e.vehicleName || "-",
      getCategoryInfo(e.category).label,
      formatINR(e.amount),
      e.paymentMode.toUpperCase(),
      e.notes || e.description || "-",
    ]);

    const totalExpense = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const fuelExpense = filteredExpenses
      .filter((e) => e.category === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const avgExpense = filteredExpenses.length > 0 
      ? Math.round(totalExpense / filteredExpenses.length) 
      : 0;

    exportToPDF({
      title: "Operating Expenses Register",
      subtitle: `Master Record of Trip Outlays, Fuel & Maintenance • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `RK_Expenses_Register_${new Date().toISOString().slice(0, 10)}.pdf`,
      headers,
      data,
      summary: [
        { label: "Total Entries", value: String(filteredExpenses.length) },
        { label: "Total Outlay", value: formatINR(totalExpense) },
        { label: "Fuel Outlay", value: formatINR(fuelExpense) },
        { label: "Avg per Entry", value: formatINR(avgExpense) },
      ],
    });
  };

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER (Tour Bus & SUV Sunrise Highway)
          ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-md min-h-[290px] sm:min-h-[320px] lg:min-h-[350px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32"
      >
        {/* Background Scenic Alpine Lake Road with Tour Coach and SUV */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/images/expenses-scenic-hero.jpg"
            alt="Alpine Highway with Tour Coach and SUV at Sunrise"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 100vw, 1500px"
            className="object-cover object-[70%_50%]"
          />
          {/* Subtle directional dark gradient on the left for contrast */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Row / Spacer */}
        <div className="relative z-10 flex items-center justify-end w-full" />

        {/* Title, Brand Capsule & Calligraphic Script */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
              <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
                COST MANAGEMENT
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              Expenses
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow line-clamp-2">
              Track trip costs, fuel expenses, maintenance, tolls, food and all operating outlays.
            </p>
          </div>

          {/* Calligraphic Script on Right matching mockup */}
          <div className="hidden md:block text-right pr-2 select-none pointer-events-none">
            <p className="font-serif italic text-white/95 text-xl lg:text-2xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Every Journey Has a Cost.
            </p>
            <p className="font-serif italic text-white/90 text-sm lg:text-base font-medium tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] -mt-1">
              We Keep It Clear.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-10 sm:-mt-12 lg:-mt-14 relative z-20 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 px-1 sm:px-4">
        {/* CARD 1: TOTAL EXPENSES */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  TOTAL EXPENSES
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayTotalMonth)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
              ↑ 12%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">All categories</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
              This Month
            </span>
          </div>
        </div>

        {/* CARD 2: FUEL EXPENSES */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Fuel className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  FUEL EXPENSES
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayDieselMonth)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
              ↑ 8%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Fuel costs</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
              This Month
            </span>
          </div>
        </div>

        {/* CARD 3: OTHER EXPENSES */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  OTHER EXPENSES
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayOtherMonth)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
              ↑ 5%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Maintenance, Toll, Food etc.</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              This Month
            </span>
          </div>
        </div>

        {/* CARD 4: TOTAL RECORDS */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  TOTAL RECORDS
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {displayTotalRecords}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Expense entries</span>
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
        {/* ══════════════ LEFT COLUMN: RECORD EXPENSE FORM (5 COLS) ══════════════ */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header with gas station graphic badge */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D62FE] flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingExpenseId ? "Edit Expense Record" : "Record Expense"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Add a new expense for a trip or daily operation.
                  </p>
                </div>
              </div>

              {/* Watermark/Illustration matching mockup */}
              <div className="relative w-24 h-10 hidden sm:block opacity-90 shrink-0">
                <Image
                  src="/images/expense-form-banner.png"
                  alt="Fuel station"
                  fill
                  unoptimized
                  className="object-contain object-right"
                />
              </div>

              {editingExpenseId && (
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
              {/* Row 1: Linked Trip Booking * & Date * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
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
                    trips={tripList}
                    value={form.tripId}
                    onChange={(selectedId) => {
                      setForm((prev) => ({
                        ...prev,
                        tripId: selectedId,
                        amount: selectedId ? prev.amount : "",
                      }));
                    }}
                    placeholder="🔍 Search & select a trip booking (Required)..."
                    requiredTrip={true}
                    showDueBadge={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Date</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="date"
                      value={form.expenseDate}
                      onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                      required
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Informational Guidance Notice when no trip is selected */}
              {!selectedTrip && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-950 text-xs">Trip Selection Required</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Please search and select a trip booking above before adding an expense amount. All trip operating expenses (fuel, tolls, maintenance, food) must be linked to a specific trip.
                    </p>
                  </div>
                </div>
              )}

              {/* Selected Trip Details Badge */}
              {selectedTrip && (
                <div className="p-2.5 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-blue-900 truncate">
                      Trip #{selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)} • {selectedTrip.customerName || "Customer"}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {selectedTrip.from || "Start"} → {selectedTrip.to || "End"} {selectedTrip.vehicleName ? `• ${selectedTrip.vehicleName}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    Trip Linked ✓
                  </span>
                </div>
              )}

              {/* Row 2: Category * & Amount (₹) * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>Category</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Add new category</span>
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Tag className="w-3.5 h-3.5" />
                    </span>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setShowAddCategoryModal(true);
                        } else {
                          setForm({ ...form, category: e.target.value as ExpenseCategory });
                        }
                      }}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <optgroup label="Standard Categories">
                        <option value="fuel">Fuel</option>
                        <option value="tolls">Tolls</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="food">Food</option>
                        <option value="office_expense">Office Expense</option>
                        <option value="parking">Parking</option>
                        <option value="other">Other</option>
                      </optgroup>
                      {allCustomCategories.length > 0 && (
                        <optgroup label="Custom Categories">
                          {allCustomCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__add_new__" className="text-blue-600 font-bold">
                        + Add new category...
                      </option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
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
                      disabled={!selectedTrip}
                      placeholder={!selectedTrip ? "Select trip booking first..." : "e.g. 2500"}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      className={`w-full pl-6 pr-3 py-2 border rounded-xl text-xs font-bold outline-none transition-all ${
                        !selectedTrip
                          ? "bg-slate-100/90 text-slate-400 border-slate-200 cursor-not-allowed placeholder:text-slate-400"
                          : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900"
                      }`}
                    />
                  </div>
                  {!selectedTrip && (
                    <p className="mt-1 text-[10px] text-slate-400 italic">
                      Amount unlocks after selecting a trip booking.
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Payment Mode * & Bill / Reference No. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Payment Mode</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <select
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card / FASTag</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bill / Reference No.
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Bill #12345"
                      value={form.billRef}
                      onChange={(e) => setForm({ ...form, billRef: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Notes (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <span>Notes</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Add notes about this expense..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !selectedTrip}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  !selectedTrip
                    ? "bg-slate-400 hover:bg-slate-400 shadow-none cursor-not-allowed"
                    : "bg-[#0D62FE] hover:bg-[#0952DC] shadow-blue-500/25"
                }`}
              >
                {loading ? (
                  <span>Recording...</span>
                ) : !selectedTrip ? (
                  <>
                    <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>Select a Trip Booking to Record Expense</span>
                  </>
                ) : editingExpenseId ? (
                  <>
                    <Plus className="w-4 h-4 stroke-[2.75]" />
                    <span>Update Expense</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[2.75]" />
                    <span>Record Expense for Trip #{selectedTrip.tripNumber || selectedTrip.id.slice(0, 6)}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ══════════════ RIGHT COLUMN: EXPENSE REGISTER TABLE (7 COLS) ══════════════ */}
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
                    Expense Register{" "}
                    <span className="text-slate-400 font-normal">
                      ({filteredExpenses.length} entries)
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    View, search and manage all recorded expenses.
                  </p>
                </div>
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Box */}
                <div className="relative min-w-[140px] sm:min-w-[170px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search date, category, notes..."
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

                {/* Category Filter Pill */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none pl-6 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Filter</option>
                    <option value="fuel">Fuel</option>
                    <option value="tolls">Tolls</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="food">Food</option>
                    <option value="office_expense">Office Expense</option>
                    <option value="parking">Parking</option>
                    <option value="other">Other</option>
                    {allCustomCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Excel Export Button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Export Excel / CSV"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>Excel</span>
                </button>

                {/* PDF Download Button */}
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
            <div className="overflow-x-auto min-h-[360px] -mx-1 sm:mx-0">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">TRIP</th>
                    <th className="py-2.5 px-3">CATEGORY</th>
                    <th className="py-2.5 px-3">AMOUNT</th>
                    <th className="py-2.5 px-3">MODE</th>
                    <th className="py-2.5 px-3">NOTES</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No expense records matching the search or filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((e) => {
                      const catInfo = getCategoryInfo(e.category);
                      const modeInfo = MODE_META[e.paymentMode] || MODE_META.other;

                      return (
                        <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                            {formatDate(e.expenseDate)}
                          </td>
                          <td className="py-3 px-3">
                            {e.tripNumber || e.tripId ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <Bus className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <Link
                                    href={`/travel/trips?search=${encodeURIComponent(e.tripNumber || e.tripId || "")}`}
                                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline leading-tight block"
                                  >
                                    Trip #{e.tripNumber || e.tripId}
                                  </Link>
                                  {e.vehicleName && (
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                      {e.vehicleName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${catInfo.badgeClass}`}
                            >
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900 font-mono-nums">
                            {formatINR(e.amount)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${modeInfo.badgeClass}`}
                            >
                              {modeInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate">
                            {e.notes || e.description || "-"}
                          </td>
                          <td className="py-3 px-3 text-right relative">
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === e.id ? null : e.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === e.id && (
                                <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-left">
                                  {e.isConfirmed || isRecordConfirmed('expenses', e.id, e) ? (
                                    <div className="px-3 py-1.5 text-emerald-700 bg-emerald-50/70 flex items-center gap-1.5 text-[11px] font-bold">
                                      <Lock className="w-3 h-3 text-emerald-600" />
                                      <span>Confirmed (Locked)</span>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(e)}
                                        className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 font-medium cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3 text-slate-500" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(e)}
                                        disabled={deletingId === e.id}
                                        className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-medium cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                        <span>Delete</span>
                                      </button>
                                    </>
                                  )}
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
                Showing {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredExpenses.length)} of {filteredExpenses.length} entries
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

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM 5 CATEGORY BREAKDOWN SUMMARY CARDS (5-Column Grid)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. FUEL */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-100">
            <Image
              src="/images/expense-thumb-diesel.png"
              alt="Fuel"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 leading-tight">Fuel</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-mono-nums leading-tight mt-0.5">
              {formatINR(categoryBreakdown.diesel.amount)}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {categoryBreakdown.diesel.pct}% of total
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${categoryBreakdown.diesel.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. TOLL */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-100">
            <Image
              src="/images/expense-thumb-toll.png"
              alt="Toll"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 leading-tight">Toll</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-mono-nums leading-tight mt-0.5">
              {formatINR(categoryBreakdown.toll.amount)}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {categoryBreakdown.toll.pct}% of total
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${categoryBreakdown.toll.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. MAINTENANCE */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-100">
            <Image
              src="/images/expense-thumb-maint.png"
              alt="Maintenance"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 leading-tight">Maintenance</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-mono-nums leading-tight mt-0.5">
              {formatINR(categoryBreakdown.maint.amount)}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {categoryBreakdown.maint.pct}% of total
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full"
                style={{ width: `${categoryBreakdown.maint.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. FOOD */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-100">
            <Image
              src="/images/expense-thumb-food.png"
              alt="Food"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 leading-tight">Food</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-mono-nums leading-tight mt-0.5">
              {formatINR(categoryBreakdown.food.amount)}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {categoryBreakdown.food.pct}% of total
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${categoryBreakdown.food.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5. OTHER */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-100">
            <Image
              src="/images/expense-thumb-other.png"
              alt="Other"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-600 leading-tight">Other</p>
            <p className="text-sm sm:text-base font-black text-slate-900 font-mono-nums leading-tight mt-0.5">
              {formatINR(categoryBreakdown.other.amount)}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {categoryBreakdown.other.pct}% of total
            </p>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${categoryBreakdown.other.pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. ADD NEW CATEGORY MODAL
          ───────────────────────────────────────────────────────────── */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Category</h3>
                  <p className="text-[11px] text-slate-500">Create a custom expense category</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryInput("");
                  setCategoryModalError("");
                }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => {
                    setNewCategoryInput(e.target.value);
                    if (categoryModalError) setCategoryModalError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  autoFocus
                  placeholder="e.g. Fastag, Driver Allowance, Permit"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                />
                {categoryModalError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {categoryModalError}
                  </p>
                )}
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                  Quick Suggestions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Fastag / Recharge",
                    "Driver Allowance",
                    "Permit & Taxes",
                    "Tyre / Spare Parts",
                    "AdBlue / DEF",
                    "Vehicle Wash",
                    "Police / RTO",
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setNewCategoryInput(sugg)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                    >
                      + {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryInput("");
                  setCategoryModalError("");
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

