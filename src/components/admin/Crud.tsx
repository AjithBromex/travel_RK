'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { FieldConfig } from '@/lib/admin/modules';
import { inr } from '@/lib/admin/modules';
import {
  fetchAdminRows,
  saveAdminRow,
  deleteAdminRow,
  toggleAdminConfirm,
} from '@/lib/admin/admin-client-service';
import {
  subscribeDataChanged,
  notifyDataChanged,
  unmarkDeleted,
  markAsDeleted,
  isRecordConfirmed,
  getStoredTrips,
} from '@/lib/storage-sync';

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

function Cell({ f, v, row }: { f: FieldConfig; v: unknown; row?: Record<string, unknown> }) {
  if (f.type === 'money') {
    return <span className="font-extrabold text-slate-900 tracking-tight">{inr(v)}</span>;
  }
  if (f.type === 'select' && typeof v === 'string' && v) {
    const badgeClass =
      BADGE_STYLES[v] || 'bg-slate-100 text-slate-700 border border-slate-200';
    return (
      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold ${badgeClass}`}>
        {v}
      </span>
    );
  }

  let displayVal = v;
  if (f.key === 'customer' && typeof v === 'string' && v.toLowerCase().startsWith('trip ') && row) {
    const rawObj = (row.raw as any) || {};
    const tripId = String(rawObj.tripId || rawObj.tripNumber || row.tripId || '');
    if (typeof window !== 'undefined') {
      const storedTrips = getStoredTrips();
      const trip = storedTrips.find(
        (t) =>
          t.id === tripId ||
          t.tripNumber === tripId ||
          (t.receiptNumber && t.receiptNumber === tripId)
      );
      if (trip && (trip.customerName || trip.customer)) {
        displayVal = trip.customerName || trip.customer;
      } else {
        displayVal = 'Customer';
      }
    } else {
      displayVal = 'Customer';
    }
  }

  if (f.key === 'email' && (!v || String(v).trim() === '') && row) {
    const cleanName = String(row.name || (row as any).displayName || (row as any).userId || '')
      .trim()
      .replace(/@gmail\.com$/i, '')
      .replace(/@.*$/, '')
      .toLowerCase();
    if (cleanName && !cleanName.startsWith('usr_')) {
      displayVal = `${cleanName}@gmail.com`;
    }
  }

  return (
    <span className="text-slate-800 font-medium">
      {(displayVal as React.ReactNode) || <span className="text-slate-300 font-normal">–</span>}
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

const PAGE_SIZE = 25;

export default function Crud({
  slug,
  title,
  singular,
  fields,
  columns,
  initial,
}: CrudProps) {
  const sanitizeRows = useCallback((rawList: Record<string, unknown>[]) => {
    if (!Array.isArray(rawList)) return rawList;
    if (slug === 'users') {
      return rawList.map((r) => {
        const existingEmail = String(r.email || (r as any).userEmail || (r as any).mail || '').trim();
        if (existingEmail) return { ...r, email: existingEmail };
        const cleanName = String(r.name || (r as any).displayName || (r as any).userId || '')
          .trim()
          .replace(/@gmail\.com$/i, '')
          .replace(/@.*$/, '')
          .toLowerCase();
        const fallbackEmail = cleanName && !cleanName.startsWith('usr_') ? `${cleanName}@gmail.com` : '';
        return fallbackEmail ? { ...r, email: fallbackEmail } : r;
      });
    }

    if (slug === 'payments') {
      const storedTrips = typeof window !== 'undefined' ? getStoredTrips() : [];
      return rawList.map((r) => {
        let cust = String(r.customer || '').trim();
        let tripRef = String(r.tripRef || '').trim();
        const rawObj = (r.raw as any) || {};
        const tripId = String(rawObj.tripId || rawObj.tripNumber || r.tripId || '');

        if (cust.toLowerCase().startsWith('trip ') || !cust) {
          if (tripId && tripId !== 'general') {
            const trip = storedTrips.find(
              (t) =>
                t.id === tripId ||
                t.tripNumber === tripId ||
                (t.receiptNumber && t.receiptNumber === tripId)
            );
            if (trip && (trip.customerName || trip.customer)) {
              cust = trip.customerName || trip.customer;
            }
            if (trip && trip.from && trip.to && (!tripRef || tripRef.toLowerCase().startsWith('trip #'))) {
              tripRef = `${trip.from} → ${trip.to}`;
            }
          }
        }

        if (cust.toLowerCase().startsWith('trip ') || !cust) {
          cust = 'Customer';
        }

        return {
          ...r,
          customer: cust,
          tripRef: tripRef || (tripId ? `Trip #${tripId}` : 'Direct Inflow'),
        };
      });
    }

    return rawList;
  }, [slug]);

  const [rows, setRows] = useState<Record<string, unknown>[]>(() => sanitizeRows(initial));
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isFetchingRef = useRef(false);

  const loadLiveRows = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const live = await fetchAdminRows(slug);
      if (Array.isArray(live)) {
        setRows(sanitizeRows(live));
      }
    } catch (e) {
      console.warn(`[Crud] Live row fetch notice for ${slug}:`, e);
    } finally {
      isFetchingRef.current = false;
    }
  }, [slug, sanitizeRows]);

  useEffect(() => {
    // Always fetch live rows on mount to ensure cross-device consistency
    loadLiveRows();

    const handleFocus = () => {
      loadLiveRows();
    };
    window.addEventListener('focus', handleFocus);

    let debounceTimer: NodeJS.Timeout;
    const unsub = subscribeDataChanged((entity) => {
      if (entity === slug || entity === 'all') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadLiveRows();
        }, 300);
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(debounceTimer);
      unsub();
    };
  }, [slug, loadLiveRows]);

  const cols = useMemo(
    () => columns.map((k) => fields.find((f) => f.key === k)!).filter(Boolean),
    [columns, fields]
  );

  const statusField = useMemo(() => fields.find((f) => f.key === 'status'), [fields]);
  const statusOptions = useMemo(
    () => (statusField?.options || []).filter((opt) => opt !== 'Blocked'),
    [statusField]
  );

  const shown = useMemo(() => {
    return rows.filter((r) => {
      if (q.trim()) {
        const query = q.toLowerCase();
        const matches = Object.values(r).some((val) =>
          String(val ?? '').toLowerCase().includes(query)
        );
        if (!matches) return false;
      }

      if (activeTab !== 'all' && statusField) {
        if (String(r.status || '').toLowerCase() !== activeTab.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [rows, q, activeTab, statusField]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [q, activeTab]);

  // Pagination slicing for high-performance DOM
  const totalPages = Math.ceil(shown.length / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return shown.slice(start, start + PAGE_SIZE);
  }, [shown, page]);

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
    const targetId = String(r.id || (r as any).uid || '');
    if (!targetId) return;

    markAsDeleted(slug, targetId);
    setRows((prev) => prev.filter((x) => String(x.id) !== targetId && String((x as any).uid) !== targetId));
    notifyDataChanged(slug as any);
    notifyDataChanged('all');

    try {
      await deleteAdminRow(slug, targetId);
    } catch {
      try {
        await fetch(`/api/${slug}/${targetId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn(`[Crud] Delete fallback error for ${slug}/${targetId}:`, err);
      }
    }
  }

  async function handleToggleConfirm(r: Record<string, unknown>) {
    const targetId = String(r.id || (r as any).uid || '');
    if (!targetId) return;

    const currentConfirmed = Boolean(
      r.isConfirmed || isRecordConfirmed(slug, targetId, r as any)
    );
    const newStatus = !currentConfirmed;

    // Optimistically update table UI immediately
    setRows((prev) =>
      prev.map((row) =>
        String(row.id || (row as any).uid) === targetId
          ? { ...row, isConfirmed: newStatus }
          : row
      )
    );

    try {
      await toggleAdminConfirm(slug, targetId, currentConfirmed);
    } catch (err) {
      console.warn(`[Crud] Failed to toggle confirmation for ${slug}/${targetId}:`, err);
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
  const total = useMemo(() => {
    return moneyCol
      ? shown.reduce((s, r) => s + Number(r[moneyCol.key] || 0), 0)
      : null;
  }, [shown, moneyCol]);

  return (
    <div className="font-sans w-full max-w-[1520px] mx-auto pb-8 sm:pb-12 space-y-4 sm:space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. SCENIC GRADIENT HERO BANNER (RESPONSIVE)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-[#070D1E] via-[#0E1A38] to-[#122856] text-white flex flex-col justify-between gap-4 sm:gap-6">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
                              radial-gradient(circle at 85% 30%, rgba(99, 102, 241, 0.35) 0%, transparent 60%)`,
          }}
        />

        {/* Top Header Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase mb-1.5 sm:mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Admin Control Master</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              {title} Directory &amp; Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium max-w-xl">
              Inspect, manage, filter, and adjust real-time {singular.toLowerCase()} records.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-white/70 shadow-2xs font-bold text-xs transition-colors shrink-0"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErr('');
                setForm(blank());
              }}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white font-bold text-xs shadow-xs transition-colors shrink-0"
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
      <div className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input with rounded pill styling */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-8 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#0D62FE] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN DATA TABLE CARD WITH RESPONSIVE OVERFLOW & PAGINATION
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80">
                {cols.map((f) => (
                  <th
                    key={f.key}
                    className={`py-3 px-3.5 sm:px-5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 ${
                      f.type === 'money' ? 'text-right' : ''
                    }`}
                  >
                    {f.label}
                  </th>
                ))}
                <th className="py-3 px-3.5 sm:px-5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedRows.map((r) => (
                <tr key={String(r.id)} className="hover:bg-blue-50/30 transition-colors">
                  {cols.map((f) => (
                    <td
                      key={f.key}
                      className={`py-3 px-3.5 sm:px-5 whitespace-nowrap ${
                        f.type === 'money' ? 'text-right' : ''
                      }`}
                    >
                      <Cell f={f} v={r[f.key]} row={r} />
                    </td>
                  ))}
                  <td className="py-3 px-3.5 sm:px-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {slug !== 'users' && (
                        <button
                          type="button"
                          onClick={() => handleToggleConfirm(r)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            r.isConfirmed
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                          }`}
                          title={
                            r.isConfirmed
                              ? 'Click to Unconfirm (Allow user edits)'
                              : 'Click to Confirm (Locks record from user editing/deletion)'
                          }
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              r.isConfirmed ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          />
                          <span>{r.isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                        </button>
                      )}
                      {slug !== 'users' && (
                        <button
                          type="button"
                          onClick={() => {
                            setErr('');
                            setForm({ ...r });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!shown.length && (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="py-12 sm:py-16 text-center text-slate-400 text-xs sm:text-sm font-medium"
                  >
                    No {title.toLowerCase()} found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>

            {total !== null && shown.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 border-t border-slate-200/80 font-extrabold text-slate-900 text-xs sm:text-sm">
                  <td colSpan={cols.length - 1} className="py-3 px-3.5 sm:px-5 text-right text-slate-600">
                    Total:
                  </td>
                  <td className="py-3 px-3.5 sm:px-5 text-right font-black text-slate-900">
                    {inr(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination & Row count footer */}
        {shown.length > 0 && (
          <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-bold text-slate-900">
                {Math.min(page * PAGE_SIZE, shown.length)}
              </span>{' '}
              of <span className="font-bold text-slate-900">{shown.length}</span> records
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-slate-800">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CREATE / EDIT MODAL DIALOG (RESPONSIVE TOUCH-FRIENDLY)
          ───────────────────────────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {form.id ? `Edit ${singular}` : `New ${singular}`}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {form.id ? 'Modify details' : `Create a verified ${singular} record`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {err && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <p>{err}</p>
              </div>
            )}

            <form onSubmit={save} className="mt-4 space-y-3 sm:space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>

                  {f.type === 'select' && f.options ? (
                    <select
                      value={String(form[f.key] ?? f.options[0])}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full h-10 px-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
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
                      className="w-full p-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                  ) : (
                    <input
                      type={f.type === 'number' || f.type === 'money' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={String(form[f.key] ?? '')}
                      onChange={(e) => set(f.key, e.target.value)}
                      required={f.required}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="w-full h-10 px-3 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    />
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-3.5 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#0D62FE] hover:bg-[#0952DC] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
