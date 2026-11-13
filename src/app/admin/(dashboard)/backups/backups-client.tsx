'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Clock,
  HardDrive,
  ShieldCheck,
  AlertCircle,
  Calendar,
  CheckCircle2,
  X,
  Search,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertTriangle,
  UploadCloud,
  Check,
} from 'lucide-react'
import type { BackupRecord, BackupType } from '@/types'
import {
  createBackup,
  getBackupHistory,
  deleteBackup,
  triggerBackupDownload,
  getBackupById,
  BACKUP_COLLECTIONS,
  BACKUP_RETENTION_DAYS,
  getDaysUntilExpiry,
  getBackupExpiryDate,
  pruneExpiredBackups,
} from '@/services/backup.service'
import { restoreFromBackup } from '@/services/restore.service'
import { subscribeDataChanged } from '@/lib/storage-sync'

interface BackupsClientProps {
  initialBackups: BackupRecord[]
}

const TYPE_CONFIG: Record<
  BackupType,
  { label: string; badge: string; icon: string }
> = {
  manual: {
    label: 'Manual Snapshot',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '👤',
  },
  scheduled_daily: {
    label: 'Daily Auto-Backup',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '⏰',
  },
  scheduled_weekly: {
    label: 'Weekly Archive',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: '📅',
  },
  pre_restore_safety: {
    label: 'Safety Pre-Restore',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '🛡️',
  },
}

export default function BackupsClient({ initialBackups }: BackupsClientProps) {
  const [backups, setBackups] = useState<BackupRecord[]>(initialBackups || [])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createNotes, setCreateNotes] = useState('')
  const [creating, setCreating] = useState(false)

  const [restoreModalItem, setRestoreModalItem] = useState<BackupRecord | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreDetails, setRestoreDetails] = useState<BackupRecord | null>(null)
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [performSafetyBackup, setPerformSafetyBackup] = useState(true)
  const [confirmPhrase, setConfirmPhrase] = useState('')

  const [deleteModalItem, setDeleteModalItem] = useState<BackupRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pruning, setPruning] = useState(false)

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 4500)
  }

  const reloadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getBackupHistory(50)
      setBackups(list)
    } catch {
      // keep current
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Automatically load backups on client mount
    reloadBackups()

    const unsub = subscribeDataChanged((entity) => {
      if (entity === 'backups' || entity === 'trash' || entity === 'all') {
        reloadBackups()
      }
    })
    return () => unsub()
  }, [reloadBackups])

  // Key metrics
  const metrics = useMemo(() => {
    const totalCount = backups.length
    const totalBytes = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0)
    const lastBackup = backups[0] || null

    // Format total size
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = totalBytes === 0 ? 0 : Math.floor(Math.log(totalBytes) / Math.log(k))
    const totalSizeFormatted =
      totalBytes === 0 ? '0 B' : `${parseFloat((totalBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`

    return {
      totalCount,
      totalSizeFormatted,
      lastBackup,
      safetySnapshots: backups.filter((b) => b.type === 'pre_restore_safety').length,
    }
  }, [backups])

  // Filtered backups list
  const filtered = useMemo(() => {
    return backups.filter((b) => {
      if (typeFilter !== 'all' && b.type !== typeFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        b.name?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q) ||
        b.notes?.toLowerCase().includes(q) ||
        b.createdBy?.email?.toLowerCase().includes(q)
      )
    })
  }, [backups, search, typeFilter])

  // Handle Manual Backup Creation
  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const created = await createBackup('manual', createNotes.trim() || undefined, {
        email: 'admin@rk-travel.com',
        displayName: 'Administrator',
      })
      showToast(`Database snapshot "${created.name}" created successfully! (${created.sizeFormatted})`)
      setCreateModalOpen(false)
      setCreateNotes('')
      await reloadBackups()
    } catch (err: any) {
      showToast(err.message || 'Failed to create database snapshot.', 'error')
    } finally {
      setCreating(false)
    }
  }

  // Open Restore Modal
  const openRestoreModal = async (record: BackupRecord) => {
    setRestoreModalItem(record)
    setConfirmPhrase('')
    setPerformSafetyBackup(true)

    // Load full payload with collections breakdown if not present
    if (!record.payload) {
      setRestoreLoading(true)
      try {
        const full = await getBackupById(record.id)
        if (full) {
          setRestoreDetails(full)
          setSelectedCollections(full.collections || BACKUP_COLLECTIONS)
        } else {
          setRestoreDetails(record)
          setSelectedCollections(record.collections || BACKUP_COLLECTIONS)
        }
      } catch {
        setRestoreDetails(record)
        setSelectedCollections(record.collections || BACKUP_COLLECTIONS)
      } finally {
        setRestoreLoading(false)
      }
    } else {
      setRestoreDetails(record)
      setSelectedCollections(record.collections || BACKUP_COLLECTIONS)
    }
  }

  // Handle Restoration
  const handleExecuteRestore = async () => {
    if (!restoreModalItem || confirmPhrase.trim().toUpperCase() !== 'RESTORE') {
      showToast('Please type "RESTORE" exactly to confirm data recovery.', 'error')
      return
    }

    setRestoreLoading(true)
    try {
      const res = await restoreFromBackup(restoreModalItem.id, {
        selectedCollections,
        performSafetyBackup,
      })

      showToast(
        `Restoration completed successfully! ${res.totalRestored} records recovered across ${Object.keys(res.collectionCounts).length} collections.`
      )
      setRestoreModalItem(null)
      setRestoreDetails(null)
      await reloadBackups()
    } catch (err: any) {
      showToast(err.message || 'Failed to restore database from backup.', 'error')
    } finally {
      setRestoreLoading(false)
    }
  }

  // Handle Download Backup
  const handleDownload = async (record: BackupRecord) => {
    try {
      let target = record
      if (!record.payload) {
        const full = await getBackupById(record.id)
        if (full) target = full
      }
      if (!target.payload || Object.keys(target.payload.collections || {}).length === 0) {
        showToast(
          `Snapshot "${record.name}" has no data payload to export. Please create a new backup snapshot.`,
          'error'
        )
        return
      }
      triggerBackupDownload(target)
      showToast(`Downloaded backup snapshot: ${target.name}`)
    } catch (err: any) {
      showToast('Failed to download backup JSON.', 'error')
    }
  }

  // Handle Delete Backup
  const handleDeleteBackup = async () => {
    if (!deleteModalItem) return
    setDeleting(true)
    try {
      await deleteBackup(deleteModalItem.id)
      showToast(`Backup "${deleteModalItem.name}" deleted from history.`)
      setDeleteModalItem(null)
      await reloadBackups()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete backup.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Handle Pruning of Backups older than 30 days
  const handlePruneExpired = async () => {
    setPruning(true)
    try {
      const res = await pruneExpiredBackups(BACKUP_RETENTION_DAYS)
      if (res.prunedCount > 0) {
        showToast(`30-Day Retention: Pruned ${res.prunedCount} expired backup snapshot(s) older than 30 days.`)
      } else {
        showToast('All backups are currently active within the 30-day retention window.')
      }
      await reloadBackups()
    } catch (err: any) {
      showToast(err.message || 'Failed to run retention cleanup.', 'error')
    } finally {
      setPruning(false)
    }
  }

  const toggleSelectCollection = (colName: string) => {
    setSelectedCollections((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    )
  }

  const toggleSelectAllCollections = () => {
    const all = restoreDetails?.collections || BACKUP_COLLECTIONS
    if (selectedCollections.length === all.length) {
      setSelectedCollections([])
    } else {
      setSelectedCollections([...all])
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Toast Notification */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border backdrop-blur-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Backup & Data Recovery</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Automated database snapshots, disaster recovery, and multi-collection restoration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={reloadBackups}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all"
            title="Refresh backups list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handlePruneExpired}
            disabled={pruning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg shadow-sm transition-all"
            title="Clean up backups older than 30 days"
          >
            <Clock className={`w-3.5 h-3.5 ${pruning ? 'animate-spin' : ''}`} />
            <span>{pruning ? 'Pruning...' : 'Prune >30d'}</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Backup Now</span>
          </button>
        </div>
      </div>

      {/* 30-Day Retention Policy Notice Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 shadow-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">30-Day Storage Retention Policy Enforced:</span>
            <span className="text-slate-600 ml-1">
              All database backup archives are safely stored for <strong>30 days</strong>. Snapshots older than 30 days are automatically pruned to prevent database bloat and keep recovery operations fast.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            30 Days Max
          </span>
        </div>
      </div>

      {/* Status & Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Last Backup */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Last Successful Backup
            </p>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {metrics.lastBackup
                ? new Date(metrics.lastBackup.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No backups yet'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics.lastBackup
                ? `${metrics.lastBackup.sizeFormatted} • ${metrics.lastBackup.totalRecords} records`
                : 'Run your first backup now'}
            </p>
          </div>
        </div>

        {/* Card 2: 30-Day Retention Policy & Next Scheduled Backup */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Retention Policy
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">30-Day Auto Retention</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Daily auto-prune • 02:00 AM IST</p>
          </div>
        </div>

        {/* Card 3: Storage & Total Backups */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Archive Storage
            </p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{metrics.totalSizeFormatted}</p>
            <p className="text-xs text-slate-500 mt-0.5">{metrics.totalCount} backups maintained</p>
          </div>
        </div>

        {/* Card 4: Safety Snapshots */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Safety Snapshots
            </p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {metrics.safetySnapshots} Pre-Restore
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Automatic fail-safe protection</p>
          </div>
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
            placeholder="Search backups by name, ID, notes..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'manual', label: 'Manual' },
            { id: 'scheduled_daily', label: 'Daily' },
            { id: 'scheduled_weekly', label: 'Weekly' },
            { id: 'pre_restore_safety', label: 'Safety Snapshots' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                typeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Backup History</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">
              {filtered.length}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Snapshots cover all 10 Firestore collections
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No backups found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {search || typeFilter !== 'all'
                ? 'No backup records match the selected filter.'
                : 'No database snapshots have been recorded yet. Click "Create Backup Now" to capture your database.'}
            </p>
            {!(search || typeFilter !== 'all') && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Backup</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Backup Name & ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Expires In</th>
                  <th className="py-3 px-4">Records & Size</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filtered.map((b) => {
                  const typeConf = TYPE_CONFIG[b.type] || TYPE_CONFIG.manual
                  const daysLeft = getDaysUntilExpiry(b.createdAt, BACKUP_RETENTION_DAYS)
                  const expDate = b.expiresAt || getBackupExpiryDate(b.createdAt, BACKUP_RETENTION_DAYS)

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{typeConf.icon}</span>
                          <div>
                            <p className="font-semibold text-slate-900">{b.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{b.id}</p>
                            {b.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5 truncate max-w-xs">
                                &quot;{b.notes}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeConf.badge}`}
                        >
                          {typeConf.label}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(b.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(b.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </td>

                      {/* Expires In (30-day retention) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                              daysLeft <= 3
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : daysLeft <= 7
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}</span>
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(expDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Records & Size */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{b.totalRecords} records</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">{b.sizeFormatted}</span>
                          {b.collectionCounts?.trash !== undefined && b.collectionCounts.trash > 0 && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
                              {b.collectionCounts.trash} in trash
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {b.createdBy?.email || 'admin@gmail.com'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download JSON */}
                          <button
                            onClick={() => handleDownload(b)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download JSON Snapshot"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Restore */}
                          <button
                            onClick={() => openRestoreModal(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shadow-sm"
                            title="Restore Data from this Snapshot"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModalItem(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete this backup"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* CREATE BACKUP MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Database Snapshot</h3>
                  <p className="text-xs text-slate-500">Capture current database state across all collections</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Backup Scope (10 Collections)
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  {BACKUP_COLLECTIONS.map((c) => (
                    <div key={c} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      <span className="capitalize font-medium text-slate-700">
                        {c === 'trash' ? 'Trash & Soft-Deleted' : c === 'audit_logs' ? 'Audit & Activity Logs' : c}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Backup Notes (Optional)
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="e.g. Before monthly fare revision or before fleet upgrade"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900">
                <p className="font-semibold">Safe and non-destructive:</p>
                <p className="mt-0.5 text-blue-700">
                  Creating a snapshot does not lock the database or interrupt any ongoing customer operations.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCreateModalOpen(false)}
                disabled={creating}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creating}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Capturing Snapshot...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Create Snapshot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE MODAL */}
      {restoreModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Restore Database from Backup</h3>
                  <p className="text-xs text-slate-500">{restoreModalItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRestoreModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const hasCollections =
                restoreDetails?.payload?.collections &&
                Object.keys(restoreDetails.payload.collections).length > 0
              const isPayloadMissing =
                !restoreLoading &&
                (restoreDetails?.isPayloadMissing || (!hasCollections && !restoreModalItem.payload))

              if (isPayloadMissing) {
                return (
                  <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-900">Snapshot Incomplete (No Data Payload)</p>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                          This snapshot archive (<code className="font-mono">{restoreModalItem.id}</code>) has no stored collection data payload. It was created before Firestore subcollection permissions were configured.
                        </p>
                        <p className="text-xs text-rose-700 mt-2">
                          Restoration is unavailable for this snapshot. Please delete this record and click <strong>&quot;+ Create Backup Now&quot;</strong> to take a complete snapshot.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const item = restoreModalItem
                          setRestoreModalItem(null)
                          setDeleteModalItem(item)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Corrupted Snapshot
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="mt-4 space-y-4">
                  {/* Warning Box */}
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900">
                      <p className="font-bold">Caution: Database Recovery</p>
                      <p className="mt-0.5">
                        Restoring from this snapshot will update documents in selected collections to match this snapshot.
                        Original document IDs and structures will be preserved.
                      </p>
                    </div>
                  </div>

                  {/* Collections Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Select Collections to Restore ({selectedCollections.length})
                      </label>
                      <button
                        type="button"
                        onClick={toggleSelectAllCollections}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {selectedCollections.length === (restoreDetails?.collections?.length || BACKUP_COLLECTIONS.length)
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                      {(restoreDetails?.collections || BACKUP_COLLECTIONS).map((col) => {
                        const count = restoreDetails?.collectionCounts?.[col] ?? '?'
                        const checked = selectedCollections.includes(col)
                        return (
                          <label
                            key={col}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectCollection(col)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="capitalize font-medium text-slate-800">
                                {col === 'trash'
                                  ? 'Trash & Soft-Deleted'
                                  : col === 'audit_logs'
                                  ? 'Audit & Activity Logs'
                                  : col}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">({count})</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Safety Snapshot Checkbox */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={performSafetyBackup}
                        onChange={(e) => setPerformSafetyBackup(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Create Pre-Restore Safety Snapshot (Recommended)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Automatically saves an exact copy of the current database before restoring, so you can revert at
                          any time if needed.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Strict Confirmation Phrase */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Type <span className="text-rose-600 font-mono">RESTORE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder="Type RESTORE in capital letters"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              )
            })()}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRestoreModalItem(null)}
                disabled={restoreLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={
                  restoreLoading ||
                  confirmPhrase.trim().toUpperCase() !== 'RESTORE' ||
                  selectedCollections.length === 0 ||
                  restoreDetails?.isPayloadMissing ||
                  (!restoreDetails?.payload && !restoreModalItem.payload) ||
                  Object.keys(restoreDetails?.payload?.collections || {}).length === 0
                }
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-md shadow-amber-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {restoreLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Restore Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BACKUP CONFIRMATION MODAL */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Backup Snapshot?</h3>
                <p className="text-xs text-slate-500">{deleteModalItem.name}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this backup snapshot ({deleteModalItem.sizeFormatted}, {deleteModalItem.totalRecords} records)?
              This will remove the snapshot file from storage. Your live database will not be affected.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteModalItem(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBackup}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Snapshot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

