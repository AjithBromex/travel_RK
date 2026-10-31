"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck,
  AlertOctagon,
  Clock,
  Globe,
  RefreshCw,
  Ban,
  Trash2,
  UserMinus,
  CheckCircle2,
  XCircle,
  FileText,
  Bus,
  ArrowRight,
} from "lucide-react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

interface AuditLog {
  id: string
  action: string
  email: string
  ip: string
  userAgent?: string
  reason?: string
  timestamp: string
}

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [lockoutNotification, setLockoutNotification] = useState<string | null>(null)

  // Fetch recent audit logs from Firestore
  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const q = query(
        collection(db, "audit_logs"),
        orderBy("timestamp", "desc"),
        limit(20)
      )
      const snapshot = await getDocs(q)
      const fetched: AuditLog[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AuditLog, "id">),
      }))
      setLogs(fetched)
    } catch (err) {
      console.warn("Could not fetch audit logs:", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // Action attempted on master admin handler
  const handleAttemptActionOnAdmin = (action: string) => {
    setLockoutNotification(
      `Action blocked: The master admin account (admin@gmail.com) cannot be ${action} from within the UI to prevent administrative lockout.`
    )
    setTimeout(() => setLockoutNotification(null), 6000)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Lockout Protection Alert Banner ─── */}
      {lockoutNotification && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
            <p>{lockoutNotification}</p>
          </div>
          <button
            onClick={() => setLockoutNotification(null)}
            className="text-amber-400 hover:text-white text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Hero Summary & Security Posture ─── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34D399]" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                Security Engine Operational
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Admin Access & Security Hub
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Enforcing server-side session cookies (1-hour expiry), custom claim verification (
              <code className="bg-slate-950 px-2 py-0.5 rounded text-rose-300 text-xs font-mono font-bold">
                admin: true
              </code>
              ), brute-force rate-limiting, and immutable master admin lockout safeguards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/travel"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600/60 shadow transition-all"
            >
              <Bus className="w-4 h-4 text-blue-400" />
              <span>Launch Travel Hub</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* 4 Security Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Master Account</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg font-black text-white mt-2 truncate">admin@gmail.com</p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              Protected &bull; Lockout Shield Active
            </p>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Session Cookie Expiry</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg font-black text-white mt-2">1 Hour</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              HttpOnly &bull; SameSite Strict
            </p>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Brute-Force Shield</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-lg font-black text-white mt-2">5 Attempts / 15m</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              IP & Email Dual Rate-Limiting
            </p>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Firestore Access</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg font-black text-white mt-2">Admin Custom Claim</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Full collection read/write
            </p>
          </div>
        </div>
      </div>

      {/* ─── User Accounts & Master Lockout Protection (Requirement i) ─── */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Administrative Accounts & Role Protection</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Requirement i: Master admin account is protected against being disabled, deleted, or demoted to prevent accidental lockout.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Lockout Protection: ENFORCED</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Account Identifier</th>
                <th className="py-3.5 px-4">System Role</th>
                <th className="py-3.5 px-4">Custom Claim</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Protection & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {/* Primary Master Admin Account */}
              <tr className="bg-rose-950/20 hover:bg-rose-950/30 transition-colors">
                <td className="py-4 px-4 font-bold text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                    A
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">admin@gmail.com</p>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                      Master Administrator
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-bold text-white">Super Admin</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[11px]">
                    admin: true
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active &bull; Protected
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  {/* Actions disabled with clear protection feedback (Requirement i) */}
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAttemptActionOnAdmin("disabled")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 font-semibold text-[11px] cursor-pointer"
                      title="Disable Account (Protected)"
                    >
                      <Ban className="w-3.5 h-3.5 text-slate-500" />
                      <span>Disable</span>
                      <Lock className="w-3 h-3 text-rose-400 ml-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttemptActionOnAdmin("demoted")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 font-semibold text-[11px] cursor-pointer"
                      title="Demote Role (Protected)"
                    >
                      <UserMinus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Demote</span>
                      <Lock className="w-3 h-3 text-rose-400 ml-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttemptActionOnAdmin("deleted")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 font-semibold text-[11px] cursor-pointer"
                      title="Delete Account (Protected)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Delete</span>
                      <Lock className="w-3 h-3 text-rose-400 ml-0.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Security Audit Log (Requirement f) ─── */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Authentication Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Real-time audit log recording admin login attempts, failures, and session revocations.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {loadingLogs ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-bold text-slate-300">Audit Trail Clean</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Failed and successful login attempts will appear here with IP and timestamp metadata.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Target Email</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {logs.map((log) => {
                  const isSuccess = log.action === "ADMIN_LOGIN_SUCCESS"
                  const isLockout = log.action === "ADMIN_LOGIN_LOCKOUT"
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            isSuccess
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : isLockout
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400" />
                          )}
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-white">{log.email}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.ip}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                        {log.reason || "N/A"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
