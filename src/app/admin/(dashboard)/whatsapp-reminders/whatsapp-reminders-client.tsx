'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  X,
  Phone,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type { WhatsAppNotificationRecord, WhatsAppNotificationStatus } from '@/types';

interface Props {
  initialNotifications: WhatsAppNotificationRecord[];
}

export default function WhatsAppRemindersClient({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<WhatsAppNotificationRecord[]>(initialNotifications);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<WhatsAppNotificationRecord | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedSid, setCopiedSid] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSid(id);
    setTimeout(() => setCopiedSid(null), 2000);
  };

  // Reload notifications list from server
  const reloadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/reminders?status=all');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      showToast('Failed to refresh notifications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual retry for failed reminder
  const handleRetry = async (item: WhatsAppNotificationRecord) => {
    setRetryingId(item.id);
    try {
      const res = await fetch('/api/admin/whatsapp/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'Notification retried successfully!', 'success');
        await reloadNotifications();
      } else {
        showToast(data.message || data.error || 'Retry failed.', 'error');
        await reloadNotifications();
      }
    } catch (err: any) {
      showToast(err?.message || 'Error executing retry.', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  // Safe Test Mode execution
  const handleRunTest = async (isDryRun: boolean) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDryRun }),
      });
      const data = await res.json();
      setTestResult(data);
      if (res.ok) {
        showToast(
          isDryRun
            ? 'Dry run completed safely (simulation only).'
            : 'Live test message submitted to Twilio.',
          'success'
        );
        if (!isDryRun) {
          await reloadNotifications();
        }
      } else {
        showToast(data.error || 'Test failed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Test connection error.', 'error');
    } finally {
      setTesting(false);
    }
  };

  // KPI Metrics Calculations
  const stats = useMemo(() => {
    const total = notifications.length;
    const delivered = notifications.filter((n) => n.status === 'delivered' || n.status === 'sent').length;
    const pending = notifications.filter((n) => n.status === 'pending' || n.status === 'processing' || n.status === 'submitted').length;
    const failed = notifications.filter((n) => n.status === 'failed' || n.status === 'missed').length;
    return { total, delivered, pending, failed };
  }, [notifications]);

  // Filtered List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchable = [
          item.receiptNumber,
          item.customerName,
          item.tripDate,
          item.reminderDate,
          item.recipientPhone,
          item.twilioMessageSid,
          item.status,
          item.errorMessage,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [notifications, filterStatus, searchQuery]);

  // Status Badge Helper
  const renderStatusBadge = (status: WhatsAppNotificationStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Delivered
          </span>
        );
      case 'sent':
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3.5 h-3.5" />
            {status === 'sent' ? 'Sent' : 'Submitted'}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Missed (&lt; 5d)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-bold animate-in fade-in slide-in-from-bottom-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 opacity-80 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & ACTION BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                WhatsApp Trip Reminders
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Twilio Cloud
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Automated 5-day dispatch notifications sent to the RK Travel Hub administrator at 10:00 AM IST via Twilio WhatsApp API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer border border-blue-200/80 shadow-2xs"
          >
            <Zap className="w-4 h-4 text-blue-600" />
            <span>Test / Dry Run</span>
          </button>

          <button
            type="button"
            onClick={reloadNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI SUMMARY CARDS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reminders</p>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono-nums">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Automated cycles tracked</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Delivered / Sent</p>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono-nums">{stats.delivered}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Admin notifications confirmed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending / Processing</p>
          <p className="text-2xl font-black text-amber-700 mt-1 font-mono-nums">{stats.pending}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Queued for delivery</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Failed / Missed</p>
          <p className="text-2xl font-black text-rose-700 mt-1 font-mono-nums">{stats.failed}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Needs review or manual retry</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH & STATUS FILTER TABS
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['all', 'pending', 'submitted', 'delivered', 'failed', 'missed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer capitalize ${
                filterStatus === status
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt, customer, phone, SID..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. NOTIFICATIONS REGISTER TABLE
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No WhatsApp Reminders Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Automated reminders will appear here when trips reach their 5-day dispatch mark or when running a test.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Receipt #</th>
                  <th className="px-4 py-3.5">Customer &amp; Route</th>
                  <th className="px-4 py-3.5">Trip Date</th>
                  <th className="px-4 py-3.5">Reminder Date</th>
                  <th className="px-4 py-3.5">Admin Phone</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Twilio Message SID</th>
                  <th className="px-4 py-3.5">Sent Timestamp</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Receipt Number */}
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono-nums">
                      <Link
                        href={`/admin/trips`}
                        className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span>{notif.receiptNumber || 'N/A'}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>

                    {/* Customer & Route */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 truncate max-w-[140px]">
                        {notif.customerName || 'N/A'}
                      </p>
                      {notif.metadata?.pickupLocation && notif.metadata?.destination && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {notif.metadata.pickupLocation} → {notif.metadata.destination}
                        </p>
                      )}
                    </td>

                    {/* Trip Date */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {notif.tripDate}
                      </span>
                    </td>

                    {/* Reminder Date */}
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {notif.reminderDate || notif.createdAt?.slice(0, 10) || '-'}
                    </td>

                    {/* Admin Phone */}
                    <td className="px-4 py-3.5 text-slate-700 font-mono-nums">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {notif.recipientPhone || 'Default Admin'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {renderStatusBadge(notif.status)}
                    </td>

                    {/* Twilio Message SID */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                      {notif.twilioMessageSid ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(notif.twilioMessageSid!, notif.id)}
                          className="inline-flex items-center gap-1 hover:text-blue-600 cursor-pointer"
                          title="Click to copy SID"
                        >
                          <span>{notif.twilioMessageSid.slice(0, 12)}...</span>
                          {copiedSid === notif.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Sent Timestamp */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {notif.sentAt ? new Date(notif.sentAt).toLocaleString('en-IN') : '-'}
                    </td>

                    {/* Actions: Inspect & Retry */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectItem(notif)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Inspect full details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {notif.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetry(notif)}
                            disabled={retryingId === notif.id}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="Retry failed reminder"
                          >
                            <RotateCcw
                              className={`w-3 h-3 ${retryingId === notif.id ? 'animate-spin' : ''}`}
                            />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. INSPECT MODAL
          ───────────────────────────────────────────────────────────── */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Reminder Details: {inspectItem.receiptNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 font-semibold block">Status</span>
                  <div className="mt-0.5">{renderStatusBadge(inspectItem.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Trip Date</span>
                  <span className="font-bold text-slate-800">{inspectItem.tripDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Customer Name</span>
                  <span className="font-bold text-slate-800">{inspectItem.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Admin Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{inspectItem.recipientPhone}</span>
                </div>
              </div>

              {inspectItem.errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-rose-600 mb-0.5">
                    Error Log
                  </span>
                  <p className="font-mono text-[11px] break-words">{inspectItem.errorMessage}</p>
                </div>
              )}

              {inspectItem.metadata && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Dispatch Details
                  </span>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-1 font-mono text-[11px]">
                    <p>
                      <strong>Route:</strong> {inspectItem.metadata.pickupLocation} → {inspectItem.metadata.destination}
                    </p>
                    <p>
                      <strong>Driver:</strong> {inspectItem.metadata.driverName} ({inspectItem.metadata.driverPhone})
                    </p>
                    <p>
                      <strong>Vehicle:</strong> {inspectItem.metadata.vehicleName} [{inspectItem.metadata.vehicleNumber}]
                    </p>
                    <p>
                      <strong>Trip Amount:</strong> {inspectItem.metadata.tripAmount}
                    </p>
                    {inspectItem.twilioMessageSid && (
                      <p className="break-all text-blue-700">
                        <strong>Twilio SID:</strong> {inspectItem.twilioMessageSid}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {inspectItem.status === 'failed' && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetry(inspectItem);
                    setInspectItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Retry Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TEST / DRY RUN MODAL
          ───────────────────────────────────────────────────────────── */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Twilio WhatsApp Test &amp; Dry Run
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTestModalOpen(false);
                  setTestResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Verify your template variables, phone formatting, and Twilio secrets safely. Dry Run tests formatting without sending real messages.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testing}
                onClick={() => handleRunTest(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Eye className="w-4 h-4" />
                <span>Simulate Dry Run</span>
              </button>

              <button
                type="button"
                disabled={testing}
                onClick={() => {
                  if (confirm('Send a live WhatsApp test message to the configured Admin number?')) {
                    handleRunTest(false);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Send className="w-4 h-4" />
                <span>Send Live Test</span>
              </button>
            </div>

            {testing && (
              <div className="p-4 text-center text-xs text-slate-500">
                <RotateCcw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                Executing test request...
              </div>
            )}

            {testResult && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-800 block">Result:</span>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-2xl overflow-x-auto text-[11px] max-h-60">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setTestModalOpen(false);
                  setTestResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

