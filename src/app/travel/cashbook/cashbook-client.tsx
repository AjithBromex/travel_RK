"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Download,
  Search,
  X,
  Receipt,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
import type { CashBookEntry, ExpenseCategory, PaymentMode } from "@/types";
import { createExpense } from "@/services/expenses.service";

interface CashBookClientProps {
  initialEntries: CashBookEntry[];
}

export default function CashBookClient({ initialEntries }: CashBookClientProps) {
  const [entries, setEntries] = useState<CashBookEntry[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: new Date().toISOString().split("T")[0],
    category: "fuel" as ExpenseCategory,
    description: "",
    amount: "",
    paymentMode: "cash" as PaymentMode,
    notes: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.tripId && e.tripId.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === "all" || e.type === typeFilter;

      let matchesDate = true;
      if (dateFrom && e.date < dateFrom) matchesDate = false;
      if (dateTo && e.date > dateTo) matchesDate = false;

      return matchesSearch && matchesType && matchesDate;
    });
  }, [entries, search, typeFilter, dateFrom, dateTo]);

  // KPIs
  const totalCashIn = filteredEntries.reduce((sum, e) => sum + (Number(e.cashIn) || 0), 0);
  const totalCashOut = filteredEntries.reduce((sum, e) => sum + (Number(e.cashOut) || 0), 0);
  const currentCashBalance = totalCashIn - totalCashOut;
  const totalTransactions = filteredEntries.length;

  const handleExportCSV = () => {
    const csvData = filteredEntries.map((e) => ({
      Date: formatDate(e.date),
      "Trip ID": e.tripId || "-",
      Description: e.description,
      "Cash In (₹)": e.cashIn || 0,
      "Cash Out (₹)": e.cashOut || 0,
      "Balance (₹)": e.balance || 0,
      Type: e.type,
      "Payment Mode": e.paymentMode,
    }));
    exportToCSV(csvData, `RK_Travel_CashBook_${new Date().toISOString().split("T")[0]}`);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpense(true);
    const amountNum = Number(expenseForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid expense amount");
      setSavingExpense(false);
      return;
    }

    try {
      const newId = await createExpense({
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        description: expenseForm.description,
        amount: amountNum,
        paymentMode: expenseForm.paymentMode,
        notes: expenseForm.notes,
      });

      const newEntry: CashBookEntry = {
        id: `e-${newId}`,
        date: expenseForm.expenseDate,
        description: `${expenseForm.category.toUpperCase()}: ${expenseForm.description}`,
        cashIn: 0,
        cashOut: amountNum,
        balance: currentCashBalance - amountNum,
        type: "expense",
        paymentMode: expenseForm.paymentMode,
        createdAt: new Date().toISOString(),
      };

      setEntries((prev) => [newEntry, ...prev]);
      setShowExpenseModal(false);
      setExpenseForm({
        expenseDate: new Date().toISOString().split("T")[0],
        category: "fuel",
        description: "",
        amount: "",
        paymentMode: "cash",
        notes: "",
      });
    } catch (err: unknown) {
      alert("Failed to save expense: " + ((err as Error)?.message || "Unknown error"));
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Cash Book"
          subtitle="Track all cash inflows and outflows from receipts and expenses."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-secondary shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary shadow-sm hover:shadow"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cash In"
          value={formatINR(totalCashIn)}
          icon={ArrowDownLeft}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Collections & income received"
        />
        <StatCard
          label="Total Cash Out"
          value={formatINR(totalCashOut)}
          icon={ArrowUpRight}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          subtitle="Driver payouts & operational costs"
        />
        <StatCard
          label="Current Cash Balance"
          value={formatINR(currentCashBalance)}
          icon={Wallet}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle="Net cash liquidity position"
          trend={{
            value: currentCashBalance >= 0 ? "Positive" : "Overdrawn",
            positive: currentCashBalance >= 0,
          }}
        />
        <StatCard
          label="Total Transactions"
          value={totalTransactions}
          icon={BookOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Filtered register entries"
        />
      </div>

      {/* Main Cash Book Card */}
      <div className="card space-y-4">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search description, trip..."
                className="input pl-8 py-1.5 text-xs w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select py-1.5 text-xs"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="receipt">Customer Receipts</option>
              <option value="expense">Expenses</option>
              <option value="driver_payment">Driver Payments</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">From:</span>
            <input
              type="date"
              className="input py-1 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-text-muted">To:</span>
            <input
              type="date"
              className="input py-1 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo || search || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSearch("");
                  setTypeFilter("all");
                }}
                className="btn btn-secondary py-1 px-2 text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Transaction Table */}
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-text-muted">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No transactions recorded</p>
            <p className="text-xs mt-1">Adjust filters or log a payment or expense.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trip ID</th>
                  <th>Description</th>
                  <th className="text-right">Cash In (₹)</th>
                  <th className="text-right">Cash Out (₹)</th>
                  <th className="text-right">Balance (₹)</th>
                  <th>Type</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-xs whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="font-mono text-xs font-semibold text-primary">
                      {entry.tripId || "-"}
                    </td>
                    <td className="text-xs font-medium text-text-primary max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="text-right font-medium font-mono-nums text-xs text-emerald-600">
                      {entry.cashIn > 0 ? `+${formatINR(entry.cashIn)}` : "-"}
                    </td>
                    <td className="text-right font-medium font-mono-nums text-xs text-rose-600">
                      {entry.cashOut > 0 ? `-${formatINR(entry.cashOut)}` : "-"}
                    </td>
                    <td className="text-right font-semibold font-mono-nums text-xs text-text-primary">
                      {formatINR(entry.balance)}
                    </td>
                    <td>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          entry.type === "receipt"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : entry.type === "driver_payment"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {entry.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="text-xs uppercase font-medium text-slate-500">
                      {entry.paymentMode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">Record New Expense</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Log fuel, maintenance, or toll disbursements</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Expense Date *</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select
                    className="select"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  >
                    <option value="fuel">Fuel (Diesel / Petrol)</option>
                    <option value="maintenance">Maintenance & Repair</option>
                    <option value="tolls">Tolls & Fastag</option>
                    <option value="parking">Parking</option>
                    <option value="food">Driver Food Allowance</option>
                    <option value="office_expense">Office Expense</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diesel 45L at IndianOil Pump"
                  className="input"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 4200"
                    className="input font-mono-nums"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Payment Mode *</label>
                  <select
                    className="select"
                    value={expenseForm.paymentMode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value as PaymentMode })}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Fastag</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="btn btn-secondary px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="btn btn-primary px-5 text-xs font-semibold shadow-md shadow-blue-500/25"
                >
                  {savingExpense ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
