"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  X,
  ArrowRight,
  Bus,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Admin";
  const userRole = userProfile?.role || "Administrator";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
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
      <div className="max-w-[1520px] mx-auto">
        {/* Continuous Floating Pill Navigation Bar (Matching Original Design Reference) */}
        <div
          className={`w-full rounded-full border transition-[box-shadow,background-color,border-color] duration-200 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 xl:gap-3 ${
            scrolled
              ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.09)]"
              : "bg-white/95 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
          }`}
        >
          {/* 1. LEFT: BRAND EMBLEM & WORDMARK */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMobileSidebar}
              className="xl:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link
              href="/travel"
              className="inline-flex items-center gap-2 sm:gap-2.5 transition-transform hover:scale-[1.01] active:scale-[0.99] select-none shrink-0"
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

          {/* 2. CENTER: TEXT-ONLY NAVIGATION TABS (MATCHING REFERENCE MOCKUP EXACTLY) */}
          <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 shrink-0">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className={`px-3 py-1.5 rounded-full text-xs 2xl:text-[12.5px] transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#0B1E38] text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 font-semibold hover:bg-slate-100/70"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* 3. RIGHT: INTERACTIVE SEARCH BAR, NOTIFICATION BELL & USER PROFILE */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Desktop / Tablet Interactive Search Bar */}
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
                  className={`w-36 md:w-44 lg:w-48 xl:w-56 h-8 sm:h-8.5 pl-8 pr-7 rounded-full text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all ${
                    searchFocused
                      ? "bg-white border border-blue-500 shadow-md ring-2 ring-blue-500/10"
                      : "bg-[#EDF2F9] border border-slate-200/60 hover:bg-[#E4ECF6]"
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

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="sm:hidden w-8 h-8 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Notification Bell Pill */}
            <Link
              href="/travel/reminders"
              prefetch={true}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full border border-slate-200/80 hover:bg-slate-100/80 flex items-center justify-center text-slate-700 transition-colors relative cursor-pointer"
              title="Reminders & Alerts"
            >
              <Bell className="w-4 h-4" />
              {/* Subtle Notification Dot Badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Link>

            {/* User Profile Capsule */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-0.5 pr-2 rounded-full border border-slate-200/80 hover:bg-slate-100/80 transition-colors cursor-pointer select-none"
              >
                <div className="w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center font-black text-xs uppercase shadow-xs shrink-0">
                  {userName.charAt(0) || "A"}
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

        {/* Mobile / Tablet Horizontal Navigation Strip (< xl) */}
        <div className="xl:hidden w-full overflow-x-auto no-scrollbar pt-2 pb-0.5">
          <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-white/95 border border-slate-200/80 shadow-xs backdrop-blur-md whitespace-nowrap">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  prefetch={true}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    active
                      ? "bg-[#0B1E38] text-white font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Search Overlay Bar (< sm) */}
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
