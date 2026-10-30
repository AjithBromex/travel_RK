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

  const userName = userProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Administrator";
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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
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
    <header className="sticky top-0 z-30 pt-4 pb-2.5 px-3 sm:px-6 lg:px-8 bg-transparent pointer-events-none">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Brand Capsule */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMobileSidebar}
            className={`lg:hidden p-2.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out text-slate-700 cursor-pointer backdrop-blur-[12px] ${
              scrolled
                ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-slate-200/90 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
            }`}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          <Link
            href="/travel"
            className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out text-slate-900 backdrop-blur-[12px] ${
              scrolled
                ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-slate-200/90 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
            }`}
          >
            <div className="w-7 h-7 relative shrink-0">
              <Image
                src="/images/rk-logo.png"
                alt="RK Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="text-xs font-black tracking-wider uppercase text-slate-900 block">
                RK TRAVEL HUB
              </span>
              <span className="text-[7.5px] font-bold tracking-[0.2em] uppercase text-slate-500 block">
                TRAVEL BEYOND BORDERS
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Executive Pill Navigation Bar (Desktop & Large Laptops) */}
        <nav
          className={`hidden lg:flex items-center gap-1 xl:gap-1.5 p-1 xl:p-1.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out backdrop-blur-[12px] shrink-0 ${
            scrolled
              ? "scrolled bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
              : "bg-slate-200/80 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
          }`}
        >
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`px-3 xl:px-4.5 py-1.5 xl:py-2 rounded-full text-xs xl:text-sm transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#0B3A78] text-white font-bold shadow-sm"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white/60 font-semibold"
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
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Search Pill */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search trips, fleet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-36 md:w-44 xl:w-56 h-9 xl:h-9.5 pl-9.5 pr-3.5 border rounded-full text-xs xl:text-[13px] text-slate-800 placeholder:text-slate-400 transition-[box-shadow,background-color,border-color] duration-250 ease-out outline-none backdrop-blur-[12px] ${
                scrolled
                  ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)] focus:bg-white"
                  : "bg-slate-200/90 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)] focus:bg-white"
              }`}
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`sm:hidden p-2.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out text-slate-600 hover:bg-slate-300 backdrop-blur-[12px] ${
              scrolled
                ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-slate-200/80 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
            }`}
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Notifications Pill */}
          <Link
            href="/travel/reminders"
            prefetch={true}
            className={`w-9.5 h-9.5 rounded-full border flex items-center justify-center text-slate-700 transition-[box-shadow,background-color,border-color] duration-250 ease-out relative backdrop-blur-[12px] ${
              scrolled
                ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:bg-slate-300"
                : "bg-slate-200/90 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:bg-slate-300"
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              1
            </span>
          </Link>

          {/* User Profile Capsule */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out backdrop-blur-[12px] ${
                scrolled
                  ? "bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:bg-slate-300"
                  : "bg-slate-200/90 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:bg-slate-300"
              }`}
            >
              <div className="w-6.5 h-6.5 rounded-full bg-[#18181B] text-white flex items-center justify-center font-bold text-xs uppercase">
                {userName.charAt(0) || "A"}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{userName}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{userRole}</p>
                </div>
                <Link
                  href="/travel/settings"
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors w-full text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Pill Navigation Strip (< lg) */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar pt-2.5 pb-0.5 pointer-events-auto">
        <nav
          className={`inline-flex items-center gap-1 p-1 rounded-full border transition-[box-shadow,background-color,border-color] duration-250 ease-out backdrop-blur-[12px] whitespace-nowrap ${
            scrolled
              ? "scrolled bg-slate-200/95 border-slate-300/70 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
              : "bg-slate-200/85 border-slate-300/50 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
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
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-white/50"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-2 flex items-center gap-2 sm:hidden shadow-lg animate-fade-in">
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
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}
    </header>
  );
}
