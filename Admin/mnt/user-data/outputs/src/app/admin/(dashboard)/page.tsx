'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, Trash2, Eye, Plus, Pencil, Search, RefreshCw } from 'lucide-react';

const COLS = ['trips', 'vehicles', 'payments', 'expenses', 'cashbook', 'reminders'] as const;
type Rec = { id: string; [k: string]: unknown };
const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const when = (r: Rec) => { const t = new Date(s(r.createdAt ?? r.date)).getTime(); return Number.isNaN(t) ? 0 : t; };
const ADMIN_ONLY = ['id', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy'];

export default function AdminDashboard() {
  const [col, setCol] = useState<(typeof COLS)[number]>('trips');
  const [rows, setRows] = useState<Rec[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; pending: number }>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [view, setView] = useState<Rec | null>(null);
  const [editor, setEditor] = useState<{ id?: string; json: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'reject'; rec: Rec } | null>(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const lock = useRef(false);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init);
    if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('Session ended.'); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [list, summary] = await Promise.all([api(`/api/admin/records?collection=${col}`), api('/api/admin/records')]);
      setRows((list as Rec[]).sort((a, b) => when(b) - when(a))); setCounts(summary);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Network problem. Try again.'); setRows([]); }
    finally { setLoading(false); }
  }, [api, col]);
  useEffect(() => { load(); }, [load]);

  const statuses = useMemo(() => ['all', ...new Set(rows.map((r) => s(r.status)).filter(Boolean))], [rows]);
  const shown = useMemo(() => rows.filter((r) => {
    const t = when(r);
    return (status === 'all' || s(r.status) === status)
      && (!from || (t && t >= new Date(from).getTime())) && (!to || (t && t <= new Date(to).getTime() + 864e5))
      && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  }), [rows, q, status, from, to]);

  async function act(label: string, body: object) {
    if (lock.current) return false;
    lock.current = true; setWorking(true); setErr(''); setMsg('');
    try {
      await api('/api/admin/records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ collection: col, ...body }) });
      setMsg(`${label} succeeded.`); await load(); return true;
    } catch (e) { setErr(e instanceof Error ? e.message : 'Network problem. Try again.'); return false; }
    finally { lock.current = false; setWorking(false); }
  }

  async function save() {
    if (!editor) return;
    let data: unknown;
    try { data = JSON.parse(editor.json); } catch { return setErr('Record must be valid JSON.'); }
    if (await act(editor.id ? 'Edit' : 'Create', { action: editor.id ? 'update' : 'create', id: editor.id, data })) setEditor(null);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <nav aria-label="Collections" className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        {COLS.map((c) => (
          <button key={c} aria-current={c === col} onClick={() => { setCol(c); setStatus('all'); setQ(''); setMsg(''); }}
            className={`rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${c === col ? 'border-indigo-600 bg-indigo-50' : 'bg-white'}`}>
            <div className="text-sm font-medium capitalize">{c}</div>
            <div className="text-xs text-slate-500">{counts[c]?.total ?? '–'} total · {counts[c]?.pending ?? '–'} pending</div></button>))}
      </nav>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1"><span className="sr-only">Search</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-lg border py-2 pl-9 pr-3" /></label>
        <label><span className="sr-only">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border px-3 py-2">{statuses.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="text-xs">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-1 rounded-lg border px-2 py-1.5" /></label>
        <label className="text-xs">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-1 rounded-lg border px-2 py-1.5" /></label>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2"><RefreshCw className="h-4 w-4" /> Refresh</button>
        <button onClick={() => setEditor({ json: '{\n  \n}' })} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-white"><Plus className="h-4 w-4" /> New</button>
      </div>
      {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{err}</p>}
      {msg && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm"><caption className="sr-only">{col} records</caption>
          <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">Record</th><th className="p-3">Owner</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && !err && shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No {col} match. Clear filters or add a record.</td></tr>}
            {!loading && shown.map((r) => {
              const st = s(r.status) || 'pending';
              return (<tr key={r.id} className="border-t">
                <td className="p-3"><div className="font-medium">{s(r.title ?? r.name ?? r.description ?? r.vehicleNumber ?? r.id)}</div><div className="text-xs text-slate-400">{r.id}</div></td>
                <td className="p-3">{s(r.ownerId ?? r.userId ?? r.createdBy ?? r.driver) || '—'}</td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-0.5">{st}</span></td>
                <td className="p-3">{when(r) ? new Date(when(r)).toLocaleDateString() : '—'}</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Ic label="View" onClick={() => setView(r)}><Eye /></Ic>
                  <Ic label="Edit" onClick={() => setEditor({ id: r.id, json: JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !ADMIN_ONLY.includes(k))), null, 2) })}><Pencil /></Ic>
                  {st === 'pending' && <><Ic label="Approve" disabled={working} onClick={() => act('Approve', { action: 'approve', id: r.id })}><Check /></Ic>
                    <Ic label="Reject" disabled={working} onClick={() => { setReason(''); setConfirm({ kind: 'reject', rec: r }); }}><X /></Ic></>}
                  <Ic label="Delete" onClick={() => setConfirm({ kind: 'delete', rec: r })}><Trash2 /></Ic></div></td></tr>);
            })}
          </tbody></table></div>

      {view && <Modal title={`${col} / ${view.id}`} onClose={() => setView(null)}><pre className="max-h-[60vh] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(view, null, 2)}</pre></Modal>}
      {editor && <Modal title={editor.id ? `Edit ${editor.id}` : `New ${col} record`} onClose={() => setEditor(null)}>
        <label className="text-sm">Fields (JSON)<textarea value={editor.json} onChange={(e) => setEditor({ ...editor, json: e.target.value })} rows={14} className="mt-1 w-full rounded border p-2 font-mono text-xs" /></label>
        <p className="mt-1 text-xs text-slate-500">Review fields are set by Approve and Reject only.</p>
        <button onClick={save} disabled={working} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-60">{working ? 'Saving…' : 'Save changes'}</button></Modal>}
      {confirm && <Modal title={confirm.kind === 'delete' ? 'Delete record?' : 'Reject record'} onClose={() => setConfirm(null)}>
        {confirm.kind === 'reject' ? <label className="text-sm">Reason (required)<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="mt-1 w-full rounded border p-2" /></label>
          : <p className="text-sm">This permanently deletes <b>{confirm.rec.id}</b> from {col}. Linked records and totals are not changed, so check them first.</p>}
        <button disabled={working || (confirm.kind === 'reject' && !reason.trim())} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-60"
          onClick={async () => { await act(confirm.kind === 'delete' ? 'Delete' : 'Reject', confirm.kind === 'delete' ? { action: 'delete', id: confirm.rec.id } : { action: 'reject', id: confirm.rec.id, reason }); setConfirm(null); }}>
          {confirm.kind === 'delete' ? 'Delete record' : 'Reject record'}</button></Modal>}
    </div>
  );
}

const Ic = ({ label, children, ...p }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button {...p} aria-label={label} title={label} className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-40 [&>svg]:h-4 [&>svg]:w-4">{children}</button>;
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-xl rounded-xl bg-white p-5"><div className="mb-3 flex justify-between"><h2 className="font-semibold">{title}</h2><button aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></button></div>{children}</div></div>;
}
