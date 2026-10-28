"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  UserCheck,
  Wrench,
  Calendar,
  ArrowUpRight,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Fuel,
  ShieldCheck,
  CreditCard,
  MapPin,
  Building2,
  Users,
  Check,
  MoreVertical,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { DashboardMetrics, Trip } from "@/types";

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  initialTrips: Trip[];
}

export default function DashboardClient({
  initialMetrics,
  initialTrips,
}: DashboardClientProps) {
  const metrics = initialMetrics;

  // Interactive UI states
  const [activeDay, setActiveDay] = useState("Wed 24");
  const [fastagOpen, setFastagOpen] = useState(true);
  const [pipelineFilter, setPipelineFilter] = useState<"active" | "all" | "completed">("active");
  const [isPlayingTimer, setIsPlayingTimer] = useState(false);
  const [turnaroundSeconds, setTurnaroundSeconds] = useState(155); // 02:35

  // Priority Dispatch tasks interactive state
  const [dispatchTasks, setDispatchTasks] = useState([
    {
      id: "dp-1",
      icon: Car,
      title: "Apex Logistics (#TR-8921)",
      subtitle: "En Route • 08:30",
      completed: true,
    },
    {
      id: "dp-2",
      icon: MapPin,
      title: "Dr. Sunita Deshmukh",
      subtitle: "Airport Drop • Confirmed",
      completed: true,
    },
    {
      id: "dp-3",
      icon: Building2,
      title: "Reliance Tech Parks",
      subtitle: "Payment Due: ₹14,500",
      completed: false,
    },
    {
      id: "dp-4",
      icon: Users,
      title: "Kavita Sharma & Family",
      subtitle: "Shirdi Outstation • ₹9,800",
      completed: false,
    },
    {
      id: "dp-5",
      icon: ShieldCheck,
      title: "Driver Fitness & PUC Check",
      subtitle: "Batch // B-4 • 17:00 IST",
      completed: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setDispatchTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedTasksCount = dispatchTasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 pb-6">
      {/* ─── LIVE DECK HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>FLEET OPERATIONS LIVE DECK</span>
          </div>
          <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 leading-tight font-display">
            Welcome back, RK Travel Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Manage Trips, Vehicles, Payments and More...
          </p>
        </div>

        {/* Top Action Pills */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/travel/payments"
            prefetch={true}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 text-xs font-semibold border border-slate-300/50 shadow-xs transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-slate-700" />
            <span>Record Payment</span>
          </Link>
          <Link
            href="/travel/trips"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Trip</span>
          </Link>
        </div>
      </div>

      {/* ─── 8 KPI BENTO CARDS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Trips */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL TRIPS
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.totalTrips || 142}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">All completed & active trips</span>
            <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
              +12%
            </span>
          </div>
        </div>

        {/* 2. Total Collection */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL COLLECTION
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.totalCollection ? formatINR(metrics.totalCollection) : "₹4,85,200"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Customer receipts & advances</span>
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              Collected
            </span>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TOTAL EXPENSES
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.totalExpenses ? formatINR(metrics.totalExpenses) : "₹1,92,400"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Fuel, maintenance & operations</span>
            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              39.6% Exp.
            </span>
          </div>
        </div>

        {/* 4. Profit / Loss */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              PROFIT / LOSS
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-[#2563EB] font-mono-nums tracking-tight">
              {metrics.profitLoss ? formatINR(metrics.profitLoss) : "₹2,92,800"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Net positive margin</span>
            <span className="bg-[#2563EB] text-white font-semibold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Profitable
            </span>
          </div>
        </div>

        {/* 5. Pending Customer Payment */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              PENDING CUSTOMER PAYMENT
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.pendingCustomerPayment ? formatINR(metrics.pendingCustomerPayment) : "₹64,500"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Outstanding receivables</span>
            <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              5 Invoices
            </span>
          </div>
        </div>

        {/* 6. Driver Payment Pending */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              DRIVER PAYMENT PENDING
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.driverPaymentPending ? formatINR(metrics.driverPaymentPending) : "₹28,000"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Payable to drivers</span>
            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              Due Friday
            </span>
          </div>
        </div>

        {/* 7. Vehicle Service Due */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              VEHICLE SERVICE DUE
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.vehicleServiceDue || 4}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Vehicles requiring service</span>
            <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
              2 Urgent
            </span>
          </div>
        </div>

        {/* 8. Today Trips */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.06)] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TODAY TRIPS
            </span>
            <div className="w-8 h-8 rounded-full bg-[#18181B] text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
              {metrics.todayTrips || 18}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500">Scheduled for today</span>
            <span className="bg-[#2563EB] text-white font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
              11 Active
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3-COLUMN TACTICAL BENTO GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ════ LEFT COLUMN (3 cols) ════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Member Spotlight Card */}
          <div className="relative rounded-[28px] overflow-hidden border border-slate-200/90 shadow-sm bg-slate-900 h-[340px] group">
            <img
              src="/images/member_spotlight.jpg"
              alt="Member Spotlight"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Top Bar Overlay */}
            <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10">
              <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                Member Spotlight
              </span>
              <div className="bg-white/90 backdrop-blur-md text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                <span>&lt;</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>&gt;</span>
              </div>
            </div>

            {/* Bottom Floating Frosted Glass Card */}
            <div className="absolute bottom-3 inset-x-3 bg-black/60 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-white flex items-center justify-between z-10">
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Ananya Roy</h2>
                <p className="text-[10px] text-slate-300 mt-0.5">Premium Voyageur • Corporate Pass</p>
              </div>
              <div className="bg-white/20 px-2.5 py-1 rounded-xl text-xs font-bold font-mono-nums text-white">
                ₹ 32,400
              </div>
            </div>
          </div>

          {/* Quick Accordion Stack */}
          <div className="space-y-2.5">
            {/* 1. Vehicle Telematics */}
            <button
              type="button"
              className="w-full bg-slate-100/90 hover:bg-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Fuel className="w-4 h-4 text-slate-600" />
                <span>Vehicle Telematics &amp; Fuel</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* 2. Fastag & Toll Wallets (Expanded) */}
            <div className="bg-slate-100/90 rounded-2xl p-3.5 transition-all">
              <div
                className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer"
                onClick={() => setFastagOpen(!fastagOpen)}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span>Fastag &amp; Toll Wallets</span>
                </div>
                {fastagOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>

              {fastagOpen && (
                <div className="mt-3 bg-white rounded-xl p-3 border border-slate-200/90 flex items-center justify-between shadow-2xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      MH-01
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Expressway Pass Active
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Auto-recharged 2h ago</p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-700" />
                </div>
              )}
            </div>

            {/* 3. Weekly Driver Disbursals */}
            <button
              type="button"
              className="w-full bg-slate-100/90 hover:bg-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-slate-600" />
                <span>Weekly Driver Disbursals</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* 4. Corporate SLAs & Tenders */}
            <button
              type="button"
              className="w-full bg-slate-100/90 hover:bg-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Corporate SLAs &amp; Tenders</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* ════ MIDDLE COLUMN (6 cols) ════ */}
        <div className="lg:col-span-6 space-y-4">
          {/* Top 2 Cards: Fleet Transit & Turnaround Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card A: Fleet Transit */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Fleet Transit</span>
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="my-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono-nums">6.1</span>
                  <span className="text-xl font-bold text-slate-900">k</span>
                  <span className="text-sm font-bold text-slate-900 ml-1">km</span>
                </div>
                <span className="text-[11px] text-slate-400">Road time this week</span>
              </div>

              {/* Bar Chart with Thursday highlighted */}
              <div className="relative pt-6 pb-2">
                <div className="flex items-end justify-between gap-2 h-28 px-1">
                  {/* Sunday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-200 rounded-full h-[35%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">S</span>
                  </div>
                  {/* Monday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-800 rounded-full h-[55%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">M</span>
                  </div>
                  {/* Tuesday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-800 rounded-full h-[70%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">T</span>
                  </div>
                  {/* Wednesday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-800 rounded-full h-[60%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">W</span>
                  </div>
                  {/* Thursday (Active) */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end relative">
                    <div className="absolute -top-6 bg-[#2563EB] text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                      1,420 km
                    </div>
                    <div className="w-3.5 bg-[#2563EB] rounded-full h-[95%]" />
                    <span className="text-[10px] text-slate-900 font-bold mt-2">T</span>
                  </div>
                  {/* Friday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-200 rounded-full h-[45%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">F</span>
                  </div>
                  {/* Saturday */}
                  <div className="flex flex-col items-center flex-1 h-full justify-end">
                    <div className="w-2.5 bg-slate-200 rounded-full h-[30%]" />
                    <span className="text-[10px] text-slate-400 font-medium mt-2">S</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Turnaround Time */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Turnaround Time</span>
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Circular Gauge Dial */}
              <div className="my-3 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* Dotted border ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300" />
                  <div className="text-center z-10">
                    <span className="text-2xl font-extrabold text-slate-900 font-mono-nums tracking-tight">
                      02:35
                    </span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      AVG TURNAROUND
                    </p>
                  </div>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPlayingTimer(!isPlayingTimer)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                  title="Play"
                >
                  {isPlayingTimer ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlayingTimer(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTurnaroundSeconds(155)}
                  className="w-8 h-8 rounded-full bg-[#18181B] text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Card: September 2025 Schedule & Timeline */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] space-y-4">
            {/* Header with Month Selector */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="cursor-pointer hover:text-slate-900">&lt; August</span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">September 2025</h2>
              <span className="cursor-pointer hover:text-slate-900">October &gt;</span>
            </div>

            {/* Horizontal Day Strip */}
            <div className="grid grid-cols-6 gap-2 text-center">
              {[
                { day: "Mon", date: "22" },
                { day: "Tue", date: "23" },
                { day: "Wed", date: "24", active: true },
                { day: "Thu", date: "25" },
                { day: "Fri", date: "26" },
                { day: "Sat", date: "27" },
              ].map((item) => (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => setActiveDay(`${item.day} ${item.date}`)}
                  className={`py-2 px-1 rounded-2xl flex flex-col items-center transition-all ${
                    activeDay === `${item.day} ${item.date}` || item.active
                      ? "bg-[#2563EB] text-white shadow-sm"
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className="text-[10px] font-medium">{item.day}</span>
                  <span className="text-sm font-bold font-mono-nums mt-0.5">{item.date}</span>
                </button>
              ))}
            </div>

            {/* Timeline Items */}
            <div className="space-y-3 pt-2">
              {/* Timeline Row 1: 08:00 am */}
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-slate-400 w-16 pt-3">08:00 am</span>
                <div className="flex-1 bg-[#181F2A] text-white p-3.5 rounded-2xl border border-slate-700/60 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Mumbai ⇄ Pune Expressway Dispatches
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      8 units en route • Shift Handover Completed
                    </p>
                  </div>
                  {/* Overlapping Avatars */}
                  <div className="flex -space-x-2 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-blue-600 border border-[#181F2A] flex items-center justify-center text-[9px] font-bold text-white">
                      VK
                    </span>
                    <span className="w-6 h-6 rounded-full bg-indigo-600 border border-[#181F2A] flex items-center justify-center text-[9px] font-bold text-white">
                      AR
                    </span>
                    <span className="w-6 h-6 rounded-full bg-slate-700 border border-[#181F2A] flex items-center justify-center text-[9px] font-bold text-white">
                      +6
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Row 2: 10:00 am */}
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-slate-400 w-16 pt-3">10:00 am</span>
                <div className="flex-1 bg-[#FAF7F2] border border-amber-200/70 p-3.5 rounded-2xl shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Nashik Wine Corridor Shuttle (VIP Innova Fleet)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Passenger boarding verification at Dadar Terminal
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-xl shrink-0">
                    Scheduled (3 Cabs)
                  </span>
                </div>
              </div>

              {/* Timeline Row 3: 11:30 am */}
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-slate-400 w-16 pt-2">11:30 am</span>
                <div className="flex-1 bg-slate-100 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-600">
                  <span className="text-[11px] font-medium">
                    Inter-state Bus Maintenance Window • Thane Workshop Hub
                  </span>
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN (3 cols) ════ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card: Trip Pipeline */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Trip Pipeline</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Daily quota fulfillment</p>
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-mono-nums">88%</span>
            </div>

            {/* Segmented Toggle Pills */}
            <div className="bg-slate-100 p-1 rounded-full flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setPipelineFilter("active")}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all ${
                  pipelineFilter === "active"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ACTIVE
              </button>
              <button
                type="button"
                onClick={() => setPipelineFilter("all")}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all ${
                  pipelineFilter === "all"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setPipelineFilter("completed")}
                className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all ${
                  pipelineFilter === "completed"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                QUEUED
              </button>
            </div>

            {/* Pipeline Percentages */}
            <div className="grid grid-cols-3 text-center pt-1 border-t border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400">Dispatched</p>
                <p className="text-xs font-bold text-slate-800 font-mono-nums mt-0.5">55%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">En Route</p>
                <p className="text-xs font-bold text-slate-800 font-mono-nums mt-0.5">28%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Queued</p>
                <p className="text-xs font-bold text-slate-800 font-mono-nums mt-0.5">17%</p>
              </div>
            </div>
          </div>

          {/* Dark Bento Pod: Priority Dispatch */}
          <div className="bg-[#181B20] text-white rounded-[28px] p-5 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold tracking-tight text-white">Priority Dispatch</h2>
              </div>
              <span className="text-xs font-mono-nums font-semibold text-slate-400">
                {completedTasksCount}/8
              </span>
            </div>

            {/* Dispatch Items List */}
            <div className="space-y-3">
              {dispatchTasks.map((task) => {
                const IconComponent = task.icon;
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {task.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Radio / Check Circle */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        task.completed
                          ? "bg-[#2563EB] text-white"
                          : "border-2 border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 space-y-2">
              <Link
                href="/travel/trips"
                prefetch={true}
                className="w-full py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dispatch New Vehicle</span>
              </Link>
              <Link
                href="/travel/payments"
                prefetch={true}
                className="w-full py-2 rounded-full bg-[#262A30] hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <CreditCard className="w-3 h-3 text-slate-400" />
                <span>Record Fast Settlement</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="pt-8 pb-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>© 2025 RK Travel Hub • Fleet Logistics &amp; Trip Dispatch Management System</p>
        <div className="flex items-center gap-2">
          <span>Active Cloud Sync</span>
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span className="font-medium text-slate-600">System Operational</span>
        </div>
      </footer>
    </div>
  );
}
