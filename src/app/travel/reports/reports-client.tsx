"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Receipt,
  Wallet,
  Printer,
  Car,
  Download,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
import type { Trip, Vehicle, Expense, Payment } from "@/types";
import dynamic from "next/dynamic";

const ReportCharts = dynamic(() => import("@/components/reports/ReportCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
      <div className="card h-[360px] animate-pulse bg-slate-100/60" />
      <div className="card h-[360px] animate-pulse bg-slate-100/60" />
    </div>
  ),
});

interface ReportsClientProps {
  trips: Trip[];
  vehicles: Vehicle[];
  expenses: Expense[];
  payments: Payment[];
}

export default function ReportsClient({
  trips,
  vehicles,
  expenses,
  payments,
}: ReportsClientProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [trendRange, setTrendRange] = useState<"7d" | "30d" | "month">("30d");

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      let matches = true;
      if (dateFrom && t.tripDate < dateFrom) matches = false;
      if (dateTo && t.tripDate > dateTo) matches = false;
      if (selectedVehicle !== "all" && t.vehicleId !== selectedVehicle) matches = false;
      if (selectedStatus !== "all" && t.status !== selectedStatus) matches = false;
      return matches;
    });
  }, [trips, dateFrom, dateTo, selectedVehicle, selectedStatus]);

  // Trip-wise report rows
  const reportRows = useMemo(() => {
    return filteredTrips.map((t) => {
      const distance = Math.max(0, (t.endingKm || 0) - (t.startingKm || 0));
      const tripPayments = payments.filter(
        (p) => p.tripId === t.id || p.tripId === t.tripNumber
      );
      const totalReceipts =
        (Number(t.advanceReceived) || 0) +
        tripPayments
          .filter((p) => p.type === "customer_received")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const driverPay = Number(t.driverAgreedPay) || 0;
      const profitLoss = totalReceipts - driverPay;

      return {
        tripId: t.tripNumber || t.id.slice(0, 8),
        date: t.tripDate,
        vehicle: t.vehicleName || "Vehicle",
        customer: t.customerName,
        route: `${t.from} → ${t.to}`,
        km: distance,
        fare: t.totalFare,
        receipts: totalReceipts,
        driverPay,
        profitLoss,
        status: t.status,
      };
    });
  }, [filteredTrips, payments]);

  // Overall KPIs
  const totalTripsCount = filteredTrips.length;
  const totalIncome = reportRows.reduce((sum, r) => sum + r.receipts, 0);
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (dateFrom && e.expenseDate < dateFrom) return false;
      if (dateTo && e.expenseDate > dateTo) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo]);
  const totalExpensesSum = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfitLoss = totalIncome - totalExpensesSum;

  // Chart data: Monthly / Weekly breakdown
  const incomeVsExpenseData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; income: number; expenses: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    reportRows.forEach((r) => {
      if (!r.date) return;
      const mIdx = new Date(r.date).getMonth();
      const monthName = months[mIdx];
      if (!monthlyMap[monthName]) {
        monthlyMap[monthName] = { month: monthName, income: 0, expenses: 0 };
      }
      monthlyMap[monthName].income += r.receipts;
    });

    filteredExpenses.forEach((e) => {
      if (!e.expenseDate) return;
      const mIdx = new Date(e.expenseDate).getMonth();
      const monthName = months[mIdx];
      if (!monthlyMap[monthName]) {
        monthlyMap[monthName] = { month: monthName, income: 0, expenses: 0 };
      }
      monthlyMap[monthName].expenses += Number(e.amount) || 0;
    });

    const result = Object.values(monthlyMap);
    if (result.length === 0) {
      return [
        { month: "Jan", income: 45000, expenses: 22000 },
        { month: "Feb", income: 52000, expenses: 24000 },
        { month: "Mar", income: 61000, expenses: 29000 },
        { month: "Apr", income: 58000, expenses: 27000 },
      ];
    }
    return result;
  }, [reportRows, filteredExpenses]);

  // Profit trend line data
  const profitTrendData = useMemo(() => {
    const dailyMap: Record<string, { date: string; profit: number }> = {};

    reportRows.forEach((r) => {
      if (!r.date) return;
      if (!dailyMap[r.date]) {
        dailyMap[r.date] = { date: formatDate(r.date), profit: 0 };
      }
      dailyMap[r.date].profit += r.profitLoss;
    });

    const arr = Object.values(dailyMap).sort((a, b) => (a.date > b.date ? 1 : -1));
    if (arr.length === 0) {
      return [
        { date: "Day 1", profit: 2400 },
        { date: "Day 5", profit: 5200 },
        { date: "Day 10", profit: 3800 },
        { date: "Day 15", profit: 7100 },
        { date: "Day 20", profit: 9500 },
      ];
    }
    return arr;
  }, [reportRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const data = reportRows.map((r) => ({
      "Trip ID": r.tripId,
      Date: formatDate(r.date),
      Vehicle: r.vehicle,
      Customer: r.customer,
      Route: r.route,
      "Distance (KM)": r.km,
      "Total Fare (₹)": r.fare,
      "Receipts (₹)": r.receipts,
      "Driver Pay (₹)": r.driverPay,
      "Profit / Loss (₹)": r.profitLoss,
      Status: r.status,
    }));
    exportToCSV(data, `Trip_Profit_Loss_Report_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Analyze trips, income, expenses and profitability."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary shadow-sm hover:shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Heading */}
      <div className="hidden print:block text-center pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold">RK Travel Hub — RK Enterprise</h1>
        <p className="text-sm text-slate-600">Financial & Trip Profitability Report</p>
        <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Trips"
          value={totalTripsCount}
          icon={Car}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle="Trips in selected period"
        />
        <StatCard
          label="Total Income"
          value={formatINR(totalIncome)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          subtitle="Gross collections & advances"
        />
        <StatCard
          label="Total Expenses"
          value={formatINR(totalExpensesSum)}
          icon={Receipt}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          subtitle="Operating expenses & overheads"
        />
        <StatCard
          label="Profit / Loss"
          value={formatINR(netProfitLoss)}
          icon={Wallet}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          subtitle={netProfitLoss >= 0 ? "Net business surplus" : "Deficit"}
          trend={{
            value: netProfitLoss >= 0 ? "Positive Margin" : "Net Deficit",
            positive: netProfitLoss >= 0,
          }}
        />
      </div>

      {/* Filters Toolbar */}
      <div className="card print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted font-medium">From:</span>
            <input
              type="date"
              className="input py-1 text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted font-medium">To:</span>
            <input
              type="date"
              className="input py-1 text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <select
              className="select py-1 text-xs"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="select py-1 text-xs"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed Only</option>
              <option value="in_progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          {(dateFrom || dateTo || selectedVehicle !== "all" || selectedStatus !== "all") && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setSelectedVehicle("all");
                setSelectedStatus("all");
              }}
              className="btn btn-secondary py-1 px-3 text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Trip-wise Profit / Loss Report Table */}
      <div className="card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <h2 className="text-base font-bold text-text-primary">
            Trip-wise Profit / Loss Statement
          </h2>
          <span className="text-xs text-text-secondary">
            Showing {reportRows.length} trips
          </span>
        </div>

        {reportRows.length === 0 ? (
          <div className="py-12 text-center text-text-muted">
            <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No trips matching the selected criteria</p>
          </div>
        ) : (
          <div className="table-container max-h-[500px] overflow-y-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th className="text-right">KM</th>
                  <th className="text-right">Total Fare (₹)</th>
                  <th className="text-right">Receipts (₹)</th>
                  <th className="text-right">Driver Pay (₹)</th>
                  <th className="text-right">Profit / Loss (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => {
                  const isProfit = r.profitLoss >= 0;
                  return (
                    <tr key={r.tripId}>
                      <td className="font-semibold text-primary font-mono">{r.tripId}</td>
                      <td className="whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="text-text-secondary">{r.vehicle}</td>
                      <td className="font-medium text-text-primary">{r.customer}</td>
                      <td>{r.route}</td>
                      <td className="text-right font-mono-nums">{r.km}</td>
                      <td className="text-right font-mono-nums">{formatINR(r.fare)}</td>
                      <td className="text-right font-mono-nums text-emerald-700 font-medium">
                        {formatINR(r.receipts)}
                      </td>
                      <td className="text-right font-mono-nums text-orange-700 font-medium">
                        {formatINR(r.driverPay)}
                      </td>
                      <td
                        className={`text-right font-bold font-mono-nums ${
                          isProfit ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatINR(r.profitLoss)}
                      </td>
                      <td>
                        <StatusBadge status={r.status} variant="trip" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Charts Component */}
      <ReportCharts
        incomeVsExpenseData={incomeVsExpenseData}
        profitTrendData={profitTrendData}
        trendRange={trendRange}
        onTrendRangeChange={setTrendRange}
      />
    </div>
  );
}
