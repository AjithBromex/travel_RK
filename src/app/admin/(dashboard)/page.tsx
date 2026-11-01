import Link from 'next/link';
import {
  Wallet,
  Receipt,
  Bus,
  TrendingUp,
  AlertCircle,
  Clock,
  Car,
  Bell,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { listRows } from '@/lib/admin/store';
import { inr } from '@/lib/admin/modules';

export const dynamic = 'force-dynamic';

const sum = (
  rows: Record<string, unknown>[],
  f: (r: Record<string, unknown>) => boolean = () => true
) => rows.filter(f).reduce((s, r) => s + Number(r.amount || 0), 0);

export default function Dashboard() {
  const trips = listRows('trips');
  const payments = listRows('payments');
  const expenses = listRows('expenses');
  const cash = listRows('cashbook');
  const reminders = listRows('reminders');
  const vehicles = listRows('vehicles');

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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Admin Governance Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              Live Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Fleet operations, ledger balances, and booking settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Manage Trips</span>
          </Link>
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-slate-500" />
            <span>Payments</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Cash in Hand */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cash in Hand
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {inr(balance)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">
            Net Daybook Balance
          </span>
        </div>

        {/* Billed (Trips) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Trip Billings
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {inr(billed)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
            {trips.length} Total Dispatches
          </span>
        </div>

        {/* Total Received */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Collections
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {inr(received)}
          </p>
          <span className="text-[11px] text-indigo-600 font-medium mt-1 inline-block">
            Verified Inflows
          </span>
        </div>

        {/* Pending to Collect */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              To Collect
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {inr(toCollect)}
          </p>
          <span className="text-[11px] text-amber-600 font-medium mt-1 inline-block">
            Outstanding Due
          </span>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {inr(spent)}
          </p>
          <span className="text-[11px] text-rose-600 font-medium mt-1 inline-block">
            Fuel &amp; Upkeep
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Net Profit
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-lg sm:text-xl font-bold tracking-tight ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {inr(profit)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
            Inflow – Outflow
          </span>
        </div>
      </div>

      {/* Fleet Readiness Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Fleet Readiness: {availableVehicles} of {totalVehicles} Vehicles Available ({fleetPct}%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available vehicles ready for dispatch. Track fitness, permits, and active assignments.
            </p>
          </div>
        </div>

        <Link
          href="/admin/vehicles"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-center"
        >
          <span>View Fleet Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Two Column Grid: Reminders Due & Live Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminders Due Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Action Items &amp; Compliance Reminders
              </h2>
            </div>
            <Link
              href="/admin/reminders"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-1">
            {due.map((r) => {
              const isOverdue = String(r.dueDate) < today;
              return (
                <div
                  key={String(r.id)}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {String(r.title)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Type: {String(r.type || 'General')}
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
              <p className="py-6 text-center text-xs text-slate-400">
                No pending compliance reminders.
              </p>
            )}
          </div>
        </div>

        {/* Live & Upcoming Trips Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bus className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Active &amp; Scheduled Dispatches
              </h2>
            </div>
            <Link
              href="/admin/trips"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-1">
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
                  <span className="font-bold text-slate-900 block">
                    {inr(t.amount)}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                    {String(t.startDate)}
                  </span>
                </div>
              </div>
            ))}
            {!live.length && (
              <p className="py-6 text-center text-xs text-slate-400">
                No active or scheduled dispatches right now.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
