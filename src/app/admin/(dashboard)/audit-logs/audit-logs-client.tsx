'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Eye,
  X,
  RefreshCw,
  Download,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Database,
  PlusCircle,
  Edit,
  AlertTriangle,
} from 'lucide-react'
import type { AuditLogEntry, AuditAction } from '@/types'
import { getAuditLogs } from '@/services/audit.service'
import { subscribeDataChanged } from '@/lib/storage-sync'

interface AuditLogsClientProps {
  initialLogs: AuditLogEntry[]
}

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; badge: string; icon: any }
> = {
  CREATE: {
    label: 'Create',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: PlusCircle,
  },
  UPDATE: {
    label: 'Update',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Edit,
  },
  SOFT_DELETE: {
    label: 'Soft Delete',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Trash2,
  },
  RESTORE: {
    label: 'Restore',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: RotateCcw,
  },
  PERMANENT_DELETE: {
    label: 'Purge (Permanent)',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertTriangle,
  },
  BACKUP_CREATE: {
    label: 'Backup Created',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Database,
  },
  BACKUP_DOWNLOAD: {
    label: 'Backup Exported',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: Download,
  },
  BACKUP_RESTORE: {
    label: 'Database Restored',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: RotateCcw,
  },
  BACKUP_DELETE: {
    label: 'Backup Deleted',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Trash2,
  },
}

export default function AuditLogsClient({ initialLogs }: AuditLogsClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs || [])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null)

  const reloadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const refreshed = await getAuditLogs(200)
      setLogs(refreshed)
    } catch {
      // keep current
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Automatically load logs on client mount
    reloadLogs()

    const unsub = subscribeDataChanged((entity) => {
      if (
        entity === 'audit_logs' ||
        entity === 'trash' ||
        entity === 'backups' ||
        entity === 'expenses' ||
        entity === 'all'
      ) {
        reloadLogs()
      }
    })
    return () => unsub()
  }, [reloadLogs])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = logs.length
    const softDeletes = logs.filter((l) => l.action === 'SOFT_DELETE').length
    const restores = logs.filter((l) => l.action === 'RESTORE').length
    const permanentDeletes = logs.filter((l) => l.action === 'PERMANENT_DELETE').length
    const backups = logs.filter((l) => l.action.startsWith('BACKUP_')).length

    return { total, softDeletes, restores, permanentDeletes, backups }
  }, [logs])

  // Filtered Logs
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false
      if (collectionFilter !== 'all' && l.collectionName !== collectionFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        l.details?.toLowerCase().includes(q) ||
        l.recordId?.toLowerCase().includes(q) ||
        l.userEmail?.toLowerCase().includes(q) ||
        l.collectionName?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q)
      )
    })
  }, [logs, search, actionFilter, collectionFilter])

  // Export CSV
  const exportCsv = () => {
    if (logs.length === 0) return
    const headers = ['Timestamp', 'Action', 'Collection', 'Record ID', 'Actor Email', 'Role', 'Details']
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.collectionName}"`,
      `"${l.recordId}"`,
      `"${l.userEmail || ''}"`,
      `"${l.userRole || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RK_Travel_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit & Security Logs</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Immutable activity trail tracking record changes, deletions, restorations, and backup operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={reloadLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Events</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged actions</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Soft Deletes</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{metrics.softDeletes}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Moved to trash</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Restorations</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{metrics.restores}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Recovered records</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Backup & Restore</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">{metrics.backups}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Disaster recovery events</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, record ID, or action details..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="SOFT_DELETE">Soft Delete</option>
            <option value="RESTORE">Restore</option>
            <option value="PERMANENT_DELETE">Permanent Delete</option>
            <option value="BACKUP_CREATE">Backup Created</option>
            <option value="BACKUP_RESTORE">Database Restored</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
          </select>

          {/* Collection Filter */}
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Collections</option>
            <option value="trips">Trips</option>
            <option value="vehicles">Vehicles</option>
            <option value="payments">Payments</option>
            <option value="expenses">Expenses</option>
            <option value="reminders">Reminders</option>
            <option value="users">Users</option>
            <option value="backups">Backups</option>
            <option value="trash">Trash</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Event Trail</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
              {filtered.length}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">Chronological audit stream</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No audit events found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No actions match your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filtered.map((entry) => {
                  const conf = ACTION_CONFIG[entry.action] || {
                    label: entry.action,
                    badge: 'bg-slate-50 text-slate-700 border-slate-200',
                    icon: FileText,
                  }
                  const ActionIcon = conf.icon

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(entry.timestamp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.badge}`}
                        >
                          <ActionIcon className="w-3 h-3" />
                          <span>{conf.label}</span>
                        </span>
                      </td>

                      {/* Collection */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {entry.collectionName}
                        </span>
                      </td>

                      {/* Record ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <code className="text-[11px] text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {entry.recordId || '-'}
                        </code>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">
                            {entry.userEmail || 'admin@gmail.com'}
                          </span>
                        </div>
                        {entry.userRole && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {entry.userRole}
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm" title={entry.details}>
                          {entry.details}
                        </p>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectLog(entry)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View complete event payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT LOG MODAL */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Audit Event Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{inspectLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Action</p>
                  <p className="font-bold text-slate-900 mt-0.5">{inspectLog.action}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Collection</p>
                  <p className="font-bold text-slate-900 mt-0.5">{inspectLog.collectionName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Record ID</p>
                  <p className="font-mono text-slate-800 mt-0.5">{inspectLog.recordId}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Timestamp</p>
                  <p className="text-slate-800 mt-0.5">{inspectLog.timestamp}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Actor</p>
                  <p className="text-slate-800 mt-0.5">
                    {inspectLog.userEmail} ({inspectLog.userRole || 'admin'} • {inspectLog.userId})
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Details</p>
                  <p className="text-slate-800 mt-0.5">{inspectLog.details}</p>
                </div>
              </div>

              {inspectLog.metadata && Object.keys(inspectLog.metadata).length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Metadata</p>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(inspectLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.previousState && (
                <div>
                  <p className="font-semibold text-amber-700 uppercase tracking-wider text-[11px] mb-1">
                    Previous State
                  </p>
                  <pre className="p-3 bg-slate-900 text-amber-200 rounded-xl text-[11px] overflow-x-auto font-mono max-h-40">
                    {JSON.stringify(inspectLog.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.newState && (
                <div>
                  <p className="font-semibold text-emerald-700 uppercase tracking-wider text-[11px] mb-1">
                    New / Updated State
                  </p>
                  <pre className="p-3 bg-slate-900 text-emerald-200 rounded-xl text-[11px] overflow-x-auto font-mono max-h-40">
                    {JSON.stringify(inspectLog.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

