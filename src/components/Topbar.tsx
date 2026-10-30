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
  Bus,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

export default function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const userName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Administrator";
  const userRole = userProfile?.role || "admin";

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
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const isLinkActive = (href: string) => {
    if (href === "/travel") return pathname === "/travel";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-30 pt-3.5 pb-2 px-3 sm:px-6 lg:px-8 bg-transparent pointer-events-none">
      <div className="max-w-[1560px] mx-auto flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Brand Capsule */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className={`lg:hidden p-2.5 rounded-full border transition-all text-slate-700 cursor-pointer backdrop-blur-xl ${
              scrolled
                ? "bg-white/95 border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                : "bg-white/90 border-slate-200/80 shadow-2xs"
            }`}
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link
            href="/travel"
            prefetch={true}
            className={`inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-full border transition-all text-slate-900 backdrop-blur-xl group hover:border-blue-300 ${
              scrolled
                ? "bg-white/95 border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                : "bg-white/90 border-slate-200/80 shadow-2xs"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Bus className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 font-display">
                RK Travel
              </span>
              <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100/60">
                Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Executive Frosted Glass Capsule Navigation Bar (Desktop & Laptops) */}
        <nav
          className={`hidden lg:flex items-center gap-1 p-1.5 rounded-full border transition-all duration-200 backdrop-blur-xl shrink-0 ${
            scrolled
              ? "bg-white/95 border-slate-200/90 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)]"
              : "bg-white/85 border-slate-200/80 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.04)]"
          }`}
        >
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`relative px-3.5 xl:px-4.5 py-1.5 xl:py-2 rounded-full text-xs xl:text-[13px] transition-all whitespace-nowrap ${
                  active
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-semibold"
                }`}
              >
                {link.name === "Fleet & Vehicles" ? (
                  <>
                    <span className="hidden xl:inline">Fleet &amp; </span>Vehicles
                  </>
                ) : (
                  link.name
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Notifications & Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search Capsule */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search trips, fleet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-36 md:w-44 xl:w-56 h-9 pl-9 pr-3.5 border rounded-full text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none backdrop-blur-xl ${
                scrolled
                  ? "bg-white/95 border-slate-200/90 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  : "bg-white/90 border-slate-200/80 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              }`}
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`sm:hidden p-2 rounded-full border transition-all text-slate-600 hover:bg-slate-100 backdrop-blur-xl ${
              scrolled
                ? "bg-white/95 border-slate-200/90 shadow-2xs"
                : "bg-white/90 border-slate-200/80 shadow-2xs"
            }`}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Button */}
          <Link
            href="/travel/reminders"
            prefetch={true}
            className={`w-9 h-9 rounded-full border flex items-center justify-center text-slate-700 transition-all relative backdrop-blur-xl hover:text-blue-600 ${
              scrolled
                ? "bg-white/95 border-slate-200/90 shadow-2xs hover:bg-slate-50"
                : "bg-white/90 border-slate-200/80 shadow-2xs hover:bg-slate-50"
            }`}
            title="Compliance Reminders"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          </Link>

          {/* User Profile Capsule */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-all backdrop-blur-xl hover:border-slate-300 cursor-pointer ${
                scrolled
                  ? "bg-white/95 border-slate-200/90 shadow-2xs"
                  : "bg-white/90 border-slate-200/80 shadow-2xs"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {userName.charAt(0) || "A"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 shadow-xl py-2 z-50 divide-y divide-slate-100"
                >
                  <div className="px-4 py-2.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {userName}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mt-0.5">
                      {userRole}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/travel/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settings</span>
                    </Link>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={async () => {
                        setProfileOpen(false);
                        await signOut();
                        router.push("/login");
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors w-full text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Pill Navigation Strip (< lg) */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar pt-2.5 pb-0.5 pointer-events-auto">
        <nav
          className={`inline-flex items-center gap-1 p-1 rounded-full border transition-all backdrop-blur-xl whitespace-nowrap ${
            scrolled
              ? "bg-white/95 border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
              : "bg-white/90 border-slate-200/80 shadow-2xs"
          }`}
        >
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Search Input */}
      {searchOpen && (
        <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-2 flex items-center gap-2 sm:hidden shadow-lg animate-fade-in pointer-events-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search trips, fleet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 h-8 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
          />
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}
    </header>
  );
}
