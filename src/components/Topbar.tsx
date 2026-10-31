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
  LayoutDashboard,
  Bus,
  Shuffle,
  Receipt,
  Wallet,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

const navLinks = [
  { name: "Dashboard", href: "/travel", icon: LayoutDashboard },
  { name: "Fleet & Vehicles", href: "/travel/vehicles", icon: Bus },
  { name: "Trips", href: "/travel/trips", icon: Shuffle },
  { name: "Payments", href: "/travel/payments", icon: Receipt },
  { name: "Expenses", href: "/travel/expenses", icon: Wallet },
  { name: "Cash Book", href: "/travel/cashbook", icon: BookOpen },
  { name: "Reports", href: "/travel/reports", icon: TrendingUp },
  { name: "Reminders", href: "/travel/reminders", icon: Bell },
  { name: "Settings", href: "/travel/settings", icon: Settings },
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
    <header className="sticky top-0 z-30 pt-3 sm:pt-4 pb-2.5 px-3 sm:px-6 lg:px-8 bg-transparent pointer-events-none">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-2.5 xl:gap-3.5 pointer-events-auto">
        {/* Left: Brand Capsule */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className={`lg:hidden p-2 rounded-full border transition-[box-shadow,background-color,border-color] duration-200 text-slate-700 cursor-pointer backdrop-blur-[12px] ${
              scrolled
                ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            }`}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link
            href="/travel"
            className="inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-[20px] bg-white/90 hover:bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99] select-none shrink-0"
          >
            {/* Official 3D RK Emblem */}
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

            {/* Wordmark & Tagline: matching mockups */}
            <div className="flex flex-col justify-center leading-none text-left">
              <span className="text-[12px] sm:text-[13px] font-black tracking-tight text-[#0F172A] uppercase leading-none">
                RK TRAVEL HUB
              </span>
              <span className="text-[8px] sm:text-[8.5px] font-extrabold tracking-[0.16em] text-slate-400 uppercase mt-0.5 leading-none">
                TRAVEL BEYOND BORDERS
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Executive Pill Navigation Bar with Icons (Desktop & Large Laptops) */}
        <nav
          className={`hidden lg:flex items-center gap-0.5 xl:gap-1 p-1 xl:p-1.5 rounded-full border transition-[box-shadow,background-color,border-color] duration-200 backdrop-blur-[12px] shrink-0 ${
            scrolled
              ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
              : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
          }`}
        >
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3.5 py-1.5 xl:py-1.5 rounded-full text-xs xl:text-[13px] transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#18181B] text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 font-semibold"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                <span>
                  {link.name === "Fleet & Vehicles" ? (
                    <>
                      <span className="hidden xl:inline">Fleet &amp; </span>Vehicles
                    </>
                  ) : (
                    link.name
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Notifications & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Search Pill */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search trips, vehicles, reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-36 md:w-44 xl:w-60 h-9 xl:h-9.5 pl-9 pr-3.5 border rounded-full text-xs xl:text-[12.5px] text-slate-800 placeholder:text-slate-400 transition-[box-shadow,background-color,border-color] duration-200 outline-none backdrop-blur-[12px] ${
                scrolled
                  ? "bg-slate-100/90 border-slate-300/80 shadow-[0_4px_12px_rgba(15,23,42,0.06)] focus:bg-white focus:border-blue-500"
                  : "bg-slate-100/80 border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.02)] focus:bg-white focus:border-blue-500"
              }`}
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`sm:hidden p-2 rounded-full border transition-[box-shadow,background-color,border-color] duration-200 text-slate-600 hover:bg-slate-100 backdrop-blur-[12px] ${
              scrolled
                ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
                : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            }`}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Bell Pill */}
          <Link
            href="/travel/reminders"
            prefetch={true}
            className={`w-9 h-9 xl:w-9.5 xl:h-9.5 rounded-full border flex items-center justify-center text-slate-700 transition-[box-shadow,background-color,border-color] duration-200 relative backdrop-blur-[12px] cursor-pointer ${
              scrolled
                ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:bg-slate-50"
                : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:bg-slate-50"
            }`}
            title="Reminders & Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
              2
            </span>
          </Link>

          {/* User Profile Capsule: Avatar + Name / Role + Chevron */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-[box-shadow,background-color,border-color] duration-200 backdrop-blur-[12px] cursor-pointer select-none ${
                scrolled
                  ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:bg-slate-50"
                  : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:bg-slate-50"
              }`}
            >
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-[#18181B] text-white flex items-center justify-center font-black text-xs uppercase shadow-xs shrink-0">
                {userName.charAt(0) || "A"}
              </div>

              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-400 capitalize leading-none mt-0.5">
                  {userRole}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-fade-in">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{userName}</p>
                  <p className="text-[10px] text-slate-400 capitalize tracking-wider">{userRole}</p>
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
          className={`inline-flex items-center gap-1 p-1 rounded-full border transition-[box-shadow,background-color,border-color] duration-200 backdrop-blur-[12px] whitespace-nowrap ${
            scrolled
              ? "bg-white/95 border-slate-300/80 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
              : "bg-white/90 border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
          }`}
        >
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  active
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-500"}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="mt-2 bg-white rounded-2xl border border-slate-200 p-2 flex items-center gap-2 sm:hidden shadow-lg animate-fade-in pointer-events-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Search trips, vehicles, reminders..."
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
