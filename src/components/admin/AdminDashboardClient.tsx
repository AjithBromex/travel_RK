'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Receipt,
  Bus,
  TrendingUp,
  Clock,
  Car,
  Bell,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  BookOpen,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { inr } from '@/lib/admin/modules';
import { fetchAdminRows } from '@/lib/admin/admin-client-service';
import { subscribeDataChanged } from '@/lib/storage-sync';

interface DashboardData {
  trips: Record<string, any>[];
  payments: Record<string, any>[];
  expenses: Record<string, any>[];
  cash: Record<string, any>[];
  reminders: Record<string, any>[];
  vehicles: Record<string, any>[];
}

interface Props {
  initialData: DashboardData;
}

const sum = (
  rows: Record<string, any>[],
  f: (r: Record<string, any>) => boolean = () => true
) => rows.filter(f).reduce((s, r) => s + Number(r.amount || 0), 0);

export default function AdminDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const [trips, payments, expenses, cash, reminders, vehicles] = await Promise.all([
        fetchAdminRows('trips'),
        fetchAdminRows('payments'),
        fetchAdminRows('expenses'),
        fetchAdminRows('cashbook'),
        fetchAdminRows('reminders'),
        fetchAdminRows('vehicles'),
      ]);
      setData({ trips, payments, expenses, cash, reminders, vehicles });
    } catch (e) {
      console.warn('[AdminDashboard] Hydration error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    const unsub = subscribeDataChanged(() => {
      refresh();
    });
    return () => unsub();
  }, []);

  const { trips, payments, expenses, cash, reminders, vehicles } = data;

  const received = sum(payments, (p) => p.status !== 'Pending');
  const spent = sum(expenses);
  const billed = sum(trips, (t) => t.status !== 'Cancelled');
  const balance =
    sum(cash, (c) => c.type === 'In') - sum(cash, (c) => c.type === 'Out');
  const profit = received - spent;
  const toCollect = Math.max(billed - received, 0);

  const today = new Date().toISOString().slice(0, 10);
  const due = reminders
    .filter((r) => r.status === 'Pending')
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 5);
  const live = trips
    .filter((t) => t.status === 'Ongoing' || t.status === 'Scheduled')
    .slice(0, 5);

  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length;
  const totalVehicles = vehicles.length;
  const fleetPct = totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0;

  return (
    <div className="font-sans max-w-[1520px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC GRADIENT HERO BANNER (PURE CSS, NO IMAGES)
             Matches the user UI scenic banner structure with overlapping KPI cards!
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-lg min-h-[290px] sm:min-h-[320px] lg:min-h-[340px] flex flex-col justify-between p-5 sm:p-7 lg:p-9 pb-24 sm:pb-28 lg:pb-32 bg-gradient-to-br from-[#070D1E] via-[#0E1A38] to-[#122856]">
        {/* Ambient SVG Grid & Glowing Mesh (Pure Vector & Gradients, No Images) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
                              radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.35) 0%, transparent 60%)`,
          }}
        />

        {/* Ambient Floating Decorative Accents */}
        <div className="absolute right-6 top-8 sm:top-12 opacity-15 pointer-events-none hidden sm:block">
          <div className="w-56 h-56 rounded-full border border-blue-400/40 blur-xs" />
          <div className="w-40 h-40 rounded-full border border-indigo-400/30 blur-2xs -mt-48 ml-8" />
        </div>

        {/* Top Floating Action Pill Buttons (Matching user UI Topbar/Hero pill buttons) */}
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 flex-wrap w-full">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60"
            title="Synchronize live operations"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Payments</span>
          </Link>

          <Link
            href="/admin/cashbook"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Cash Book</span>
          </Link>

          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Bus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Manage Trips</span>
          </Link>
        </div>

        {/* Left Side: Title & Subtitle */}
        <div className="relative z-10 max-w-2xl mt-4 sm:mt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wide uppercase mb-2 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Administrative Governance &amp; Operational Hub</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Safe Journeys Stronger Connections
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-xl font-medium">
            Real-time fleet readiness, live dispatch tracking, collection settlements, and ledger balances across all branches.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING KPI METRICS CARDS GRID (Overlapping Hero Banner)
             Matching user UI 4/6 card floating elevated grid style!
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-16 sm:-mt-20 lg:-mt-24 z-20 relative px-2 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Cash in Hand */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Cash in Hand
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {inr(balance)}
            </p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              Net Daybook Balance
            </span>
          </div>

          {/* Card 2: Billed (Trips) */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Trip Billings
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bus className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {inr(billed)}
            </p>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">
              {trips.length} Total Dispatches
            </span>
          </div>

          {/* Card 3: Collections */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Collections
              </span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {inr(received)}
            </p>
            <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-block">
              Verified Inflows
            </span>
          </div>

          {/* Card 4: To Collect */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                To Collect
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {inr(toCollect)}
            </p>
            <span className="text-[11px] text-amber-600 font-semibold mt-1 inline-block">
              Outstanding Dues
            </span>
          </div>

          {/* Card 5: Expenses */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Expenses
              </span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {inr(spent)}
            </p>
            <span className="text-[11px] text-rose-600 font-semibold mt-1 inline-block">
              Fuel &amp; Upkeep
            </span>
          </div>

          {/* Card 6: Net Profit */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Net Profit
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-lg sm:text-xl font-extrabold tracking-tight ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {inr(profit)}
            </p>
            <span className="text-[11px] text-slate-500 font-semibold mt-1 inline-block">
              Inflows – Outflows
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. FLEET READINESS BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Fleet Readiness: {availableVehicles} of {totalVehicles} Vehicles Available ({fleetPct}%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available vehicles ready for immediate route dispatch. Track registration, insurance &amp; fitness renewals.
            </p>
          </div>
        </div>

        <Link
          href="/admin/vehicles"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors self-start sm:self-center"
        >
          <span>Fleet Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TWO-COLUMN OPERATIONAL SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Reminders Due */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Compliance Reminders &amp; Actions
                </h2>
                <p className="text-[11px] text-slate-500">Due insurance, maintenance &amp; permits</p>
              </div>
            </div>
            <Link
              href="/admin/reminders"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {due.map((r) => {
              const isOverdue = String(r.dueDate) < today;
              return (
                <div
                  key={String(r.id)}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {String(r.title)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Category: {String(r.type || 'General')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isOverdue
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isOverdue ? 'Overdue · ' : 'Due · '}
                    {String(r.dueDate)}
                  </span>
                </div>
              );
            })}
            {!due.length && (
              <p className="py-8 text-center text-xs text-slate-400 font-medium">
                All regulatory compliance documents and action items are up to date.
              </p>
            )}
          </div>
        </div>

        {/* Card B: Live Trips */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Active &amp; Scheduled Dispatches
                </h2>
                <p className="text-[11px] text-slate-500">Live booking status and passenger routes</p>
              </div>
            </div>
            <Link
              href="/admin/trips"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {live.map((t) => (
              <div
                key={String(t.id)}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {String(t.from)} → {String(t.to)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Customer: {String(t.customer)} · Vehicle: {String(t.vehicle || 'Unassigned')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900 block">
                    {inr(t.amount)}
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {String(t.startDate)}
                  </span>
                </div>
              </div>
            ))}
            {!live.length && (
              <p className="py-8 text-center text-xs text-slate-400 font-medium">
                No active or scheduled dispatches right now.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
