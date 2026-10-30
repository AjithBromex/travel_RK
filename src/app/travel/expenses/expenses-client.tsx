"use client";

import { useState, useMemo, useRef } from "react";
import {
  Wallet,
  Fuel,
  Receipt,
  List,
  FileText,
  Plus,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { formatINR, formatDateShort, exportToCSV } from "@/lib/utils";
import type { Expense, ExpenseCategory, PaymentMode, Trip } from "@/types";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/services/expenses.service";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  trips: Trip[];
}

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; badgeClass: string }
> = {
  fuel: {
    label: "Diesel",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  tolls: {
    label: "Toll / FASTag",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  maintenance: {
    label: "Maintenance",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  food: {
    label: "Driver Bata",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  parking: {
    label: "Parking",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  office_expense: {
    label: "Office / Permit",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  other: {
    label: "Other",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI / Online",
  card: "FASTag / Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

const EMPTY_FORM = {
  tripId: "",
  expenseDate: new Date().toISOString().split("T")[0],
  category: "fuel" as ExpenseCategory,
  amount: "",
  paymentMode: "cash" as PaymentMode,
  notes: "",
};

export default function ExpensesClient({
  initialExpenses,
  trips,
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses || []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  // Dynamic real KPIs calculated from real data
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  const thisMonthExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.expenseDate && e.expenseDate.startsWith(currentMonthPrefix)
    );
  }, [expenses, currentMonthPrefix]);

  const totalExpensesMonth = useMemo(() => {
    return thisMonthExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
  }, [thisMonthExpenses]);

  const dieselExpensesMonth = useMemo(() => {
    return thisMonthExpenses
      .filter((e) => e.category === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [thisMonthExpenses]);

  const otherExpensesMonth = useMemo(() => {
    return Math.max(0, totalExpensesMonth - dieselExpensesMonth);
  }, [totalExpensesMonth, dieselExpensesMonth]);

  const totalRecords = expenses.length;

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setForm({
      tripId: expense.tripId || (expense.tripNumber ? "general" : ""),
      expenseDate: expense.expenseDate || new Date().toISOString().split("T")[0],
      category: expense.category || "fuel",
      amount: String(expense.amount || ""),
      paymentMode: expense.paymentMode || "cash",
      notes: expense.notes || "",
    });
    scrollToForm();
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (expense: Expense) => {
    const confirmMsg = `Are you sure you want to delete this ${CATEGORY_CONFIG[expense.category]?.label || "expense"} record of ₹${expense.amount}?`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
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
    const parsedAmount = Number(form.amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setFeedback({ message: "Please enter a valid expense amount.", type: "error" });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const selectedTrip = trips.find((t) => t.id === form.tripId);
      const isGeneral = form.tripId === "general" || !form.tripId;

      const expensePayload = {
        tripId: isGeneral ? "" : form.tripId,
        tripNumber: isGeneral
          ? "General / Fleet"
          : selectedTrip?.tripNumber || "",
        vehicleId: selectedTrip?.vehicleId || "",
        vehicleName: selectedTrip?.vehicleName || "",
        expenseDate: form.expenseDate,
        category: form.category,
        amount: parsedAmount,
        paymentMode: form.paymentMode,
        description: form.notes
          ? form.notes.trim()
          : `${CATEGORY_CONFIG[form.category]?.label || "Trip"} Expense`,
        notes: form.notes.trim(),
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expensePayload);
        setExpenses((prev) =>
          prev.map((item) =>
            item.id === editingExpenseId ? { ...item, ...expensePayload } : item
          )
        );
        setFeedback({ message: "Expense updated successfully!", type: "success" });
        setEditingExpenseId(null);
      } else {
        const newId = await createExpense(expensePayload);
        const newExpense: Expense = {
          id: newId,
          ...expensePayload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setExpenses((prev) => [newExpense, ...prev]);
        setFeedback({ message: "Expense recorded successfully!", type: "success" });
      }

      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      console.error("Save expense error:", err);
      const msg = (err as Error)?.message || "Failed to save expense";
      setFeedback({ message: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const tripNum = (e.tripNumber || "").toLowerCase();
        const notes = (e.notes || "").toLowerCase();
        const categoryLabel = (CATEGORY_CONFIG[e.category]?.label || "").toLowerCase();
        const amountStr = String(e.amount || "");
        if (
          !tripNum.includes(query) &&
          !notes.includes(query) &&
          !categoryLabel.includes(query) &&
          !amountStr.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, search, categoryFilter]);

  // Pagination
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage]);

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expense records to export.");
      return;
    }

    const data = filteredExpenses.map((e) => ({
      Date: e.expenseDate,
      Trip: e.tripNumber || (e.tripId ? `Trip ${e.tripId}` : "General"),
      Category: CATEGORY_CONFIG[e.category]?.label || e.category,
      "Amount (INR)": e.amount,
      "Payment Mode": MODE_LABELS[e.paymentMode] || e.paymentMode,
      Notes: e.notes || "-",
      "Recorded On": e.createdAt ? e.createdAt.split("T")[0] : "-",
    }));

    exportToCSV(data, `RK_Travel_Expenses_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
              OPERATIONS HUB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Track trip costs, fuel, and operating outlays.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={scrollToForm}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
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

      {/* ─── 2. Top 4 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL EXPENSES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL EXPENSES
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(totalExpensesMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">All categories</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>
        </div>

        {/* DIESEL EXPENSES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DIESEL EXPENSES
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(dieselExpensesMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Fuel costs</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>
        </div>

        {/* OTHER EXPENSES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              OTHER EXPENSES
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(otherExpensesMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 truncate mr-1">
              Maintenance, Toll, Food etc.
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
              This Month
            </span>
          </div>
        </div>

        {/* RECORDS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              RECORDS
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <List className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalRecords}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Total expense records</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              All Time
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Main 2-Column Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Trip Expenses Form (5 Cols) */}
        <div ref={formRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {editingExpenseId ? "Edit Expense" : "Trip Expenses"}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Record a new expense for a trip or operation.
                  </p>
                </div>
              </div>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Row 1: Trip & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trip
                  </label>
                  <div className="relative">
                    <select
                      value={form.tripId}
                      onChange={(e) => setForm({ ...form, tripId: e.target.value })}
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Select trip</option>
                      <option value="general">General / Fleet Expense</option>
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.tripNumber} • {t.customerName} ({t.from} → {t.to})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="fuel">Diesel</option>
                      <option value="tolls">Toll / FASTag</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="food">Driver Bata / Food</option>
                      <option value="parking">Parking</option>
                      <option value="office_expense">Office / Permit</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ₹
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Mode & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode
                  </label>
                  <div className="relative">
                    <select
                      value={form.paymentMode}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          paymentMode: e.target.value as PaymentMode,
                        })
                      }
                      className="w-full appearance-none px-3 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Online</option>
                      <option value="card">FASTag / Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Add notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {loading
                      ? "Recording..."
                      : editingExpenseId
                      ? "Update Expense"
                      : "Record Expense"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Expense Register (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header with Search and Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <List className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Expense Register
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    View and manage all recorded expenses.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-36 sm:w-40 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-7 py-1.5 text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="fuel">Diesel</option>
                    <option value="tolls">Toll / FASTag</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="food">Driver Bata</option>
                    <option value="parking">Parking</option>
                    <option value="office_expense">Office / Permit</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Content: Empty State or Table */}
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {search || categoryFilter !== "all"
                    ? "No matching expense records"
                    : "No expense records yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  {search || categoryFilter !== "all"
                    ? "Try adjusting your search or category filter to find recorded expenses."
                    : "Start by recording your first trip expense."}
                </p>
                {search || categoryFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Expense</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="py-2.5 px-2">DATE</th>
                      <th className="py-2.5 px-2">TRIP</th>
                      <th className="py-2.5 px-2">CATEGORY</th>
                      <th className="py-2.5 px-2">AMOUNT</th>
                      <th className="py-2.5 px-2">MODE</th>
                      <th className="py-2.5 px-2">NOTES</th>
                      <th className="py-2.5 px-2 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedExpenses.map((expense) => {
                      const category =
                        CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;

                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-2.5 px-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                            {formatDateShort(expense.expenseDate)}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <span className="font-bold text-slate-800">
                              {expense.tripNumber ||
                                (expense.tripId
                                  ? `Trip #${expense.tripId.slice(0, 6)}`
                                  : "General")}
                            </span>
                            {expense.vehicleName && (
                              <span className="text-[10px] text-slate-400 block">
                                {expense.vehicleName}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${category.badgeClass}`}
                            >
                              {category.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap font-bold text-slate-900 font-mono">
                            ₹{formatINR(expense.amount)}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap text-[11px] text-slate-600">
                            {MODE_LABELS[expense.paymentMode] || expense.paymentMode}
                          </td>
                          <td className="py-2.5 px-2 max-w-[140px] truncate text-[11px] text-slate-500">
                            {expense.notes || "-"}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(expense)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === expense.id}
                                onClick={() => handleDelete(expense)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredExpenses.length)} of{" "}
                  {filteredExpenses.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
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
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
