"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  X,
  Bus,
  Check,
  MapPin,
  User,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import type { Trip } from "@/types";
import { formatINR } from "@/lib/utils";

interface SearchableTripSelectProps {
  trips: Trip[];
  value: string;
  onChange: (tripId: string, trip?: Trip) => void;
  placeholder?: string;
  unlinkedLabel?: string;
  showDueBadge?: boolean;
  className?: string;
  requiredTrip?: boolean;
}

export default function SearchableTripSelect({
  trips = [],
  value,
  onChange,
  placeholder = "Search and select trip booking...",
  unlinkedLabel = "🔍 General / Unlinked (No Trip Linked)",
  showDueBadge = true,
  className = "",
  requiredTrip = false,
}: SearchableTripSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Find currently selected trip
  const selectedTrip = useMemo(() => {
    if (!value || value === "general") return null;
    return trips.find(
      (t) =>
        t.id === value ||
        t.tripNumber === value ||
        (t.receiptNumber && t.receiptNumber === value)
    );
  }, [trips, value]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    if (!search.trim()) return trips;
    const q = search.toLowerCase().trim();
    return trips.filter((t) => {
      const matchTripNo = t.tripNumber && t.tripNumber.toLowerCase().includes(q);
      const matchReceipt = t.receiptNumber && t.receiptNumber.toLowerCase().includes(q);
      const matchCustomer = t.customerName && t.customerName.toLowerCase().includes(q);
      const matchPhone = t.customerPhone && t.customerPhone.includes(q);
      const matchDriver = t.driverName && t.driverName.toLowerCase().includes(q);
      const matchDriverPhone = t.driverPhone && t.driverPhone.includes(q);
      const matchFrom = t.from && t.from.toLowerCase().includes(q);
      const matchTo = t.to && t.to.toLowerCase().includes(q);
      const matchVeh = t.vehicleName && t.vehicleName.toLowerCase().includes(q);
      const matchId = t.id && t.id.toLowerCase().includes(q);

      return (
        matchTripNo ||
        matchReceipt ||
        matchCustomer ||
        matchPhone ||
        matchDriver ||
        matchDriverPhone ||
        matchFrom ||
        matchTo ||
        matchVeh ||
        matchId
      );
    });
  }, [trips, search]);

  const handleSelect = (tripId: string, trip?: Trip) => {
    onChange(tripId, trip);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10 bg-white"
            : selectedTrip
            ? "border-blue-200 bg-blue-50/20 text-slate-900"
            : requiredTrip
            ? "border-amber-300/80 bg-amber-50/40 hover:bg-amber-50/70 text-amber-900 shadow-2xs"
            : "border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {requiredTrip && !selectedTrip ? (
            <Bus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <Bus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          )}
          {selectedTrip ? (
            <div className="truncate text-left flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-blue-700 font-mono">
                {selectedTrip.receiptNumber || selectedTrip.tripNumber || `#${selectedTrip.id.slice(0, 5)}`}
              </span>
              <span className="text-slate-400 font-normal">•</span>
              <span className="font-bold text-slate-800">
                {selectedTrip.customerName || "Customer"}
              </span>
              <span className="text-slate-500 text-[11px] truncate">
                ({selectedTrip.from || "Origin"} → {selectedTrip.to || "Destination"})
              </span>
              {Number((selectedTrip as any).totalExpenses) > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded-md">
                  +{formatINR(Number((selectedTrip as any).totalExpenses))} exp
                </span>
              )}
              {showDueBadge && (
                (() => {
                  const tTotal = Number(selectedTrip.totalFare) || 0;
                  const tPaid = Number(selectedTrip.customerPaid) || 0;
                  const hasExplicitBalance = selectedTrip.customerBalance !== undefined && selectedTrip.customerBalance !== null;
                  const effBal = hasExplicitBalance ? Number(selectedTrip.customerBalance) : Math.max(0, tTotal - tPaid);
                  if (effBal > 0) {
                    return (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-md">
                        Due {formatINR(effBal)}
                      </span>
                    );
                  }
                  if (tTotal > 0 && (tPaid >= tTotal || effBal === 0)) {
                    return (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-md">
                        Paid
                      </span>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          ) : requiredTrip ? (
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">{placeholder || "Select a Trip Booking (Required) *"}</span>
            </div>
          ) : (
            <span className="text-slate-600 font-medium truncate">
              {unlinkedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedTrip && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Trips List Container */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {/* General / Unlinked Option (only allowed when trip is not strictly required) */}
            {!requiredTrip && (
              <div
                onClick={() => handleSelect("", undefined)}
                className={`p-2.5 hover:bg-blue-50/60 transition-colors cursor-pointer flex items-center justify-between ${
                  !value || value === "general" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    🔍
                  </span>
                  <div>
                    <p className="font-semibold text-xs leading-tight">{unlinkedLabel}</p>
                    <p className="text-[10px] text-slate-400">Record without linking to any specific trip</p>
                  </div>
                </div>
                {(!value || value === "general") && (
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
              </div>
            )}

            {/* Matching Trips */}
            {trips.length === 0 ? (
              <div className="p-4 text-center text-amber-700 bg-amber-50/50 space-y-1">
                <AlertCircle className="w-4 h-4 text-amber-600 mx-auto" />
                <p className="text-xs font-bold">No active trip bookings found</p>
                <p className="text-[10px] text-amber-600">Please create a trip first before linking payments.</p>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="p-4 text-center text-slate-400 space-y-1">
                <p className="text-xs font-semibold">No trips matching &ldquo;{search}&rdquo;</p>
                <p className="text-[10px] text-slate-400">Try searching by receipt number, customer, route, or vehicle</p>
              </div>
            ) : (
              filteredTrips.map((trip) => {
                const isSelected =
                  trip.id === value ||
                  trip.tripNumber === value ||
                  (trip.receiptNumber && trip.receiptNumber === value);
                const totalFare = Number(trip.totalFare ?? (Number(trip.baseFare || 0) + Number(trip.extraKmCharge || 0))) || 0;
                const customerPaid = Number(trip.customerPaid) || 0;
                const hasExplicitBalance = trip.customerBalance !== undefined && trip.customerBalance !== null;
                const effectiveBalance = hasExplicitBalance ? Number(trip.customerBalance) : Math.max(0, totalFare - customerPaid);
                const isPaid = effectiveBalance === 0 || (totalFare > 0 && customerPaid >= totalFare);
                const hasDue = effectiveBalance > 0;

                return (
                  <div
                    key={trip.id}
                    onClick={() => handleSelect(trip.tripNumber || trip.id, trip)}
                    className={`p-2.5 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected ? "bg-blue-50/90 text-blue-900" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-800 font-mono text-[10px] font-black">
                          {trip.receiptNumber || trip.tripNumber || `#${trip.id.slice(0, 5)}`}
                        </span>
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {trip.customerName || "Customer"}
                        </span>
                        {trip.customerPhone && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({trip.customerPhone})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {trip.from || "Start"} → {trip.to || "End"}
                        </span>
                        {trip.vehicleName && (
                          <span className="text-slate-400 text-[10px] truncate">
                            • {trip.vehicleName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <span className="block text-xs font-bold text-slate-800 font-mono-nums">
                          {formatINR(totalFare)}
                        </span>
                        {Number((trip as any).totalExpenses) > 0 && (
                          <span className="text-[9px] font-bold text-rose-600 block">
                            +{formatINR(Number((trip as any).totalExpenses))} exp
                          </span>
                        )}
                        {showDueBadge && (
                          <div className="mt-0.5">
                            {hasDue ? (
                              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.2 rounded">
                                Due {formatINR(effectiveBalance)}
                              </span>
                            ) : isPaid ? (
                              <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded">
                                Paid
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Count */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              {filteredTrips.length} {filteredTrips.length === 1 ? "trip" : "trips"} available
            </span>
            {search && (
              <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setSearch("")}>
                Reset filter
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
