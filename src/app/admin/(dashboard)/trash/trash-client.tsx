'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Trash2,
  RotateCcw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Loader2,
  RefreshCw,
  FolderOpen,
  ShieldAlert,
  ArrowRight,
  Database,
  Calendar,
  User,
  Tag,
} from 'lucide-react'
import type { TrashItem } from '@/types'
import {
  getTrashItems,
  restoreFromTrash,
  restoreMultipleFromTrash,
  permanentDeleteFromTrash,
  emptyTrash,
} from '@/services/trash.service'
import { subscribeDataChanged } from '@/lib/storage-sync'

interface TrashClientProps {
  initialItems: TrashItem[]
}

const COLLECTION_LABELS: Record<string, { label: string; color: string }> = {
  trips: { label: 'Trips', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  vehicles: { label: 'Vehicles', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  payments: { label: 'Payments', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expenses: { label: 'Expenses', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  reminders: { label: 'Reminders', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  users: { label: 'Users', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  cashbook: { label: 'Cash Book', color: 'bg-teal-50 text-teal-700 border-teal-200' },
}

export default function TrashClient({ initialItems }: TrashClientProps) {
  const [items, setItems] = useState<TrashItem[]>(initialItems || [])
  const [search, setSearch] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [inspectItem, setInspectItem] = useState<TrashItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [permDeleteModal, setPermDeleteModal] = useState<TrashItem | null>(null)
  const [emptyTrashModal, setEmptyTrashModal] = useState(false)
  const [bulkRestoreModal, setBulkRestoreModal] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  const reloadTrash = useCallback(async () => {
    setLoading(true)
    try {
      const refreshed = await getTrashItems()
      setItems(refreshed)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Automatically load all trash items on mount
    reloadTrash()

    const unsub = subscribeDataChanged((entity) => {
      if (entity === 'trash' || entity === 'all' || entity === 'expenses') {
        reloadTrash()
      }
    })
    return () => unsub()
  }, [reloadTrash])

  // Summary counts
  const counts = useMemo(() => {
    const total = items.length
    const trips = items.filter((i) => i.originalCollection === 'trips').length
    const vehicles = items.filter((i) => i.originalCollection === 'vehicles').length
    const payments = items.filter((i) => i.originalCollection === 'payments').length
    const expenses = items.filter((i) => i.originalCollection === 'expenses').length
    const reminders = items.filter((i) => i.originalCollection === 'reminders').length
    const users = items.filter((i) => i.originalCollection === 'users').length
    return { total, trips, vehicles, financials: payments + expenses, reminders, users }
  }, [items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const recName = String(item.recordName || '')
      const origId = String(item.originalId || item.id || '')
      const reason = String(item.deletionReason || '')
      const actorEmail = String(item.deletedBy?.email || '')
      const q = search.toLowerCase()

      const matchesSearch =
        search === '' ||
        recName.toLowerCase().includes(q) ||
        origId.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q) ||
        actorEmail.toLowerCase().includes(q)

      const matchesCollection =
        collectionFilter === 'all' || item.originalCollection === collectionFilter

      return matchesSearch && matchesCollection
    })
  }, [items, search, collectionFilter])

  // Select all toggle
  const isAllSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Single Restore
  const handleRestore = async (item: TrashItem) => {
    setActionLoadingId(item.id)
    try {
      await restoreFromTrash(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      if (inspectItem?.id === item.id) setInspectItem(null)
      showToast(`Restored "${item.recordName}" back to ${item.originalCollection}.`)
    } catch (err: any) {
      showToast(err?.message || 'Restore failed', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Bulk Restore
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return
    setLoading(true)
    setBulkRestoreModal(false)
    try {
      const idsToRestore = Array.from(selectedIds)
      const res = await restoreMultipleFromTrash(idsToRestore)
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      showToast(`Successfully restored ${res.success} selected records.`)
    } catch (err: any) {
      showToast(err?.message || 'Bulk restore failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Permanent Delete Single
  const handlePermanentDelete = async (item: TrashItem) => {
    setActionLoadingId(item.id)
    setPermDeleteModal(null)
    try {
      await permanentDeleteFromTrash(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      if (inspectItem?.id === item.id) setInspectItem(null)
      showToast(`Permanently purged "${item.recordName}".`)
    } catch (err: any) {
      showToast(err?.message || 'Delete failed', 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Empty Trash
  const handleEmptyTrash = async () => {
    setLoading(true)
    setEmptyTrashModal(false)
    try {
      const count = await emptyTrash()
      setItems([])
      setSelectedIds(new Set())
      showToast(`Trash emptied: ${count} records permanently removed.`)
    } catch (err: any) {
      showToast(err?.message || 'Empty trash failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1520px] mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold text-white transition-all animate-in fade-in slide-in-from-bottom-3 ${
            feedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. SLEEK TRASH HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B1528] to-slate-900 border border-slate-800/80 p-5 sm:p-7 text-white shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>RECYCLE BIN & RECOVERY</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Trash & Data Recovery
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Soft-deleted records are safely preserved here. Review details, restore them to their original collections with identical IDs, or permanently purge them.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={reloadTrash}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setEmptyTrashModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        </div>

        {/* STAT PILLS */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total in Trash</p>
            <p className="text-lg font-black text-white mt-0.5">{counts.total}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Trips</p>
            <p className="text-lg font-black text-blue-400 mt-0.5">{counts.trips}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Vehicles</p>
            <p className="text-lg font-black text-indigo-400 mt-0.5">{counts.vehicles}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Financials</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{counts.financials}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Reminders</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{counts.reminders}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Users</p>
            <p className="text-lg font-black text-purple-400 mt-0.5">{counts.users}</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SEARCH & FILTER CONTROLS BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted records by name, ID, customer, user, or reason…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs sm:text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="trips">Trips Only</option>
            <option value="vehicles">Vehicles Only</option>
            <option value="payments">Payments Only</option>
            <option value="expenses">Expenses Only</option>
            <option value="reminders">Reminders Only</option>
            <option value="users">Users Only</option>
            <option value="cashbook">Cash Book Only</option>
          </select>

          {/* Bulk restore button */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setBulkRestoreModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer animate-in fade-in"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TRASH ITEMS TABLE
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Trash is completely clean</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || collectionFilter !== 'all'
                ? 'No deleted records matched your search or filter.'
                : 'No soft-deleted records exist. All active business documents are safe.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Record Name & Category</th>
                  <th className="py-3 px-4">Original ID</th>
                  <th className="py-3 px-4">Deleted At</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  const colConfig = COLLECTION_LABELS[item.originalCollection] || {
                    label: item.originalCollection,
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  }
                  const isActing = actionLoadingId === item.id

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Record Name & Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${colConfig.color}`}
                          >
                            {colConfig.label}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-xs">
                            {item.recordName}
                          </span>
                        </div>
                      </td>

                      {/* Original ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 text-[11px]">
                        {item.originalId}
                      </td>

                      {/* Deleted Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {new Date(item.deletedAt).toLocaleDateString('en-GB')}{' '}
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.deletedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Deleted By */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                            {item.deletedBy?.email || 'admin@gmail.com'}
                          </span>
                        </div>
                      </td>

                      {/* Deletion Reason */}
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs italic">
                        {item.deletionReason || '–'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Inspect Details */}
                          <button
                            type="button"
                            onClick={() => setInspectItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Inspect full record details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Restore */}
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleRestore(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/90 font-bold text-xs transition-colors cursor-pointer"
                            title="Restore to original location"
                          >
                            {isActing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            <span>Restore</span>
                          </button>

                          {/* Permanently Delete */}
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => setPermDeleteModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Permanently Delete (Irreversible)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RECORD DETAILS INSPECTOR MODAL
          ───────────────────────────────────────────────────────────── */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Record Details: {inspectItem.recordName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Collection: {inspectItem.originalCollection} • ID: {inspectItem.originalId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Deleted Timestamp</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(inspectItem.deletedAt).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Deleted By User</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">
                    {inspectItem.deletedBy?.email || 'admin@gmail.com'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-1.5">Original Preserved Fields</p>
                <pre className="p-3 sm:p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-72">
                  {JSON.stringify(inspectItem.data, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleRestore(inspectItem)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Record Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. PERMANENT DELETE WARNING DIALOG
          ───────────────────────────────────────────────────────────── */}
      {permDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Permanently Delete Record?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{permDeleteModal.recordName}</strong>?
            </p>
            <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-700 font-semibold text-left">
              WARNING: This document will be permanently removed from Cloud Firestore. It cannot be recovered from Trash afterward.
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPermDeleteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(permDeleteModal)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. EMPTY TRASH WARNING DIALOG
          ───────────────────────────────────────────────────────────── */}
      {emptyTrashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Empty Entire Trash?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              This will permanently purge all <strong className="text-slate-900">{items.length} records</strong> currently in the Trash from Cloud Firestore.
            </p>
            <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-700 font-semibold text-left">
              CAUTION: None of these {items.length} items can be restored after emptying.
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEmptyTrashModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Empty Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. BULK RESTORE CONFIRMATION DIALOG
          ───────────────────────────────────────────────────────────── */}
      {bulkRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Restore Selected Records?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You are about to restore <strong className="text-slate-900">{selectedIds.size} records</strong> back to their original Firestore collections with identical document IDs.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setBulkRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Restore {selectedIds.size} Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

