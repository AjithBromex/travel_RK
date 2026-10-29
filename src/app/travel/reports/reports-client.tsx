"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Receipt,
  Download,
  Car,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plane,
  Users,
  Compass,
  Fuel,
  Building2,
  Calendar,
  Check,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Bus,
} from "lucide-react";
import { formatINR, formatDate, exportToCSV } from "@/lib/utils";
import type { Trip, Vehicle, Expense, Payment } from "@/types";

interface ReportsClientProps {
  trips: Trip[];
  vehicles: Vehicle[];
  expenses: Expense[];
  payments: Payment[];
}

interface ReportTripRecord {
  id: string;
  tripCode: string;
  route: string;
  from: string;
  to: string;
  vehicleName: string;
  regNumber: string;
  driverName: string;
  grossIncome: number;
  paymentMode: string;
  tripExpenses: number;
  expenseBreakdown: string;
  netMargin: number;
  marginPercent: number;
  auditStatus: "reconciled" | "verified" | "pending";
  date: string;
  status: string;
}

export default function ReportsClient({
  trips,
  vehicles,
  expenses,
  payments,
}: ReportsClientProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const startOfYear = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(startOfYear);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Build report records dynamically from real Firestore trips, payments, and expenses
  const reportRecords = useMemo(() => {
    return trips.map((t, idx) => {
      const tripPayments = payments.filter(
        (p) => p.tripId === t.id || p.tripId === t.tripNumber
      );
      const totalPaymentsReceived = tripPayments
        .filter((p) => p.type === "customer_received")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const gross =
        totalPaymentsReceived > 0
          ? totalPaymentsReceived
          : (Number(t.advanceReceived) || 0) + (Number(t.customerBalance) || 0) ||
            Number(t.totalFare) ||
            0;

      const tripExps = expenses.filter((e) => e.tripId === t.id);
      const recordedExpenses = tripExps.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );
      const driverAgreedPay = Number(t.driverAgreedPay) || 0;
      const totalExp = recordedExpenses + driverAgreedPay;

      const net = gross - totalExp;
      const pct = gross > 0 ? Math.round((net / gross) * 1000) / 10 : 0;

      const matchedVehicle = vehicles.find((v) => v.id === t.vehicleId);
      const regNumber = matchedVehicle?.registrationNumber || "Unassigned";

      const fuelExpenses = tripExps
        .filter((e) => e.category === "fuel")
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const tollExpenses = tripExps
        .filter((e) => e.category === "tolls" || e.category === "parking")
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const expenseBreakdown =
        totalExp > 0
          ? `Fuel ₹${fuelExpenses.toLocaleString("en-IN")}, Toll ₹${tollExpenses.toLocaleString("en-IN")}`
          : "No expenses logged";

      return {
        id: t.id,
        tripCode: t.tripNumber ? `#${t.tripNumber}` : `#TR-${t.id.slice(0, 6)}`,
        route: `${t.from} ➔ ${t.to}`,
        from: t.from,
        to: t.to,
        vehicleName: t.vehicleName || matchedVehicle?.name || "Fleet Vehicle",
        regNumber,
        driverName: t.driverName || "Driver Unassigned",
        grossIncome: gross,
        paymentMode:
          (t.customerBalance ?? 0) <= 0
            ? "FULL PAID"
            : (t.advanceReceived ?? 0) > 0
            ? "PARTIAL"
            : "PENDING",
        tripExpenses: totalExp,
        expenseBreakdown,
        netMargin: net,
        marginPercent: pct,
        auditStatus:
          t.status === "completed"
            ? "reconciled"
            : t.status === "in_progress"
            ? "verified"
            : ("pending" as "reconciled" | "verified" | "pending"),
        date: t.tripDate || todayStr,
        status: t.status,
      };
    });
  }, [trips, payments, expenses, vehicles, todayStr]);

  // Extract unique routes from real trips
  const uniqueRoutes = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.from && t.to) set.add(`${t.from} ➔ ${t.to}`);
    });
    return Array.from(set);
  }, [trips]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return reportRecords.filter((r) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesQuery =
          r.tripCode.toLowerCase().includes(query) ||
          r.route.toLowerCase().includes(query) ||
          r.vehicleName.toLowerCase().includes(query) ||
          r.regNumber.toLowerCase().includes(query) ||
          r.driverName.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      if (
        selectedVehicle !== "all" &&
        !r.regNumber.toLowerCase().includes(selectedVehicle.toLowerCase()) &&
        !r.vehicleName.toLowerCase().includes(selectedVehicle.toLowerCase())
      ) {
        return false;
      }

      if (
        selectedRoute !== "all" &&
        !r.route.toLowerCase().includes(selectedRoute.toLowerCase())
      ) {
        return false;
      }

      if (selectedStatus !== "all" && r.status !== selectedStatus) {
        return false;
      }

      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;

      return true;
    });
  }, [
    reportRecords,
    search,
    selectedVehicle,
    selectedRoute,
    selectedStatus,
    dateFrom,
    dateTo,
  ]);

  // Dynamic KPIs calculated from filtered or total real records
  const totalTripsCount = filteredRecords.length;
  const grossRevenue = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.grossIncome, 0),
    [filteredRecords]
  );
  const totalOperatingExpenses = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.tripExpenses, 0),
    [filteredRecords]
  );
  const netProfitMargin = grossRevenue - totalOperatingExpenses;
  const overallMarginPercent =
    grossRevenue > 0
      ? ((netProfitMargin / grossRevenue) * 100).toFixed(1)
      : "0.0";

  // Real Fleet Profitability by vehicle
  const vehicleProfitability = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; gross: number; exp: number; net: number }
    >();

    filteredRecords.forEach((r) => {
      const key = r.vehicleName || "Other";
      const existing = map.get(key) || {
        name: key,
        count: 0,
        gross: 0,
        exp: 0,
        net: 0,
      };
      existing.count += 1;
      existing.gross += r.grossIncome;
      existing.exp += r.tripExpenses;
      existing.net += r.netMargin;
      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.net - a.net)
      .slice(0, 4);
  }, [filteredRecords]);

  // Top corridor
  const topCorridor = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    filteredRecords.forEach((r) => {
      const key = r.route;
      const existing = map.get(key) || { count: 0, volume: 0 };
      existing.count += 1;
      existing.volume += r.grossIncome;
      map.set(key, existing);
    });

    let top = { route: "No trips recorded", count: 0, volume: 0 };
    map.forEach((val, route) => {
      if (val.volume > top.volume) {
        top = { route, count: val.count, volume: val.volume };
      }
    });
    return top;
  }, [filteredRecords]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const data = filteredRecords.map((r) => ({
      "Trip Code": r.tripCode,
      Route: r.route,
      Vehicle: `${r.vehicleName} (${r.regNumber})`,
      Driver: r.driverName,
      "Gross Income (INR)": r.grossIncome,
      "Trip Expenses (INR)": r.tripExpenses,
      "Net Margin (INR)": r.netMargin,
      "Margin %": `${r.marginPercent}%`,
      "Audit Status": r.auditStatus,
      Date: r.date,
    }));
    exportToCSV(
      data,
      `RK_Travel_Trip_Ledger_${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
              Financial Intelligence &amp; Analytics
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Reports &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Real-time profit &amp; loss analysis, gross collections, operating expenses, and margins calculated directly from your dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 KPI Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL TRIPS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Trips
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
              {totalTripsCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Dispatches matching filter</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">Fleet Size: {vehicles.length} units</span>
            <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full text-[11px]">
              Live
            </span>
          </div>
        </div>

        {/* GROSS REVENUE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Gross Revenue
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight font-mono-nums">
              {formatINR(grossRevenue)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Total trip billings &amp; fares</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">Reconciled billings</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
              Verified
            </span>
          </div>
        </div>

        {/* TOTAL OPERATING EXPENSES */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Operating Expenses
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-3xl font-extrabold text-slate-900 font-display tracking-tight font-mono-nums">
              {formatINR(totalOperatingExpenses)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Fuel, toll, driver pay &amp; batta</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">
              {grossRevenue > 0
                ? `${((totalOperatingExpenses / grossRevenue) * 100).toFixed(1)}% OpEx Ratio`
                : "0% OpEx"}
            </span>
            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full text-[11px]">
              Actuals
            </span>
          </div>
        </div>

        {/* NET PROFIT MARGIN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Net Profit Margin
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div
              className={`text-3xl font-extrabold font-display tracking-tight font-mono-nums ${
                netProfitMargin >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              {formatINR(netProfitMargin)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Net business surplus after OpEx</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium">Margin Percentage</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                netProfitMargin >= 0
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              {overallMarginPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Global Filters Strip */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker */}
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium">
            <span className="text-slate-400 mr-1.5">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-slate-800 outline-none text-xs cursor-pointer"
            />
            <span className="text-slate-400 mx-2">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-slate-800 outline-none text-xs cursor-pointer"
            />
          </div>

          {/* All Vehicles Dropdown */}
          <div className="relative">
            <select
              value={selectedVehicle}
              onChange={(e) => {
                setSelectedVehicle(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-slate-100 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 outline-none hover:bg-slate-200/70 transition-all cursor-pointer"
            >
              <option value="all">All Vehicles ({vehicles.length} units)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.registrationNumber}>
                  {v.name} ({v.registrationNumber})
                </option>
              ))}
            </select>
            <Car className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dynamic Routes Dropdown */}
          <div className="relative">
            <select
              value={selectedRoute}
              onChange={(e) => {
                setSelectedRoute(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-slate-100 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 outline-none hover:bg-slate-200/70 transition-all cursor-pointer"
            >
              <option value="all">All Routes ({uniqueRoutes.length} active)</option>
              {uniqueRoutes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
            <Compass className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-slate-100 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 outline-none hover:bg-slate-200/70 transition-all cursor-pointer"
            >
              <option value="all">All Dispatch Statuses</option>
              <option value="completed">Completed Trips</option>
              <option value="in_progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Check className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Reset */}
        {(selectedVehicle !== "all" || selectedRoute !== "all" || selectedStatus !== "all" || search) && (
          <button
            type="button"
            onClick={() => {
              setSelectedVehicle("all");
              setSelectedRoute("all");
              setSelectedStatus("all");
              setSearch("");
              setDateFrom(startOfYear);
              setDateTo(todayStr);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 4. Trip-wise Profit / Loss Statement Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Top Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Trip-wise Profit / Loss Statement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live dispatch ledger with operational cost and gross income reconciliation
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search trip #, vehicle, driver..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-100/80 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Showing {paginatedRecords.length} of {filteredRecords.length} trips
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {paginatedRecords.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No trips found</p>
              <p className="text-xs text-slate-400 mt-1">
                {trips.length === 0
                  ? "No trip dispatches exist in the database yet."
                  : "No trips match your current search and filter criteria."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Trip Code / Route</th>
                  <th className="py-3 px-5">Vehicle &amp; Driver</th>
                  <th className="py-3 px-5">Gross Income</th>
                  <th className="py-3 px-5">Trip Expenses</th>
                  <th className="py-3 px-5">Net Margin</th>
                  <th className="py-3 px-5 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Trip Code / Route */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.tripCode}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.route}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="py-4 px-5">
                      <div className="font-medium text-slate-900">{item.vehicleName}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.regNumber} • {item.driverName}
                      </div>
                    </td>

                    {/* Gross Income */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 font-mono-nums">
                        {formatINR(item.grossIncome)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.paymentMode}
                      </div>
                    </td>

                    {/* Trip Expenses */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 font-mono-nums">
                        {formatINR(item.tripExpenses)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.expenseBreakdown}
                      </div>
                    </td>

                    {/* Net Margin */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold font-mono-nums ${
                            item.netMargin >= 0 ? "text-blue-600" : "text-rose-600"
                          }`}
                        >
                          {item.netMargin >= 0 ? `+${formatINR(item.netMargin)}` : `-${formatINR(Math.abs(item.netMargin))}`}
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.marginPercent >= 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.marginPercent}%
                        </span>
                      </div>
                    </td>

                    {/* Audit Status */}
                    <td className="py-4 px-5 text-right">
                      {item.auditStatus === "reconciled" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Reconciled
                        </span>
                      )}
                      {item.auditStatus === "verified" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> On Road
                        </span>
                      )}
                      {item.auditStatus === "pending" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Working Pagination Footer */}
        {filteredRecords.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of{" "}
              {filteredRecords.length} records
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-[#18181B] text-white"
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
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Split Row: Fleet Profitability & Top Corridor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Fleet Segment Profitability */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fleet Vehicle Profitability
                </h3>
                <p className="text-xs text-slate-500">
                  Net earnings generated by top performing vehicles
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {vehicles.length} Fleet Units
              </span>
            </div>

            <div className="space-y-4 mt-5">
              {vehicleProfitability.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No vehicle performance data logged yet.
                </p>
              ) : (
                vehicleProfitability.map((vp) => {
                  const share =
                    grossRevenue > 0
                      ? Math.min(100, Math.max(5, Math.round((vp.gross / grossRevenue) * 100)))
                      : 0;
                  return (
                    <div
                      key={vp.name}
                      className="bg-slate-50/70 p-4 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{vp.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {vp.count} trip{vp.count === 1 ? "" : "s"} dispatched
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 font-mono-nums">
                            {formatINR(vp.net)}
                          </div>
                          <div className="text-[10px] text-blue-600 font-semibold">
                            {share}% of Total Gross
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Strategic Route Metrics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Corridor Performance &amp; Analytics
                </h3>
                <p className="text-xs text-slate-500">
                  Key route density and financial health indicators
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              {/* Card 1: Top Earning Corridor */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Top Earning Corridor
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {topCorridor.route}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {topCorridor.volume > 0 ? formatINR(topCorridor.volume) : "₹0"} Gross Volume • {topCorridor.count} Dispatches
                  </div>
                </div>
              </div>

              {/* Card 2: Operating Efficiency */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Net Operating Margin Yield
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {overallMarginPercent}% Margin
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Surplus of {formatINR(netProfitMargin)} retained from {formatINR(grossRevenue)} billed
                  </div>
                </div>
              </div>

              {/* Card 3: Active Fleet Utilization */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Fleet Utilization
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {vehicles.length} Vehicles In Registry
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {trips.filter((t) => t.status === "in_progress").length} currently active on road
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer */}
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
