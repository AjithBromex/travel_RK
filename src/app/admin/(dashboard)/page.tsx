'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Trash2,
  Eye,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  ExternalLink,
  Bus,
  Car,
  Wallet,
  Receipt,
  BookOpen,
  Bell,
} from 'lucide-react';

const COLS = ['trips', 'vehicles', 'payments', 'expenses', 'cashbook', 'reminders'] as const;
type Rec = { id: string; [k: string]: unknown };

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const when = (r: Rec) => {
  const t = new Date(s(r.createdAt ?? r.date ?? r.tripDate ?? r.expenseDate ?? r.paymentDate ?? r.dueDate)).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const ADMIN_ONLY = ['id', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy'];

const COL_USER_LINKS: Record<(typeof COLS)[number], { path: string; label: string; icon: any }> = {
  trips: { path: '/travel/trips', label: 'View in Trips', icon: Bus },
  vehicles: { path: '/travel/vehicles', label: 'View in Vehicles', icon: Car },
  payments: { path: '/travel/payments', label: 'View in Payments', icon: Wallet },
  expenses: { path: '/travel/expenses', label: 'View in Expenses', icon: Receipt },
  cashbook: { path: '/travel/cashbook', label: 'View in Cash Book', icon: BookOpen },
  reminders: { path: '/travel/reminders', label: 'View in Reminders', icon: Bell },
};

export default function AdminDashboard() {
  const [col, setCol] = useState<(typeof COLS)[number]>('trips');
  const [rows, setRows] = useState<Rec[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; pending: number }>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState<Rec | null>(null);
  const [editor, setEditor] = useState<{ id?: string; json: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'reject'; rec: Rec } | null>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const lock = useRef(false);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    if (res.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Session ended.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [list, summary] = await Promise.all([
        api(`/api/admin/records?collection=${col}`),
        api('/api/admin/records'),
      ]);
      setRows((list as Rec[]).sort((a, b) => when(b) - when(a)));
      setCounts(summary);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network problem. Try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, col]);

  useEffect(() => {
    load();
  }, [load]);

  const statuses = useMemo(() => ['all', ...new Set(rows.map((r) => s(r.status)).filter(Boolean))], [rows]);
  const shown = useMemo(
    () =>
      rows.filter((r) => {
        const t = when(r);
        return (
          (status === 'all' || s(r.status) === status) &&
          (!from || (t && t >= new Date(from).getTime())) &&
          (!to || (t && t <= new Date(to).getTime() + 864e5)) &&
          (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
        );
      }),
    [rows, q, status, from, to]
  );

  async function act(label: string, body: object) {
    if (lock.current) return false;
    lock.current = true;
    setWorking(true);
    setErr('');
    setMsg('');
    try {
      await api('/api/admin/records', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ collection: col, ...body }),
      });
      setMsg(`${label} succeeded.`);
      await load();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network problem. Try again.');
      return false;
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  async function save() {
    if (!editor) return;
    let data: unknown;
    try {
      data = JSON.parse(editor.json);
    } catch {
      return setErr('Record must be valid JSON.');
    }
    if (
      await act(editor.id ? 'Edit' : 'Create', {
        action: editor.id ? 'update' : 'create',
        id: editor.id,
        data,
      })
    ) {
      setEditor(null);
    }
  }

  const activeColMeta = COL_USER_LINKS[col];
  const UserIcon = activeColMeta.icon;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      {/* Collection Navigation Cards */}
      <nav aria-label="Collections" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {COLS.map((c) => {
          const isCurrent = c === col;
          const meta = COL_USER_LINKS[c];
          const IconComponent = meta.icon;

          return (
            <button
              key={c}
              aria-current={isCurrent}
              onClick={() => {
                setCol(c);
                setStatus('all');
                setQ('');
                setMsg('');
              }}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isCurrent
                  ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-1 ring-blue-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold capitalize text-slate-800">{c}</span>
                <IconComponent className={`w-3.5 h-3.5 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">{counts[c]?.total ?? '–'}</span> total ·{' '}
                <span className="text-amber-600 font-semibold">{counts[c]?.pending ?? 0}</span> pending
              </div>
            </button>
          );
        })}
      </nav>

      {/* Control Bar: Filters & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Collection Title & User Page Link */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2">
              <span>{col}</span>
              <span className="text-xs font-normal text-slate-400">({shown.length} shown)</span>
            </h1>

            {/* Link to access the operational page for this data */}
            <Link
              href={activeColMeta.path}
              target="_blank"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-semibold border border-slate-200/80 transition-colors"
              title={`Open ${col} in User Portal`}
            >
              <UserIcon className="w-3 h-3" />
              <span>{activeColMeta.label}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setEditor({ json: '{\n  \n}' })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Record</span>
            </button>
          </div>
        </div>

        {/* Search, Status & Date Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Search</span>
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${col} by name, ID, vehicle, notes…`}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </label>

          <label className="flex items-center">
            <span className="sr-only">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              {statuses.map((x) => (
                <option key={x} value={x}>
                  Status: {x}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      {err && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">{err}</p>}
      {msg && <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">{msg}</p>}

      {/* Main Records Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <table className="w-full text-xs">
          <caption className="sr-only">{col} records</caption>
          <thead className="bg-slate-50 border-b border-slate-200/80 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3.5">Record Identifier</th>
              <th className="py-3 px-3.5">Created By / Driver</th>
              <th className="py-3 px-3.5">Status</th>
              <th className="py-3 px-3.5">Date</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <span>Loading {col} records from database…</span>
                </td>
              </tr>
            )}
            {!loading && !err && shown.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No {col} records match the current filter.
                </td>
              </tr>
            )}
            {!loading &&
              shown.map((r) => {
                const st = s(r.status) || 'active';
                const displayName = s(
                  r.receiptNumber ||
                    r.tripNumber ||
                    r.registrationNumber ||
                    r.name ||
                    r.title ||
                    r.description ||
                    r.customerName ||
                    r.id
                );
                const subDetails = [
                  r.vehicleName,
                  r.from && r.to ? `${r.from} → ${r.to}` : null,
                  r.amount ? `₹${Number(r.amount).toLocaleString('en-IN')}` : null,
                  r.totalFare ? `Fare: ₹${Number(r.totalFare).toLocaleString('en-IN')}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 leading-tight">{displayName}</div>
                      {subDetails && <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{subDetails}</div>}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {r.id}</div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium">
                      {s(r.driverName ?? r.ownerId ?? r.userId ?? r.createdBy ?? r.customerName) || '—'}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          st === 'approved' || st === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : st === 'pending' || st === 'scheduled'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : st === 'rejected' || st === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {st}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 font-medium">
                      {when(r) ? new Date(when(r)).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Ic label="View Details" onClick={() => setView(r)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Ic>
                        <Ic
                          label="Edit JSON"
                          onClick={() =>
                            setEditor({
                              id: r.id,
                              json: JSON.stringify(
                                Object.fromEntries(Object.entries(r).filter(([k]) => !ADMIN_ONLY.includes(k))),
                                null,
                                2
                              ),
                            })
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Ic>
                        {st === 'pending' && (
                          <>
                            <Ic
                              label="Approve Record"
                              disabled={working}
                              onClick={() => act('Approve', { action: 'approve', id: r.id })}
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Ic>
                            <Ic
                              label="Reject Record"
                              disabled={working}
                              onClick={() => {
                                setReason('');
                                setConfirm({ kind: 'reject', rec: r });
                              }}
                              className="text-amber-600 hover:bg-amber-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Ic>
                          </>
                        )}
                        <Ic
                          label="Delete Record"
                          onClick={() => setConfirm({ kind: 'delete', rec: r })}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Ic>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* View JSON Modal */}
      {view && (
        <Modal title={`${col} / ${view.id}`} onClose={() => setView(null)}>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Document data snapshot</span>
              <Link
                href={activeColMeta.path}
                target="_blank"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Open in {col} page</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-900 text-slate-100 p-3.5 text-xs font-mono">
              {JSON.stringify(view, null, 2)}
            </pre>
          </div>
        </Modal>
      )}

      {/* Editor Modal */}
      {editor && (
        <Modal title={editor.id ? `Edit ${editor.id}` : `New ${col} record`} onClose={() => setEditor(null)}>
          <label className="text-xs font-semibold text-slate-700 block">
            Record Fields (JSON)
            <textarea
              value={editor.json}
              onChange={(e) => setEditor({ ...editor, json: e.target.value })}
              rows={14}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-slate-500">Review status and audit fields are controlled by Approve/Reject actions.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditor(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={working}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {working ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete / Reject Modal */}
      {confirm && (
        <Modal title={confirm.kind === 'delete' ? 'Delete record permanently?' : 'Reject record'} onClose={() => setConfirm(null)}>
          {confirm.kind === 'reject' ? (
            <label className="text-xs font-semibold text-slate-700 block space-y-1">
              <span>Rejection Reason (required)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Specify reason for audit logs..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
              />
            </label>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              This permanently deletes record <b className="text-slate-900">{confirm.rec.id}</b> from collection{' '}
              <b className="text-slate-900">{col}</b>.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setConfirm(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={working || (confirm.kind === 'reject' && !reason.trim())}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              onClick={async () => {
                await act(
                  confirm.kind === 'delete' ? 'Delete' : 'Reject',
                  confirm.kind === 'delete'
                    ? { action: 'delete', id: confirm.rec.id }
                    : { action: 'reject', id: confirm.rec.id, reason }
                );
                setConfirm(null);
              }}
            >
              {confirm.kind === 'delete' ? 'Delete record' : 'Reject record'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const Ic = ({
  label,
  children,
  className = '',
  ...p
}: { label: string; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...p}
    aria-label={label}
    title={label}
    className={`rounded-lg p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 transition-colors cursor-pointer ${className}`}
  >
    {children}
  </button>
);

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-3.5 flex items-center justify-between pb-2.5 border-b border-slate-100">
          <h2 className="font-bold text-sm text-slate-900">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
