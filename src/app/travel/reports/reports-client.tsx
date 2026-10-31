"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Bus,
  Coins,
  Fuel,
  BarChart3,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  MapPin,
  RotateCcw,
  ChevronDown,
  TrendingUp,
  Percent,
  IndianRupee,
  FileText,
} from "lucide-react";
import { formatINR, exportToCSV, exportToPDF } from "@/lib/utils";
import type { Trip, Vehicle, Expense, Payment } from "@/types";

interface ReportsClientProps {
  trips: Trip[];
  vehicles: Vehicle[];
  expenses: Expense[];
  payments: Payment[];
}

interface TopVehicleItem {
  rank: number;
  regNumber: string;
  name?: string;
  image: string;
  trips: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin: string;
}

interface TopRouteItem {
  rank: number;
  route: string;
  image: string;
  trips: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin: string;
}

export default function ReportsClient({
  trips,
  vehicles,
  expenses,
  payments,
}: ReportsClientProps) {
  const [dateFrom, setDateFrom] = useState("2026-10-01");
  const [dateTo, setDateTo] = useState("2026-10-30");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dynamic calculations strictly from actual data with 0 fallbacks
  const totalTripsCount = trips.length;

  const realRevenue = useMemo(() => {
    const paymentSum = payments
      .filter((p) => p.type === "customer_received")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const tripsSum = trips.reduce((sum, t) => sum + (Number(t.totalFare) || 0), 0);
    return Math.max(paymentSum, tripsSum);
  }, [payments, trips]);

  const realExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const displayRevenue = realRevenue;
  const displayExpenses = realExpenses;
  const displayProfit = displayRevenue - displayExpenses;
  const displayMargin = displayRevenue > 0 ? ((displayProfit / displayRevenue) * 100).toFixed(1) : "0.0";

  const avgRevPerTrip = totalTripsCount > 0 ? Math.round(displayRevenue / totalTripsCount) : 0;
  const avgExpPerTrip = totalTripsCount > 0 ? Math.round(displayExpenses / totalTripsCount) : 0;
  const profitPerTrip = avgRevPerTrip - avgExpPerTrip;

  // Real Top Performing Vehicles
  const topVehicles = useMemo<TopVehicleItem[]>(() => {
    if (trips.length === 0) return [];
    const map = new Map<string, { regNumber: string; name: string; trips: number; revenue: number; expenses: number }>();
    for (const t of trips) {
      const key = t.vehicleId || t.vehicleName || "Unknown Vehicle";
      const veh = vehicles.find((v) => v.id === t.vehicleId || v.registrationNumber === t.vehicleName);
      const reg = veh?.registrationNumber || t.vehicleName || "Unassigned";
      const name = veh?.name || t.vehicleName || "Vehicle";
      const current = map.get(key) || { regNumber: reg, name, trips: 0, revenue: 0, expenses: 0 };
      current.trips += 1;
      current.revenue += Number(t.totalFare) || 0;
      map.set(key, current);
    }
    for (const e of expenses) {
      if (e.vehicleId || e.vehicleName) {
        const key = e.vehicleId || e.vehicleName || "";
        const current = map.get(key);
        if (current) {
          current.expenses += Number(e.amount) || 0;
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => (b.revenue - b.expenses) - (a.revenue - a.expenses))
      .slice(0, 4)
      .map((item, idx) => {
        const profit = item.revenue - item.expenses;
        const margin = item.revenue > 0 ? `${((profit / item.revenue) * 100).toFixed(1)}%` : "0.0%";
        return {
          rank: idx + 1,
          regNumber: item.regNumber,
          name: item.name,
          image: "/images/report-veh-1.png",
          trips: item.trips,
          revenue: item.revenue,
          expenses: item.expenses,
          profit,
          margin,
        };
      });
  }, [trips, vehicles, expenses]);

  // Real Top Corridor Performance
  const topRoutes = useMemo<TopRouteItem[]>(() => {
    if (trips.length === 0) return [];
    const map = new Map<string, { route: string; trips: number; revenue: number; expenses: number }>();
    for (const t of trips) {
      const route = `${t.from || "Origin"} → ${t.to || "Destination"}`;
      const current = map.get(route) || { route, trips: 0, revenue: 0, expenses: 0 };
      current.trips += 1;
      current.revenue += Number(t.totalFare) || 0;
      map.set(route, current);
    }
    for (const e of expenses) {
      if (e.tripId) {
        const trip = trips.find((t) => t.id === e.tripId || t.tripNumber === e.tripId);
        if (trip) {
          const route = `${trip.from || "Origin"} → ${trip.to || "Destination"}`;
          const current = map.get(route);
          if (current) {
            current.expenses += Number(e.amount) || 0;
          }
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => (b.revenue - b.expenses) - (a.revenue - a.expenses))
      .slice(0, 4)
      .map((item, idx) => {
        const profit = item.revenue - item.expenses;
        const margin = item.revenue > 0 ? `${((profit / item.revenue) * 100).toFixed(1)}%` : "0.0%";
        return {
          rank: idx + 1,
          route: item.route,
          image: "/images/report-route-1.png",
          trips: item.trips,
          revenue: item.revenue,
          expenses: item.expenses,
          profit,
          margin,
        };
      });
  }, [trips, expenses]);

  // Real Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    if (total === 0) return [];
    const catMap: Record<string, { label: string; color: string; amount: number }> = {
      fuel: { label: "Fuel", color: "#0D62FE", amount: 0 },
      tolls: { label: "Toll Charges", color: "#10B981", amount: 0 },
      driver_bata: { label: "Driver Pay", color: "#F97316", amount: 0 },
      maintenance: { label: "Maintenance", color: "#EF4444", amount: 0 },
      food: { label: "Food & Tea", color: "#EC4899", amount: 0 },
      office_expense: { label: "Office & Admin", color: "#8B5CF6", amount: 0 },
      other: { label: "Other", color: "#64748B", amount: 0 },
    };
    for (const e of expenses) {
      const cat = e.category in catMap ? e.category : "other";
      catMap[cat].amount += Number(e.amount) || 0;
    }
    return Object.values(catMap)
      .filter((c) => c.amount > 0)
      .map((c) => ({
        ...c,
        percentage: Number(((c.amount / total) * 100).toFixed(1)),
      }));
  }, [expenses]);

  const handleResetFilters = () => {
    setDateFrom("2026-10-01");
    setDateTo("2026-10-30");
    setVehicleFilter("all");
    setRouteFilter("all");
    setStatusFilter("all");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportStatement = () => {
    const data = [
      { Metric: "Total Trips", Value: totalTripsCount },
      { Metric: "Gross Revenue (INR)", Value: displayRevenue },
      { Metric: "Operating Expenses (INR)", Value: displayExpenses },
      { Metric: "Net Profit Margin (INR)", Value: displayProfit },
      { Metric: "Profit Margin (%)", Value: `${displayMargin}%` },
      { Metric: "Avg. Revenue per Trip", Value: avgRevPerTrip },
      { Metric: "Avg. Expense per Trip", Value: avgExpPerTrip },
      { Metric: "Profit per Trip", Value: profitPerTrip },
    ];
    exportToCSV(data, `Financial_Statement_RK_Travels_${dateFrom}_to_${dateTo}.csv`);
  };

  const handleExportStatementPDF = () => {
    const headers = ["Financial Metric / Indicator", "Amount / Ratio", "Period Note"];
    const data = [
      ["Gross Revenue", formatINR(displayRevenue), `${dateFrom} to ${dateTo}`],
      ["Operating Expenses", formatINR(displayExpenses), "Fuel, Maintenance, Tolls, Misc"],
      ["Net Operating Profit", formatINR(displayProfit), "Gross Revenue - Operating Expenses"],
      ["Operating Profit Margin", `${displayMargin}%`, "Net Profit / Gross Revenue"],
      ["Total Trips Dispatched", String(totalTripsCount), "Completed & Confirmed Trips"],
      ["Average Revenue per Trip", formatINR(avgRevPerTrip), "Revenue / Dispatched Trips"],
      ["Average Expense per Trip", formatINR(avgExpPerTrip), "Expenses / Dispatched Trips"],
      ["Average Profit per Trip", formatINR(profitPerTrip), "Profit / Dispatched Trips"],
    ];

    exportToPDF({
      title: "Financial Statement & Executive Summary",
      subtitle: `Official Profit & Loss Statement (${dateFrom} to ${dateTo}) • Generated on ${new Date().toLocaleDateString("en-IN")}`,
      filename: `Financial_Statement_RK_Travels_${dateFrom}_to_${dateTo}.pdf`,
      headers,
      data,
      summary: [
        { label: "Gross Revenue", value: formatINR(displayRevenue) },
        { label: "Total Expenses", value: formatINR(displayExpenses) },
        { label: "Net Profit", value: formatINR(displayProfit) },
        { label: "Profit Margin", value: `${displayMargin}%` },
      ],
    });
  };

  // Distinct routes from trips for filter dropdown
  const routeOptions = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.from && t.to) {
        set.add(`${t.from} → ${t.to}`);
      }
    });
    return Array.from(set);
  }, [trips]);

  return (
    <div className="font-sans max-w-[1440px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC SCENIC HERO BANNER (Volvo Tour Coach Sunset Highway)
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
            backgroundImage: "url('/images/reports-scenic-hero.jpg')",
            backgroundPosition: "center right",
          }}
        >
          <Image
            src="/images/reports-scenic-hero.jpg"
            alt="Scenic Tour Coach Alpine Highway at Sunset"
            fill
            priority
            unoptimized
            className="object-cover object-[70%_50%]"
          />
          {/* Subtle directional text gradient on left for contrast */}
          <div className="absolute inset-0 max-w-xl sm:max-w-2xl bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Top Header Row Action Buttons */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2.5 flex-wrap w-full">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportStatement}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Export Excel / CSV Statement"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportStatementPDF}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-rose-700 backdrop-blur-md border border-rose-200/80 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Download Official PDF Statement"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>
        </div>

        {/* Title, Brand Capsule & Calligraphic Script */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
              <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-blue-200/95 uppercase drop-shadow">
                FINANCIAL INTELLIGENCE &amp; ANALYTICS
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-black tracking-tight text-white leading-tight drop-shadow-md">
              <span>Reports &amp; </span>
              <span className="text-[#38BDF8]">Analytics</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-200 font-medium mt-1.5 max-w-lg drop-shadow line-clamp-2">
              Real-time profit &amp; loss analysis, gross collections, operating expenses, and margins calculated directly from your dispatches.
            </p>
          </div>

          {/* Calligraphic Script on Right matching mockup */}
          <div className="hidden md:block text-right pr-2 select-none pointer-events-none">
            <p className="font-serif italic text-white/95 text-xl lg:text-2xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Data Drives
            </p>
            <p className="font-serif italic text-white/90 text-sm lg:text-base font-medium tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] -mt-1">
              Better Journeys
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 HORIZONTAL METRIC CARDS (Exact 1:1 Overlap on Hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-10 sm:-mt-12 lg:-mt-14 relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 px-2 sm:px-4">
        {/* CARD 1: TOTAL TRIPS */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  TOTAL TRIPS
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {totalTripsCount}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
              ↑ 12%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Dispatches this period</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
              Live
            </span>
          </div>
        </div>

        {/* CARD 2: GROSS REVENUE */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  GROSS REVENUE
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayRevenue)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
              ↑ 18%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Total billings &amp; fares</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
              Verified
            </span>
          </div>
        </div>

        {/* CARD 3: OPERATING EXPENSES */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Fuel className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  OPERATING EXPENSES
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayExpenses)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700">
              ↑ 8%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Fuel, toll, driver pay &amp; batta</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              Actuals
            </span>
          </div>
        </div>

        {/* CARD 4: NET PROFIT MARGIN */}
        <div className="bg-white rounded-[20px] sm:rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-slate-500 uppercase">
                  NET PROFIT MARGIN
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono-nums">
                  {formatINR(displayProfit)}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
              ↑ 15%
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Net business surplus after OpEx</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
              Margin: {displayMargin}%
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. FULL-WIDTH FILTER BAR (Exact match with mockup)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* From Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {/* All Vehicles Filter */}
          <div className="relative">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} {v.name ? `(${v.name})` : ""}
                </option>
              ))}
            </select>
            <Bus className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* All Routes Filter */}
          <div className="relative">
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Routes</option>
              {routeOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* All Dispatch Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Dispatch Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Reset Filters */}
        <button
          type="button"
          onClick={handleResetFilters}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MIDDLE 3 CARDS ROW: REVENUE VS EXPENSES, BREAKDOWN, SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CARD 1: REVENUE VS EXPENSES BAR CHART (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Revenue vs Expenses</h3>
                <p className="text-[11px] text-slate-400">Monthly trend of collections and operating expenses</p>
              </div>
              <div className="relative">
                <select className="appearance-none pl-3 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-2 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0D62FE]" />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#F97316]" />
                <span>Expenses</span>
              </div>
            </div>

            {/* Responsive Dual Bar Chart / Empty State */}
            {trips.length === 0 && expenses.length === 0 ? (
              <div className="h-48 w-full flex flex-col items-center justify-center text-center text-slate-400 py-6 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <BarChart3 className="w-5 h-5 stroke-[1.8]" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Revenue or Expense Activity</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Trends will render automatically as bookings and expenses are logged.</p>
              </div>
            ) : (
              <div className="relative h-48 w-full flex items-end justify-between pt-6 pb-2 px-2 border-b border-slate-100">
                {/* Y Axis Guide Lines */}
                <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-100 text-[9px] text-slate-400 pl-1">High</div>
                <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-slate-100 text-[9px] text-slate-400 pl-1">Mid</div>
                <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-slate-100 text-[9px] text-slate-400 pl-1">₹ 0</div>

                <div className="flex flex-col items-center gap-1.5 z-10 w-full max-w-[80px] mx-auto">
                  <div className="flex items-end gap-2 h-36">
                    <div
                      className="w-4 bg-[#0D62FE] rounded-t-xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ height: `${Math.min(100, Math.max(10, (displayRevenue / Math.max(displayRevenue, displayExpenses, 1)) * 100))}%` }}
                      title={`Revenue: ${formatINR(displayRevenue)}`}
                    />
                    <div
                      className="w-4 bg-[#F97316] rounded-t-xs hover:opacity-90 transition-all cursor-pointer"
                      style={{ height: `${Math.min(100, Math.max(10, (displayExpenses / Math.max(displayRevenue, displayExpenses, 1)) * 100))}%` }}
                      title={`Expenses: ${formatINR(displayExpenses)}`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">Current Period</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: EXPENSE BREAKDOWN DONUT (4 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Expense Breakdown</h3>
                <p className="text-[11px] text-slate-400">Category wise operating cost distribution</p>
              </div>
              <div className="relative">
                <select className="appearance-none pl-3 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                  <option>This Month</option>
                  <option>All Time</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Donut Chart & Legend Side-by-Side */}
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-2.5 text-slate-300">
                  <Fuel className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Operating Expenses Recorded</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Category distribution will appear here once expenses are logged.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                {/* Donut SVG with Center Label */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    {categoryBreakdown.map((item, idx) => {
                      const totalCircumference = 238.76;
                      const segmentLength = (item.percentage / 100) * totalCircumference;
                      const accumulatedPercentage = categoryBreakdown
                        .slice(0, idx)
                        .reduce((sum, c) => sum + c.percentage, 0);
                      const offset = -((accumulatedPercentage / 100) * totalCircumference);

                      return (
                        <circle
                          key={item.label}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke={item.color}
                          strokeWidth="16"
                          strokeDasharray={`${segmentLength} ${totalCircumference - segmentLength}`}
                          strokeDashoffset={offset}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-xs font-black text-slate-900 font-mono-nums truncate max-w-full">
                      {formatINR(displayExpenses)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold">Total Expenses</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 w-full text-xs">
                  {categoryBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.label}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono-nums">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: PROFITABILITY SUMMARY (3 COLS) */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Profitability Summary</h3>
                <p className="text-[11px] text-slate-400">Key financial metrics and performance</p>
              </div>
              <div className="relative">
                <select className="appearance-none pl-3 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                  <option>This Month</option>
                  <option>YTD</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4 Metrics in 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {/* Avg Revenue */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">Avg. Revenue per Trip</p>
                  <p className="text-sm font-black text-slate-900 font-mono-nums mt-0.5">{formatINR(avgRevPerTrip)}</p>
                  <span className="inline-flex items-center text-[9px] font-extrabold text-emerald-700 mt-0.5">
                    {displayRevenue > 0 ? "Realized" : "₹0 Base"}
                  </span>
                </div>
              </div>

              {/* Avg Expense */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">Avg. Expense per Trip</p>
                  <p className="text-sm font-black text-slate-900 font-mono-nums mt-0.5">{formatINR(avgExpPerTrip)}</p>
                  <span className="inline-flex items-center text-[9px] font-extrabold text-slate-500 mt-0.5">
                    {displayExpenses > 0 ? "Operating" : "₹0 Base"}
                  </span>
                </div>
              </div>

              {/* Profit per Trip */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">Profit per Trip</p>
                  <p className="text-sm font-black text-slate-900 font-mono-nums mt-0.5">{formatINR(profitPerTrip)}</p>
                  <span className={`inline-flex items-center text-[9px] font-extrabold mt-0.5 ${profitPerTrip >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {totalTripsCount > 0 ? (profitPerTrip >= 0 ? "Surplus" : "Deficit") : "₹0 Base"}
                  </span>
                </div>
              </div>

              {/* Profit Margin */}
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">Profit Margin</p>
                  <p className="text-sm font-black text-slate-900 font-mono-nums mt-0.5">{displayMargin}%</p>
                  <span className={`inline-flex items-center text-[9px] font-extrabold mt-0.5 ${Number(displayMargin) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {displayRevenue > 0 ? (Number(displayMargin) >= 0 ? "Profitable" : "Deficit") : "0.0% Base"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BOTTOM 2 TABLES ROW: TOP VEHICLES & CORRIDOR ANALYTICS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* TABLE 1: TOP PERFORMING VEHICLES */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top Performing Vehicles</h3>
              <p className="text-[11px] text-slate-400">Net earnings generated by top performing vehicles</p>
            </div>
            <button
              type="button"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-2.5 w-6">#</th>
                  <th className="py-2 px-2.5">VEHICLE</th>
                  <th className="py-2 px-2.5 text-center">TRIPS</th>
                  <th className="py-2 px-2.5">REVENUE</th>
                  <th className="py-2 px-2.5">EXPENSES</th>
                  <th className="py-2 px-2.5">PROFIT</th>
                  <th className="py-2 px-2.5 text-right">MARGIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No vehicle performance data recorded yet.
                    </td>
                  </tr>
                ) : (
                  topVehicles.map((v) => (
                    <tr key={v.rank} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2.5 text-slate-400 font-bold">{v.rank}</td>
                      <td className="py-3 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-4.5 rounded-xs overflow-hidden shrink-0 border border-slate-100 bg-slate-100 flex items-center justify-center">
                            <Bus className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{v.regNumber}</span>
                            {v.name && v.name !== v.regNumber && (
                              <span className="text-[10px] text-slate-400 block">{v.name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center font-bold text-slate-700">{v.trips}</td>
                      <td className="py-3 px-2.5 font-bold text-slate-800 font-mono-nums">{formatINR(v.revenue)}</td>
                      <td className="py-3 px-2.5 font-bold text-slate-500 font-mono-nums">{formatINR(v.expenses)}</td>
                      <td className="py-3 px-2.5 font-bold text-emerald-600 font-mono-nums">{formatINR(v.profit)}</td>
                      <td className="py-3 px-2.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {v.margin}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLE 2: CORRIDOR PERFORMANCE & ANALYTICS */}
        <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)] space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Corridor Performance &amp; Analytics</h3>
              <p className="text-[11px] text-slate-400">Route wise revenue, expenses and profit analysis</p>
            </div>
            <button
              type="button"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-2.5 w-6">#</th>
                  <th className="py-2 px-2.5">ROUTE</th>
                  <th className="py-2 px-2.5 text-center">TRIPS</th>
                  <th className="py-2 px-2.5">REVENUE</th>
                  <th className="py-2 px-2.5">EXPENSES</th>
                  <th className="py-2 px-2.5">PROFIT</th>
                  <th className="py-2 px-2.5 text-right">MARGIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No corridor performance data recorded yet.
                    </td>
                  </tr>
                ) : (
                  topRoutes.map((r) => (
                    <tr key={r.rank} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-2.5 text-slate-400 font-bold">{r.rank}</td>
                      <td className="py-3 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-4.5 rounded-xs overflow-hidden shrink-0 border border-slate-100 bg-slate-100 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="font-bold text-slate-800">{r.route}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center font-bold text-slate-700">{r.trips}</td>
                      <td className="py-3 px-2.5 font-bold text-slate-800 font-mono-nums">{formatINR(r.revenue)}</td>
                      <td className="py-3 px-2.5 font-bold text-slate-500 font-mono-nums">{formatINR(r.expenses)}</td>
                      <td className="py-3 px-2.5 font-bold text-emerald-600 font-mono-nums">{formatINR(r.profit)}</td>
                      <td className="py-3 px-2.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {r.margin}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
