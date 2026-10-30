"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  BarChart3,
  FileText,
  Download,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { formatINR, formatDateShort, exportToCSV } from "@/lib/utils";
import type { CashBookEntry, Trip } from "@/types";

interface CashBookClientProps {
  initialEntries: CashBookEntry[];
  trips?: Trip[];
}

export default function CashBookClient({
  initialEntries,
  trips = [],
}: CashBookClientProps) {
  const [entries] = useState<CashBookEntry[]>(initialEntries || []);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Map trips for quick trip number lookups
  const tripsMap = useMemo(() => {
    const map = new Map<string, Trip>();
    trips.forEach((t) => map.set(t.id, t));
    return map;
  }, [trips]);

  // Current Month prefix for KPIs
  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-10"

  const thisMonthEntries = useMemo(() => {
    return entries.filter(
      (e) => e.date && e.date.startsWith(currentMonthPrefix)
    );
  }, [entries, currentMonthPrefix]);

  const totalCashInMonth = useMemo(() => {
    return thisMonthEntries.reduce(
      (sum, e) => sum + (Number(e.cashIn) || 0),
      0
    );
  }, [thisMonthEntries]);

  const totalCashOutMonth = useMemo(() => {
    return thisMonthEntries.reduce(
      (sum, e) => sum + (Number(e.cashOut) || 0),
      0
    );
  }, [thisMonthEntries]);

  const netCashFlowMonth = totalCashInMonth - totalCashOutMonth;
  const totalTransactions = entries.length;

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      const trip = e.tripId ? tripsMap.get(e.tripId) : null;
      const tripNum = (trip?.tripNumber || e.tripId || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      const dateStr = (e.date || "").toLowerCase();
      return desc.includes(q) || tripNum.includes(q) || dateStr.includes(q);
    });
  }, [entries, search, tripsMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const handleExportCSV = () => {
    if (entries.length === 0) {
      alert("No cash book records to export.");
      return;
    }

    const csvData = entries.map((e) => {
      const trip = e.tripId ? tripsMap.get(e.tripId) : null;
      return {
        Date: e.date,
        Trip: trip ? trip.tripNumber : (e.tripId ? `Trip ${e.tripId}` : "General / Fleet"),
        Description: e.description,
        "Cash In (INR)": e.cashIn || 0,
        "Cash Out (INR)": e.cashOut || 0,
        "Running Balance (INR)": e.balance || 0,
        "Payment Mode": e.paymentMode || "cash",
      };
    });

    exportToCSV(csvData, `CashBook_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
              OPERATIONS HUB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Cash Book
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Track cash inflows and outflows across trips and operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Top 4 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CASH IN */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CASH IN
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(totalCashInMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Total receipts</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>
        </div>

        {/* CASH OUT */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CASH OUT
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(totalCashOutMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Total expenses</span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>
        </div>

        {/* NET CASH FLOW */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              NET CASH FLOW
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tracking-tight">
              {formatINR(netCashFlowMonth)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Inflow - Outflow</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              <span>↑ Balanced</span>
            </span>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TRANSACTIONS
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalTransactions}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Total cash book records</span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              All Time
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Main Full-Width Cash Book Table Card ─── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Cash Book
              </h2>
              <p className="text-[11px] text-slate-400">
                Recorded receipts and expenses, with trip balances tracked separately.
              </p>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 sm:w-56 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          )}
        </div>

        {/* Empty State or Table */}
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {search ? "No matching cash book records" : "No cash book records yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              {search
                ? "Try adjusting your search query."
                : "Record a receipt or expense to start tracking cash flow."}
            </p>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <Link
                href="/travel/payments"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
                <span>View Payments</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  <th className="py-2.5 px-3">DATE</th>
                  <th className="py-2.5 px-3">TRIP</th>
                  <th className="py-2.5 px-3">DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-right">CASH IN</th>
                  <th className="py-2.5 px-3 text-right">CASH OUT</th>
                  <th className="py-2.5 px-3 text-right">BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedEntries.map((entry) => {
                  const trip = entry.tripId ? tripsMap.get(entry.tripId) : null;
                  const hasCashIn = (entry.cashIn || 0) > 0;
                  const hasCashOut = (entry.cashOut || 0) > 0;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatDateShort(entry.date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          {trip ? trip.tripNumber : (entry.tripId ? `Trip #${entry.tripId.slice(0, 6)}` : "General / Fleet")}
                        </span>
                        {trip && (
                          <span className="text-[10px] text-slate-400 block">
                            {trip.customerName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-[260px] truncate text-[11px] text-slate-600">
                        {entry.description}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold">
                        {hasCashIn ? (
                          <span className="text-emerald-600">
                            +{formatINR(entry.cashIn)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold">
                        {hasCashOut ? (
                          <span className="text-rose-600">
                            -{formatINR(entry.cashOut)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatINR(entry.balance || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredEntries.length)} of{" "}
              {filteredEntries.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
