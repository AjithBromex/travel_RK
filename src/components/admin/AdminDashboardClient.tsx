'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  CreditCard,
  BookOpen,
  RotateCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { inr } from '@/lib/admin/modules';
import { fetchAdminRows, deleteAdminRow } from '@/lib/admin/admin-client-service';
import { subscribeDataChanged } from '@/lib/storage-sync';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsSyncing(true);
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
      console.warn('[AdminDashboard] Hydration notice:', e);
    } finally {
      isRefreshingRef.current = false;
      setIsSyncing(false);
    }
  };

  const handleDeleteTrip = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete dispatch: "${label}"?`)) return;
    setDeletingTripId(id);
    try {
      await deleteAdminRow('trips', id);
      await refresh();
    } catch (err) {
      console.error('[AdminDashboard] Delete dispatch failed:', err);
    } finally {
      setDeletingTripId(null);
    }
  };

  useEffect(() => {
    // 1. Fetch live data immediately on mount to keep desktop in sync with mobile
    refresh();

    // 2. Fetch live data whenever the browser tab gains focus
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);

    // 3. Fetch live data when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Real-time Firestore sync: instantly catch mobile deletions and additions
    let unsubTrips: (() => void) | null = null;
    try {
      if (db) {
        unsubTrips = onSnapshot(
          collection(db, 'trips'),
          () => {
            refresh();
          },
          (err) => {
            console.warn('[AdminDashboard] Realtime trips listener notice:', err);
          }
        );
      }
    } catch {}

    // 5. Cross-tab local sync listener
    let debounceTimer: NodeJS.Timeout;
    const unsub = subscribeDataChanged(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refresh();
      }, 400);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (unsubTrips) unsubTrips();
      clearTimeout(debounceTimer);
      unsub();
    };
  }, []);

  const { trips, payments, expenses, cash, reminders, vehicles } = data;

  const calculations = useMemo(() => {
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

    return {
      received,
      spent,
      billed,
      balance,
      profit,
      toCollect,
      today,
      due,
      live,
      availableVehicles,
      totalVehicles,
      fleetPct,
    };
  }, [trips, payments, expenses, cash, reminders, vehicles]);

  const {
    received,
    spent,
    billed,
    balance,
    profit,
    toCollect,
    today,
    due,
    live,
    availableVehicles,
    totalVehicles,
    fleetPct,
  } = calculations;

  return (
    <div className="font-sans w-full max-w-[1520px] mx-auto pb-8 sm:pb-12 space-y-4 sm:space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC GRADIENT HERO BANNER (RESPONSIVE & PURE VECTOR)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md min-h-[260px] sm:min-h-[300px] lg:min-h-[320px] flex flex-col justify-between p-4 sm:p-6 lg:p-8 pb-20 sm:pb-24 lg:pb-28 bg-gradient-to-br from-[#070D1E] via-[#0E1A38] to-[#122856]">
        {/* Soft Ambient Vector Glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
                              radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.35) 0%, transparent 60%)`,
          }}
        />

        {/* Top Floating Action Pill Buttons */}
        <div className="relative z-10 flex items-center justify-start sm:justify-end gap-2 flex-wrap w-full">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-white/70 shadow-2xs font-bold text-xs transition-colors shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-white/70 shadow-2xs font-bold text-xs transition-colors shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Payments</span>
          </Link>

          <Link
            href="/admin/cashbook"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-white/70 shadow-2xs font-bold text-xs transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Cash Book</span>
          </Link>

          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            <Bus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Manage Trips</span>
          </Link>
        </div>

        {/* Left Side: Title & Subtitle */}
        <div className="relative z-10 max-w-2xl mt-4 sm:mt-6">
          <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Administrative Governance</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Safe Journeys Stronger Connections
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-xl font-medium">
            Real-time fleet readiness, live dispatch tracking, collection settlements, and ledger balances.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FLOATING KPI METRICS CARDS GRID (FULL RESPONSIVE 2 -> 3 -> 6 COLS)
          ───────────────────────────────────────────────────────────── */}
      <div className="-mt-14 sm:-mt-16 lg:-mt-20 z-20 relative px-1 sm:px-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* Card 1: Cash in Hand */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Cash in Hand
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {inr(balance)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block truncate">
              Net Daybook
            </span>
          </div>

          {/* Card 2: Billed (Trips) */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Billings
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {inr(billed)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 inline-block truncate">
              {trips.length} Dispatches
            </span>
          </div>

          {/* Card 3: Collections */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Collections
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {inr(received)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-indigo-600 font-semibold mt-0.5 inline-block truncate">
              Verified Inflows
            </span>
          </div>

          {/* Card 4: To Collect */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                To Collect
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {inr(toCollect)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-amber-600 font-semibold mt-0.5 inline-block truncate">
              Outstanding
            </span>
          </div>

          {/* Card 5: Expenses */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Expenses
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {inr(spent)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-rose-600 font-semibold mt-0.5 inline-block truncate">
              Fuel &amp; Upkeep
            </span>
          </div>

          {/* Card 6: Net Profit */}
          <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Net Profit
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className={`text-base sm:text-lg lg:text-xl font-extrabold tracking-tight truncate ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {inr(profit)}
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 inline-block truncate">
              Inflows – Outflows
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. FLEET READINESS BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Fleet Readiness: {availableVehicles} of {totalVehicles} Vehicles Available ({fleetPct}%)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Vehicles ready for route dispatch.
            </p>
          </div>
        </div>

        <Link
          href="/admin/vehicles"
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors self-start sm:self-center shrink-0"
        >
          <span>Fleet Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TWO-COLUMN OPERATIONAL SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card A: Reminders Due */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                  Compliance Reminders
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Upcoming actions &amp; inspections</p>
              </div>
            </div>
            <Link
              href="/admin/reminders"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
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
                  className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {String(r.title)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                      {String(r.type || 'General')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold ${
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
              <p className="py-6 text-center text-xs text-slate-400 font-medium">
                All compliance documents are up to date.
              </p>
            )}
          </div>
        </div>

        {/* Card B: Live Trips */}
        <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                  Active &amp; Scheduled Dispatches
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Live booking status and passenger routes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refresh()}
                disabled={isSyncing}
                title="Refresh Dispatches"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
              >
                <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                <span>Sync</span>
              </button>
              <Link
                href="/admin/trips"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
              >
                View All
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {live.map((t) => {
              const tripId = String(t.id);
              const label = `${t.from || 'Origin'} ➔ ${t.to || 'Destination'}`;
              const isDeleting = deletingTripId === tripId;
              return (
                <div
                  key={tripId}
                  className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5 text-xs group hover:bg-slate-50/60 px-1 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">
                      {String(t.from)} → {String(t.to)}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                      {String(t.customer)} {t.vehicle ? `· ${t.vehicle}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-extrabold text-slate-900 block">
                          {inr(t.amount)}
                        </span>
                        {Number(t.totalExpenses || 0) > 0 && (
                          <span
                            className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1 rounded"
                            title={`Includes ${inr(Number(t.totalExpenses))} operating expenses added to trip amount`}
                          >
                            +{inr(Number(t.totalExpenses))}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        {String(t.startDate)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(tripId, label)}
                      disabled={isDeleting}
                      title="Delete dispatch"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {!live.length && (
              <p className="py-6 text-center text-xs text-slate-400 font-medium">
                No active or scheduled dispatches right now.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
