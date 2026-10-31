"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  X,
  ArrowRight,
  Bus,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getReminders } from "@/services/reminders.service";
import { getVehicles } from "@/services/vehicles.service";

interface UrgentAlert {
  id: string;
  title: string;
  message: string;
  dueDate: string;
  status: "overdue" | "due_today" | "due_soon";
  daysText: string;
  category?: string;
}

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

const navLinks = [
  { name: "Dashboard", href: "/travel" },
  { name: "Fleet & Vehicles", href: "/travel/vehicles" },
  { name: "Trips", href: "/travel/trips" },
  { name: "Payments", href: "/travel/payments" },
  { name: "Expenses", href: "/travel/expenses" },
  { name: "Cash Book", href: "/travel/cashbook" },
  { name: "Reports", href: "/travel/reports" },
  { name: "Reminders", href: "/travel/reminders" },
  { name: "Settings", href: "/travel/settings" },
];

const searchableSections = [
  { name: "Dashboard", href: "/travel", desc: "Operations Hub & Performance Overview", icon: FileText, keywords: ["home", "metrics", "stats", "overview"] },
  { name: "Fleet & Vehicles", href: "/travel/vehicles", desc: "Fleet directory, maintenance & vehicle docs", icon: Bus, keywords: ["cars", "buses", "tempo", "traveller", "fleet", "service", "km"] },
  { name: "Trips & Bookings", href: "/travel/trips", desc: "Trip dispatches, route bookings & settlements", icon: MapPin, keywords: ["trips", "routes", "bookings", "dispatch", "customers", "fare"] },
  { name: "Payments Ledger", href: "/travel/payments", desc: "Customer collections, driver payouts & receipts", icon: FileText, keywords: ["payments", "receipts", "settlements", "inflow", "payouts", "driver dues"] },
  { name: "Operating Expenses", href: "/travel/expenses", desc: "Fuel, toll charges, food & fleet upkeep", icon: FileText, keywords: ["expenses", "fuel", "diesel", "tolls", "food", "maintenance"] },
  { name: "Cash Book", href: "/travel/cashbook", desc: "Daily cash daybook, inflow/outflow ledger", icon: FileText, keywords: ["cash", "book", "cashbook", "ledger", "petty cash", "balance"] },
  { name: "Reports & Analytics", href: "/travel/reports", desc: "Financial statements, profit margins & corridor analysis", icon: FileText, keywords: ["reports", "profit", "revenue", "financial", "margin", "p&l"] },
  { name: "Reminders & Compliance", href: "/travel/reminders", desc: "Insurance, permit, tax & maintenance alerts", icon: Calendar, keywords: ["reminders", "insurance", "fitness", "pollution", "tax", "permit", "compliance"] },
  { name: "Agency Settings", href: "/travel/settings", desc: "Agency profile, rate card, security & team preferences", icon: Settings, keywords: ["settings", "profile", "password", "agency", "security", "preferences"] },
];

export default function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlert[]>([]);
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [clientUsername, setClientUsername] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rk_login_username");
      if (stored) {
        setClientUsername(stored);
      }
    }
  }, []);

  const rawUserName =
    clientUsername ||
    user?.email?.split("@")[0] ||
    userProfile?.userId ||
    "ADMIN";
  const userName = rawUserName.toUpperCase();
  const userRole = userProfile?.role || "Staff";

  // Load urgent & near-date reminders / compliance alerts
  useEffect(() => {
    let isMounted = true;

    async function loadAlerts() {
      try {
        const [reminders, vehicles] = await Promise.all([
          getReminders(50).catch(() => []),
          getVehicles(50).catch(() => []),
        ]);

        if (!isMounted) return;

        const alerts: UrgentAlert[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        // 1. Check explicit Reminders from Firestore
        reminders.forEach((r) => {
          if (r.status === "completed") return;
          if (!r.dueDate) return;

          const dueDateObj = new Date(r.dueDate);
          dueDateObj.setHours(0, 0, 0, 0);
          const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Only consider important / near to the date (overdue or within 7 days)
          if (diffDays <= 7) {
            let status: UrgentAlert["status"] = "due_soon";
            let daysText = `Due in ${diffDays} days`;

            if (diffDays < 0) {
              status = "overdue";
              daysText = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
            } else if (diffDays === 0) {
              status = "due_today";
              daysText = "Due today";
            } else if (diffDays === 1) {
              daysText = "Due tomorrow";
            }

            alerts.push({
              id: `rem-${r.id}`,
              title: r.title,
              message: r.notes || `${r.category ? r.category.replace("_", " ") : "Scheduled"} task requires immediate attention`,
              dueDate: r.dueDate,
              status,
              daysText,
              category: r.category,
            });
          }
        });

        // 2. Check Vehicle compliance documents (Insurance, Permit, Pollution, Fitness)
        vehicles.forEach((v) => {
          const docChecks = [
            { label: "Insurance Expiry", date: v.insuranceExpiry },
            { label: "Permit Expiry", date: v.permitExpiry },
            { label: "Pollution (PUC) Expiry", date: v.pollutionExpiry },
          ];

          docChecks.forEach((chk) => {
            if (!chk.date) return;
            const expDate = new Date(chk.date);
            expDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) {
              let status: UrgentAlert["status"] = "due_soon";
              let daysText = `Expires in ${diffDays} days`;

              if (diffDays < 0) {
                status = "overdue";
                daysText = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
              } else if (diffDays === 0) {
                status = "due_today";
                daysText = "Expires today";
              } else if (diffDays === 1) {
                daysText = "Expires tomorrow";
              }

              alerts.push({
                id: `veh-${v.id}-${chk.label}`,
                title: `${v.registrationNumber} - ${chk.label}`,
                message: `${v.name || "Fleet Vehicle"}: ${chk.label} is ${diffDays < 0 ? "expired" : "due for renewal"}.`,
                dueDate: chk.date,
                status,
                daysText,
                category: "compliance",
              });
            }
          });

          // Also check if vehicle status is flagged as service_due
          if (v.status === "service_due") {
            alerts.push({
              id: `veh-service-${v.id}`,
              title: `${v.registrationNumber} - Service Due`,
              message: `${v.name || "Vehicle"} is flagged for periodic service maintenance.`,
              dueDate: todayStr,
              status: "due_today",
              daysText: "Service overdue",
              category: "maintenance",
            });
          }
        });

        // Sort: Overdue first, then due today, then due soon
        alerts.sort((a, b) => {
          const rank = { overdue: 0, due_today: 1, due_soon: 2 };
          if (rank[a.status] !== rank[b.status]) {
            return rank[a.status] - rank[b.status];
          }
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        setUrgentAlerts(alerts);
      } catch (err) {
        console.error("Failed to load reminder alerts:", err);
      }
    }

    loadAlerts();

    // Re-check periodically every 60 seconds
    const interval = setInterval(loadAlerts, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === "/travel") return pathname === "/travel";
    return pathname.startsWith(href);
  };

  const filteredSuggestions = searchQuery.trim()
    ? searchableSections.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      })
    : [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (filteredSuggestions.length > 0) {
      router.push(filteredSuggestions[0].href);
    } else {
      router.push(`/travel/trips?search=${encodeURIComponent(query)}`);
    }
    setSearchFocused(false);
    setSearchOpen(false);
  };

  const handleSearchSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchFocused(false);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 pt-3 sm:pt-4 pb-2 px-3 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-[1520px] mx-auto flex flex-col gap-2">
        {/* Main Floating Row */}
        <div className="flex items-center justify-between gap-3 w-full">
          {/* 1. LEFT: PILL-SHAPED BRAND CAPSULE */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-full bg-white/95 border border-slate-200/90 hover:bg-slate-100 text-slate-700 cursor-pointer shadow-xs transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link
              href="/travel"
              className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 sm:py-2 rounded-full border transition-all hover:scale-[1.01] active:scale-[0.99] select-none shrink-0 backdrop-blur-md ${
                scrolled
                  ? "bg-white/95 border-slate-300/90 shadow-[0_6px_20px_rgba(15,23,42,0.08)]"
                  : "bg-white/95 border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
              }`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 relative shrink-0">
                <Image
                  src="/images/rk-logo.png"
                  alt="RK Travel Hub"
                  fill
                  priority
                  unoptimized
                  className="object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                />
              </div>

              <div className="flex flex-col justify-center leading-none text-left">
                <span className="text-[12px] sm:text-[13px] font-black tracking-tight text-[#0F172A] uppercase leading-none">
                  RK TRAVEL HUB
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-extrabold tracking-[0.16em] text-slate-400 uppercase mt-0.5 leading-none">
                  TRAVEL BEYOND BORDERS
                </span>
              </div>
            </Link>
          </div>

          {/* 2. CENTER: DEDICATED PILL-SHAPED NAVBAR (MATCHING REFERENCE MOCKUP EXACTLY) */}
          <nav
            className={`hidden lg:flex items-center gap-1 p-1 sm:p-1.5 rounded-full border transition-all duration-200 backdrop-blur-md shrink-0 ${
              scrolled
                ? "bg-white/95 border-slate-300/90 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-white/95 border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)]"
            }`}
          >
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap select-none ${
                    active
                      ? "bg-[#0B1E38] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* 3. RIGHT: PILL SEARCH, NOTIFICATION BELL & USER PROFILE */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Desktop / Tablet Interactive Pill Search */}
            <div ref={searchContainerRef} className="hidden sm:block relative">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search trips, fleet..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchFocused(false);
                    }
                  }}
                  className={`w-36 md:w-44 lg:w-48 xl:w-56 h-8 sm:h-9 pl-8 pr-7 rounded-full text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all ${
                    searchFocused
                      ? "bg-white border border-blue-500 shadow-md ring-2 ring-blue-500/10"
                      : "bg-white/95 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.05)] hover:border-slate-300"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </form>

              {/* Instant Search Suggestions Dropdown */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-fade-in p-1.5">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Results
                  </div>
                  {filteredSuggestions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching pages. Press Enter to search records.
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredSuggestions.slice(0, 4).map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.href}
                            type="button"
                            onClick={() => handleSearchSelect(item.href)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <span>Search &quot;{searchQuery}&quot; in Trips</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="sm:hidden w-8 h-8 rounded-full bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Notification Bell with Conditional Alert Dot & Interactive Dropdown */}
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 border transition-all flex items-center justify-center text-slate-700 relative cursor-pointer backdrop-blur-md shadow-[0_4px_16px_rgba(15,23,42,0.05)] hover:bg-slate-100/80 active:scale-95 ${
                  notificationsOpen ? "ring-2 ring-blue-500/30 border-blue-400" : "border-slate-200/90"
                }`}
                title={
                  urgentAlerts.length > 0
                    ? `${urgentAlerts.length} important reminder${urgentAlerts.length > 1 ? "s" : ""}`
                    : "Reminders & Alerts"
                }
                aria-label="Reminders and Alerts"
              >
                <Bell className={`w-4 h-4 transition-colors ${urgentAlerts.length > 0 ? "text-slate-900" : "text-slate-600"}`} />

                {/* ONLY SHOWS WHEN IMPORTANT REMINDER IS DUE OR NEAR TO THE DATE */}
                {urgentAlerts.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                  </span>
                )}
              </button>

              {/* Reminders Floating Popup Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/98 backdrop-blur-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-fade-in origin-top-right">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold tracking-tight">Reminders &amp; Alerts</h4>
                        <p className="text-[10px] text-slate-300 font-medium">
                          {urgentAlerts.length > 0
                            ? `${urgentAlerts.length} important reminder${urgentAlerts.length > 1 ? "s" : ""}`
                            : "All reminders clear"}
                        </p>
                      </div>
                    </div>
                    {urgentAlerts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                        {urgentAlerts.length} Urgent
                      </span>
                    )}
                  </div>

                  {/* Body: List of urgent reminders */}
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                    {urgentAlerts.length > 0 ? (
                      urgentAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            router.push("/travel/reminders");
                          }}
                          className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-3"
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              alert.status === "overdue"
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : alert.status === "due_today"
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                            }`}
                          >
                            {alert.status === "overdue" ? (
                              <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : alert.status === "due_today" ? (
                              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {alert.title}
                              </p>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0 ${
                                  alert.status === "overdue"
                                    ? "bg-rose-100 text-rose-800"
                                    : alert.status === "due_today"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {alert.daysText}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {alert.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono-nums">
                              Due: {alert.dueDate}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                          <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">No Urgent Reminders</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          All fleet documents and schedules are currently up to date.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer: Navigate to Reminders Page */}
                  <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 px-1.5">
                      Click any reminder to view
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        router.push("/travel/reminders");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Go to Reminders</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill Capsule */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-0.5 pr-2.5 rounded-full bg-white/95 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.05)] hover:bg-slate-100/80 transition-colors cursor-pointer select-none backdrop-blur-md"
              >
                <div className="w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center font-black text-xs uppercase shadow-xs shrink-0">
                  {userName.charAt(0) || "A"}
                </div>
                <div className="hidden xl:flex flex-col text-left leading-none">
                  <span className="text-[11px] font-bold text-slate-900 leading-tight">
                    {userName}
                  </span>
                  <span className="text-[9px] text-slate-400 capitalize leading-none mt-0.5">
                    {userRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{userName}</p>
                    <p className="text-[10px] text-slate-400 capitalize tracking-wider">{userRole}</p>
                  </div>
                  <Link
                    href="/travel/settings"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("rk_login_username");
                      }
                      await signOut();
                      router.push("/login");
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors w-full text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Dedicated Pill-shaped Navbar Strip (< lg) */}
        <div className="lg:hidden w-full overflow-x-auto no-scrollbar pt-1 pb-0.5 flex justify-center">
          <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-white/95 border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-md whitespace-nowrap">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    active
                      ? "bg-[#0B1E38] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Search Overlay Input (< sm) */}
        {searchOpen && (
          <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-2 sm:hidden shadow-lg animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Search trips, fleet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 h-8 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
