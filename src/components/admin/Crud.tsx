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
  RefreshCw,
} from 'lucide-react';
import type { FieldConfig } from '@/lib/admin/modules';
import { inr } from '@/lib/admin/modules';
import {
  fetchAdminRows,
  saveAdminRow,
  deleteAdminRow,
} from '@/lib/admin/admin-client-service';
import { subscribeDataChanged } from '@/lib/storage-sync';

const BADGE_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Available: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Done: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  In: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  Partial: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  Scheduled: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  Maintenance: 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'On trip': 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  Ongoing: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  Blocked: 'bg-rose-50 text-rose-700 border border-rose-200/80',
  Cancelled: 'bg-rose-50 text-rose-700 border border-rose-200/80',
  Out: 'bg-rose-50 text-rose-700 border border-rose-200/80',
};

function Cell({ f, v }: { f: FieldConfig; v: unknown }) {
  if (f.type === 'money') {
    return <span className="font-semibold text-slate-900">{inr(v)}</span>;
  }
  if (f.type === 'select' && typeof v === 'string' && v) {
    const badgeClass =
      BADGE_STYLES[v] || 'bg-slate-100 text-slate-700 border border-slate-200';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
        {v}
      </span>
    );
  }
  return (
    <span className="text-slate-800">
      {(v as React.ReactNode) || <span className="text-slate-300">–</span>}
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
  const shown = useMemo(
    () =>
      rows.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(q.toLowerCase())
      ),
    [rows, q]
  );

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
      // 1. Save directly via unified application client service (updates Firestore + localStorage + caches)
      const savedRecord = await saveAdminRow(slug, form);
      setBusy(false);
      setRows((prev) =>
        edit
          ? prev.map((r) => (r.id === savedRecord.id ? savedRecord : r))
          : [savedRecord, ...prev]
      );
      setForm(null);
    } catch (clientErr: any) {
      // Fallback to API route if client service fails
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

  const moneyCol = fields.find((f) => f.type === 'money');
  const total = moneyCol
    ? shown.reduce((s, r) => s + Number(r[moneyCol.key] || 0), 0)
    : null;


  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              {rows.length} records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, search, create, update, or remove {singular} records
          </p>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-64 h-10 pl-9 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs transition-all"
            />
          </div>

          <button
            type="button"
            onClick={loadLiveRows}
            disabled={syncing}
            className="h-10 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setErr('');
              setForm(blank());
            }}
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add {singular}</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                {cols.map((f) => (
                  <th
                    key={f.key}
                    className={`py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      f.type === 'money' ? 'text-right' : ''
                    }`}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {shown.map((r) => (
                <tr key={String(r.id)} className="hover:bg-slate-50/60 transition-colors">
                  {cols.map((f) => (
                    <td
                      key={f.key}
                      className={`py-3.5 px-4 whitespace-nowrap ${
                        f.type === 'money' ? 'text-right' : ''
                      }`}
                    >
                      <Cell f={f} v={r[f.key]} />
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setErr('');
                          setForm({ ...r });
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600">
                      {q
                        ? 'No records match your search filter.'
                        : `No ${title.toLowerCase()} recorded yet.`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {q ? 'Try clearing or changing your search terms.' : `Click "Add ${singular}" to create the first record.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing {shown.length} of {rows.length} {singular}s
          </span>
          {total !== null && (
            <span className="font-bold text-slate-900">
              Total Amount: {inr(total)}
            </span>
          )}
        </div>
      </div>

      {/* Add / Edit Modal Form */}
      {form && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setForm(null)}
        >
          <div
            className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {form.id ? 'Edit' : 'Add New'} {singular}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter {singular} details below to save into the system
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {err && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{err}</span>
              </div>
            )}

            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className={f.type === 'textarea' ? 'sm:col-span-2' : ''}
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {f.label}
                      {f.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>

                    {f.type === 'select' ? (
                      <select
                        value={String(form[f.key] ?? '')}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="w-full h-10 px-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
                      >
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={String(form[f.key] ?? '')}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}…`}
                        className="w-full p-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
                      />
                    ) : (
                      <input
                        type={f.type === 'money' ? 'number' : f.type}
                        step={f.type === 'money' ? '0.01' : undefined}
                        min={
                          f.type === 'money' || f.type === 'number'
                            ? 0
                            : undefined
                        }
                        value={String(form[f.key] ?? '')}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}…`}
                        required={f.required}
                        className="w-full h-10 px-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
