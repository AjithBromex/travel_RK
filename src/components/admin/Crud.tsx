'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { FieldConfig } from '@/lib/admin/modules';
import { inr } from '@/lib/admin/modules';
import {
  fetchAdminRows,
  saveAdminRow,
  deleteAdminRow,
} from '@/lib/admin/admin-client-service';
import { subscribeDataChanged, notifyDataChanged, unmarkDeleted } from '@/lib/storage-sync';

const BADGE_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  Paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  Available: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  Done: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  In: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200/90',
  Partial: 'bg-amber-50 text-amber-700 border border-amber-200/90',
  Scheduled: 'bg-blue-50 text-blue-700 border border-blue-200/90',
  Maintenance: 'bg-amber-50 text-amber-700 border border-amber-200/90',
  'On trip': 'bg-indigo-50 text-indigo-700 border border-indigo-200/90',
  Ongoing: 'bg-blue-50 text-blue-700 border border-blue-200/90',
  Blocked: 'bg-rose-50 text-rose-700 border border-rose-200/90',
  Cancelled: 'bg-rose-50 text-rose-700 border border-rose-200/90',
  Out: 'bg-rose-50 text-rose-700 border border-rose-200/90',
};

function Cell({ f, v }: { f: FieldConfig; v: unknown }) {
  if (f.type === 'money') {
    return <span className="font-extrabold text-slate-900 tracking-tight">{inr(v)}</span>;
  }
  if (f.type === 'select' && typeof v === 'string' && v) {
    const badgeClass =
      BADGE_STYLES[v] || 'bg-slate-100 text-slate-700 border border-slate-200';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
        {v}
      </span>
    );
  }
  return (
    <span className="text-slate-800 font-medium">
      {(v as React.ReactNode) || <span className="text-slate-300 font-normal">–</span>}
    </span>
  );
}

interface CrudProps {
  slug: string;
  title: string;
  singular: string;
  fields: FieldConfig[];
  columns: string[];
  initial: Record<string, unknown>[];
}

export default function Crud({
  slug,
  title,
  singular,
  fields,
  columns,
  initial,
}: CrudProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>(initial);
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState('');

  const loadLiveRows = useCallback(async () => {
    setSyncing(true);
    try {
      const live = await fetchAdminRows(slug);
      if (live && live.length > 0) {
        setRows(live);
      } else if (initial && initial.length > 0 && rows.length === 0) {
        setRows(initial);
      }
    } catch (e) {
      console.warn(`[Crud] Error loading live ${slug}:`, e);
    } finally {
      setSyncing(false);
    }
  }, [slug, initial, rows.length]);

  useEffect(() => {
    loadLiveRows();

    const unsub = subscribeDataChanged((entity) => {
      if (entity === slug || entity === 'all') {
        loadLiveRows();
      }
    });

    return () => unsub();
  }, [slug, loadLiveRows]);

  const cols = columns.map((k) => fields.find((f) => f.key === k)!).filter(Boolean);

  // Status options for filter pills if available
  const statusField = fields.find((f) => f.key === 'status');
  const statusOptions = statusField?.options || [];

  const shown = useMemo(() => {
    return rows.filter((r) => {
      // 1. Text search
      if (q.trim()) {
        const query = q.toLowerCase();
        const matches = JSON.stringify(r).toLowerCase().includes(query);
        if (!matches) return false;
      }

      // 2. Status tab filter
      if (activeTab !== 'all' && statusField) {
        if (String(r.status || '').toLowerCase() !== activeTab.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [rows, q, activeTab, statusField]);

  const blank = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        f.type === 'select' && f.options ? f.options[0] : '',
      ])
    );

  const set = (k: string, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setErr('');
    const edit = Boolean(form.id);
    try {
      const savedRecord = await saveAdminRow(slug, form);
      const recId = String(savedRecord.id || form.id || '');
      if (recId) unmarkDeleted(slug, recId);
      notifyDataChanged(slug as any);
      notifyDataChanged('all');
      setBusy(false);
      setRows((prev) =>
        edit
          ? prev.map((r) => (r.id === savedRecord.id ? savedRecord : r))
          : [savedRecord, ...prev]
      );
      setForm(null);
    } catch (clientErr: any) {
      try {
        const res = await fetch(`/api/${slug}${edit ? '/' + form.id : ''}`, {
          method: edit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setErr(data.error || clientErr?.message || 'Could not save record');
          return;
        }
        const recId = String(data.id || form.id || '');
        if (recId) unmarkDeleted(slug, recId);
        notifyDataChanged(slug as any);
        notifyDataChanged('all');
        setRows((prev) =>
          edit ? prev.map((r) => (r.id === data.id ? data : r)) : [data, ...prev]
        );
        setForm(null);
      } catch {
        setBusy(false);
        setErr(clientErr?.message || 'Failed to save record.');
      }
    }
  }

  async function remove(r: Record<string, unknown>) {
    if (!confirm(`Are you sure you want to delete this ${singular}?`)) return;
    try {
      await deleteAdminRow(slug, String(r.id));
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      try {
        const res = await fetch(`/api/${slug}/${r.id}`, { method: 'DELETE' });
        if (res.ok) setRows((prev) => prev.filter((x) => x.id !== r.id));
        else alert('Could not delete record');
      } catch {
        alert('Error deleting record.');
      }
    }
  }

  const handleExportCSV = () => {
    if (shown.length === 0) {
      alert('No records to export.');
      return;
    }
    const headers = cols.map((c) => c.label);
    const csvRows = [
      headers.join(','),
      ...shown.map((r) =>
        cols
          .map((c) => {
            const val = r[c.key] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Admin_${slug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const moneyCol = fields.find((f) => f.type === 'money');
  const total = moneyCol
    ? shown.reduce((s, r) => s + Number(r[moneyCol.key] || 0), 0)
    : null;

  return (
    <div className="font-sans max-w-[1520px] mx-auto pb-12 space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. SCENIC GRADIENT HERO BANNER (PURE CSS, NO IMAGES)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-lg p-5 sm:p-7 lg:p-8 bg-gradient-to-br from-[#070D1E] via-[#0E1A38] to-[#122856] text-white flex flex-col justify-between gap-6">
        {/* Subtle Ambient Mesh Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
                              radial-gradient(circle at 85% 30%, rgba(99, 102, 241, 0.35) 0%, transparent 60%)`,
          }}
        />

        {/* Top Header Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-bold tracking-wide uppercase mb-2 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Control Master</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {title}{' '}Directory &amp; Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium max-w-xl">
              Inspect, manage, filter, and adjust real-time {singular} records across the agency.
            </p>
          </div>

          {/* Action Buttons Matching User Portal UI */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 backdrop-blur-md border border-white/70 shadow-sm font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErr('');
                setForm(blank());
              }}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-md shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
              <span>Add {singular}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SEARCH & STATUS FILTER TABS CARD
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input with rounded pill styling */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()} by customer, route, vehicle…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            All ({rows.length})
          </button>

          {statusOptions.slice(0, 4).map((opt) => {
            const count = rows.filter((r) => String(r.status || '').toLowerCase() === opt.toLowerCase()).length;
            const active = activeTab.toLowerCase() === opt.toLowerCase();
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setActiveTab(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0D62FE] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {opt} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN DATA TABLE CARD
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[24px] shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                {cols.map((f) => (
                  <th
                    key={f.key}
                    className={`py-3.5 px-4 sm:px-5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 ${
                      f.type === 'money' ? 'text-right' : ''
                    }`}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="py-3.5 px-4 sm:px-5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {shown.map((r) => (
                <tr key={String(r.id)} className="hover:bg-blue-50/40 transition-colors">
                  {cols.map((f) => (
                    <td
                      key={f.key}
                      className={`py-3.5 px-4 sm:px-5 whitespace-nowrap ${
                        f.type === 'money' ? 'text-right' : ''
                      }`}
                    >
                      <Cell f={f} v={r[f.key]} />
                    </td>
                  ))}
                  <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {slug !== 'users' && (
                        <button
                          type="button"
                          onClick={() => {
                            setErr('');
                            setForm({ ...r });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!shown.length && (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="py-16 text-center text-slate-400 text-xs sm:text-sm font-medium"
                  >
                    No {title.toLowerCase()} found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>

            {total !== null && shown.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/80 border-t border-slate-200/80 font-extrabold text-slate-900 text-xs sm:text-sm">
                  <td colSpan={cols.length - 1} className="py-3.5 px-4 sm:px-5 text-right text-slate-600">
                    Total:
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-right font-black text-slate-900">
                    {inr(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CREATE / EDIT MODAL DIALOG
          ───────────────────────────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {form.id ? `Edit ${singular}` : `New ${singular}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {form.id ? 'Modify operational details' : `Create a new verified ${singular} record`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {err && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <p>{err}</p>
              </div>
            )}

            <form onSubmit={save} className="mt-5 space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>

                  {f.type === 'select' && f.options ? (
                    <select
                      value={String(form[f.key] ?? f.options[0])}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full h-11 px-3.5 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                    >
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={String(form[f.key] ?? '')}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="w-full p-3.5 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  ) : (
                    <input
                      type={f.type === 'number' || f.type === 'money' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={String(form[f.key] ?? '')}
                      onChange={(e) => set(f.key, e.target.value)}
                      required={f.required}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="w-full h-11 px-3.5 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-md shadow-blue-500/35 transition-all cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save {singular}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
