"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  UserCheck,
  Clock,
  Search,
  Trash2,
  Check,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
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
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const initialForm = {
    tripId: trips[0]?.tripNumber || trips[0]?.id || "",
    type: "customer_received" as PaymentType,
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "upi" as PaymentMode,
    notes: "",
  };

  const [form, setForm] = useState(initialForm);

  const selectedTrip = trips.find(
    (t) => t.id === form.tripId || t.tripNumber === form.tripId
  );

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
      setFeedback({ message: "Payment recorded successfully!", type: "success" });
      setForm(initialForm);
    } catch (err: unknown) {
      console.error("Save payment error:", err);
      setFeedback({ message: ((err as Error)?.message || "Failed to record payment"), type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await deletePayment(id);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete payment");
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

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.tripId?.toLowerCase().includes(search.toLowerCase()) ||
      p.notes?.toLowerCase().includes(search.toLowerCase()) ||
      p.paymentMode?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payment Management"
        subtitle="Manage customer receipts and driver payments."
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Payments"
          value={totalCount}
          icon={Wallet}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="All transactions logged"
        />
        <StatCard
          label="Customer Receipts"
          value={formatINR(totalCustomerReceipts)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Inflows collected from clients"
        />
        <StatCard
          label="Driver Payments"
          value={formatINR(totalDriverPayments)}
          icon={UserCheck}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          subtitle="Outflows disbursed to drivers"
        />
        <StatCard
          label="Pending Payments"
          value={formatINR(pendingCustomerReceivables)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          subtitle="Trip balances yet to collect"
        />
      </div>

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Record Payment Form */}
        <div className="lg:col-span-5 card">
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Record Payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log a customer collection or driver payout
                </p>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {feedback.type === "success" && <Check className="w-4 h-4" />}
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Select Associated Trip *</label>
              <select
                required
                className="select"
                value={form.tripId}
                onChange={(e) => setForm({ ...form, tripId: e.target.value })}
              >
                <option value="">Choose trip...</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.tripNumber || t.id}>
                    {t.tripNumber || t.id.slice(0, 8)}: {t.customerName} ({t.from} → {t.to})
                  </option>
                ))}
                {trips.length === 0 && <option value="general">General Payment (No Trip)</option>}
              </select>
            </div>

            {selectedTrip && (
              <div className="form-inset text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-semibold text-slate-900">{selectedTrip.customerName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Trip Fare:</span>
                  <span className="font-semibold font-mono-nums text-slate-900">{formatINR(selectedTrip.totalFare)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-slate-200/80">
                  <span>Customer Balance Due:</span>
                  <span className="font-mono-nums">{formatINR(selectedTrip.customerBalance)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Payment Type *</label>
                <select
                  className="select"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as PaymentType })}
                >
                  <option value="customer_received">Customer Received (Inflow)</option>
                  <option value="driver_payment">Driver Payment (Outflow)</option>
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  className="input font-mono-nums"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Payment Mode *</label>
                <select
                  className="select"
                  value={form.paymentMode}
                  onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="card">Card / POS</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Notes / Transaction Reference</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref # 123456789, Final settlement"
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-sm font-semibold justify-center shadow-md shadow-blue-500/25"
            >
              {loading ? (
                "Recording..."
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Record Payment Entry
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Payment History Table */}
        <div className="lg:col-span-7 card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Payment History</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Showing {filteredPayments.length} of {payments.length} entries
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search ref or trip..."
                  className="input pl-8 py-1.5 text-xs w-40"
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
                <option value="customer_received">Customer Receipts</option>
                <option value="driver_payment">Driver Payments</option>
              </select>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No payments found</p>
            </div>
          ) : (
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Trip ID</th>
                    <th>Type</th>
                    <th>Mode</th>
                    <th className="text-right">Amount (₹)</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => {
                    const isReceipt = p.type === "customer_received";
                    return (
                      <tr key={p.id}>
                        <td className="text-xs whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                        <td className="font-mono text-xs font-semibold text-primary">
                          {p.tripId}
                        </td>
                        <td>
                          <StatusBadge status={p.type} variant="payment" />
                        </td>
                        <td className="text-xs uppercase font-medium text-slate-600">
                          {p.paymentMode}
                        </td>
                        <td className={`text-right font-semibold font-mono-nums text-xs ${
                          isReceipt ? "text-emerald-600" : "text-orange-600"
                        }`}>
                          {isReceipt ? "+" : "-"}{formatINR(p.amount)}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-danger"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
