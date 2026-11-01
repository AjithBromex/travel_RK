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
  Users,
  Shield,
  Download,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Activity,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

const COLS = ['users', 'trips', 'vehicles', 'payments', 'expenses', 'cashbook', 'reminders', 'auditLogs'] as const;
type Rec = { id: string; [k: string]: unknown };

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const when = (r: Rec) => {
  const t = new Date(s(r.createdAt ?? r.date ?? r.tripDate ?? r.expenseDate ?? r.paymentDate ?? r.dueDate ?? r.at)).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const ADMIN_ONLY = ['id', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy'];

const COL_USER_LINKS: Record<(typeof COLS)[number], { path: string; label: string; icon: any }> = {
  users: { path: '/travel/settings', label: 'View Staff & Roles', icon: Users },
  trips: { path: '/travel/trips', label: 'View in Trips', icon: Bus },
  vehicles: { path: '/travel/vehicles', label: 'View in Vehicles', icon: Car },
  payments: { path: '/travel/payments', label: 'View in Payments', icon: Wallet },
  expenses: { path: '/travel/expenses', label: 'View in Expenses', icon: Receipt },
  cashbook: { path: '/travel/cashbook', label: 'View in Cash Book', icon: BookOpen },
  reminders: { path: '/travel/reminders', label: 'View in Reminders', icon: Bell },
  auditLogs: { path: '/admin', label: 'Audit Trail', icon: Shield },
};

export default function AdminDashboard() {
  const [col, setCol] = useState<(typeof COLS)[number]>('users');
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
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState<'staff' | 'admin'>('staff');
  const [newUserPhone, setNewUserPhone] = useState('');

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

  // 1-click User Role toggle
  async function toggleUserRole(r: Rec) {
    const nextRole = r.role === 'admin' ? 'staff' : 'admin';
    await act(`Promote/Change role to ${nextRole}`, {
      action: 'update',
      id: r.id,
      data: { role: nextRole },
    });
  }

  // 1-click User Active status toggle
  async function toggleUserStatus(r: Rec) {
    const nextStatus = r.isActive === false;
    await act(nextStatus ? 'Activate user' : 'Suspend user', {
      action: 'update',
      id: r.id,
      data: { isActive: nextStatus },
    });
  }

  // Handle adding a new user from Admin Panel
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = (newUserId || newUserName || newUserEmail.split('@')[0]).trim().toUpperCase();
    if (!cleanId) {
      setErr('Please enter a username or identifier.');
      return;
    }
    const email = newUserEmail.includes('@') ? newUserEmail.trim().toLowerCase() : `${cleanId.toLowerCase()}@gmail.com`;
    const now = new Date().toISOString();

    const ok = await act('Add new user', {
      action: 'create',
      id: cleanId,
      data: {
        uid: cleanId,
        displayName: newUserName.trim() || cleanId,
        email,
        userId: cleanId,
        role: newUserRole,
        phone: newUserPhone.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (ok) {
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserId('');
      setNewUserPhone('');
      setNewUserRole('staff');
    }
  }

  // Export collection data to JSON file
  function handleExportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rk-travels-${col}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`Exported ${rows.length} ${col} records.`);
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
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-5">
      {/* Top Banner: Status & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Full Administrative Control Active
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
            System Administration &amp; Governance Center
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Manage users, approve fleet transactions, inspect audit logs, and configure collections
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {col === 'users' ? (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
          ) : (
            <button
              onClick={() => setEditor({ json: '{\n  "title": "",\n  "status": "pending"\n}' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Record</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            title="Download collection data as JSON backup"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
            title="Reload records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collection Navigation Cards */}
      <nav aria-label="Collections" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
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
              className={`rounded-2xl border p-3 text-left transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isCurrent
                  ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-600/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold capitalize text-slate-800">{c}</span>
                <IconComponent className={`w-4 h-4 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-900">{counts[c]?.total ?? '–'}</span> total
                {c !== 'users' && c !== 'auditLogs' && (
                  <>
                    {' · '}
                    <span className="text-amber-600 font-bold">{counts[c]?.pending ?? 0}</span> pend
                  </>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Active Collection Indicator */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                <UserIcon className="w-4 h-4" />
              </span>
              <span>{col} Management</span>
            </h2>

            {col !== 'auditLogs' && (
              <Link
                href={activeColMeta.path}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60 transition-colors"
                title={`Open ${activeColMeta.label} in User Portal`}
              >
                <span>{activeColMeta.label}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{shown.length}</span> of {rows.length} records
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search in ${col} by name, email, id, status…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {col !== 'auditLogs' && (
            <label className="flex items-center">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                {statuses.map((x) => (
                  <option key={x} value={x}>
                    Filter Status: {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl bg-slate-50 border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
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

      {err && (
        <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      {msg && (
        <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* ─── SPECIAL VIEW 1: USERS & STAFF MANAGEMENT TABLE ─── */}
      {col === 'users' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Email / Contact</th>
                <th className="py-3 px-4">Role Access</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading users from database…</span>
                  </td>
                </tr>
              )}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No user accounts match the current filter.
                  </td>
                </tr>
              )}
              {!loading &&
                shown.map((u) => {
                  const role = s(u.role).toLowerCase() || 'staff';
                  const isAdmin = role === 'admin';
                  const isActive = u.isActive !== false;
                  const name = s(u.displayName || u.name || u.userId || 'User');
                  const username = s(u.userId || u.username || u.email?.toString().split('@')[0]);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs uppercase shrink-0 shadow-2xs ${
                              isAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{s(u.email) || '—'}</div>
                        {Boolean(u.phone) && <div className="text-[10px] text-slate-400">{s(u.phone)}</div>}
                      </td>


                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isAdmin
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {isAdmin ? <Shield className="w-3 h-3 text-purple-600" /> : <Users className="w-3 h-3 text-blue-600" />}
                            <span>{isAdmin ? 'ADMIN' : 'STAFF'}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleUserRole(u)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                            title={`Switch role to ${isAdmin ? 'staff' : 'admin'}`}
                          >
                            Make {isAdmin ? 'Staff' : 'Admin'}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{isActive ? 'Active' : 'Suspended'}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 hover:underline font-semibold cursor-pointer"
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {when(u) ? new Date(when(u)).toLocaleDateString('en-IN') : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Ic label="Inspect Data" onClick={() => setView(u)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Ic>
                          <Ic
                            label="Edit Profile"
                            onClick={() =>
                              setEditor({
                                id: u.id,
                                json: JSON.stringify(
                                  Object.fromEntries(Object.entries(u).filter(([k]) => !ADMIN_ONLY.includes(k))),
                                  null,
                                  2
                                ),
                              })
                            }
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Ic>
                          <Ic label="Delete User" onClick={() => setConfirm({ kind: 'delete', rec: u })} danger>
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
      )}

      {/* ─── SPECIAL VIEW 2: AUDIT LOGS INSPECTOR ─── */}
      {col === 'auditLogs' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Collection &amp; ID</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading audit trail…</span>
                  </td>
                </tr>
              )}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
              {!loading &&
                shown.map((log) => {
                  const actType = s(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            actType.includes('login')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : actType === 'approve'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : actType === 'reject'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {actType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                        {log.collection ? `${log.collection} / ` : ''}
                        {s(log.targetId || log.id)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {s(log.adminUid || log.email || 'System')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {when(log) ? new Date(when(log)).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Ic label="View Details" onClick={() => setView(log)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Ic>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── STANDARD VIEW: BUSINESS COLLECTIONS (TRIPS, FLEET, PAYMENTS, EXPENSES, CASHBOOK, REMINDERS) ─── */}
      {col !== 'users' && col !== 'auditLogs' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Record Identifier</th>
                <th className="py-3 px-3.5">Driver / Creator</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 text-right">Review Actions</th>
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
              {!loading && shown.length === 0 && (
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

                  const isPending = st === 'pending';

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
                        <div className="flex justify-end gap-1 items-center">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => act('Approve', { action: 'approve', id: r.id })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                                title="Approve Record"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm({ kind: 'reject', rec: r })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] transition-colors cursor-pointer"
                                title="Reject Record"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

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
                          <Ic label="Delete Record" onClick={() => setConfirm({ kind: 'delete', rec: r })} danger>
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
      )}

      {/* ─── MODAL 1: ADD NEW USER / STAFF ─── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Create New User / Staff Profile</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RAMESH"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@gmail.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'staff' | 'admin')}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="staff">Staff (Standard user access)</option>
                  <option value="admin">Administrator (Full governance access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={working}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {working ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: VIEW RECORD DETAILS ─── */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Document Inspector • {col}</span>
              </h3>
              <button onClick={() => setView(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Document ID</span>
                  <p className="font-mono text-slate-800 break-all">{view.id}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                  <p className="font-bold text-slate-800 capitalize">{s(view.status) || 'active'}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Document Payload</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[350px]">
                  {JSON.stringify(view, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setView(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: JSON EDITOR ─── */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>{editor.id ? `Edit ${col} Document` : `Create ${col} Document`}</span>
              </h3>
              <button onClick={() => setEditor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={12}
              value={editor.json}
              onChange={(e) => setEditor({ ...editor, json: e.target.value })}
              className="w-full font-mono text-xs p-3 rounded-xl bg-slate-900 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={working}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
              >
                {working ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: CONFIRM DELETE OR REJECT ─── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 capitalize">
              Confirm {confirm.kind === 'delete' ? 'Permanent Deletion' : 'Record Rejection'}
            </h3>
            <p className="text-xs text-slate-500">
              {confirm.kind === 'delete'
                ? `Are you sure you want to permanently delete record ${confirm.rec.id}? This action is irreversible and recorded in audit logs.`
                : `Specify an audit rejection reason for record ${confirm.rec.id}:`}
            </p>

            {confirm.kind === 'reject' && (
              <textarea
                rows={3}
                placeholder="Reason for rejection (e.g. duplicate fare, missing proof)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  setReason('');
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={working}
                onClick={async () => {
                  if (confirm.kind === 'delete') {
                    if (await act('Delete', { action: 'delete', id: confirm.rec.id })) setConfirm(null);
                  } else {
                    if (await act('Reject', { action: 'reject', id: confirm.rec.id, reason })) {
                      setConfirm(null);
                      setReason('');
                    }
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50 ${
                  confirm.kind === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {working ? 'Processing…' : confirm.kind === 'delete' ? 'Confirm Delete' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ic({
  label,
  children,
  onClick,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
        danger
          ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
          : 'text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
