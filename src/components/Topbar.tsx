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

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

const navLinks = [
  { name: "Dashboard", href: "/travel" },
  { name: "Fleet & Vehicles", href: "/travel/vehicles" },
  { name: "Trips", href: "/travel/trips" },
  { name: "Payments", href: "/travel/payments" },
  { name: "Cash Book", href: "/travel/cashbook" },
  { name: "Reports", href: "/travel/reports" },
  { name: "Settings", href: "/travel/settings" },
];

export default function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const userName = userProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Administrator";
  const userRole = userProfile?.role || "admin";

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
    <header className="sticky top-0 z-30 pt-3 pb-2 px-3 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Capsule */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link
            href="/travel"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/90 hover:bg-slate-300/80 transition-all text-slate-900 border border-slate-300/40 shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-[#18181B] text-white flex items-center justify-center">
              <Bus className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-tight text-slate-900">RK Travel</span>
          </Link>
        </div>

        {/* Center: Executive Pill Navigation Bar (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-200/80 p-1 rounded-full border border-slate-300/50 shadow-xs">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={true}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? "bg-[#18181B] text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Notifications & Profile */}
        <div className="flex items-center gap-2">
          {/* Search Pill */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search trips, fleet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 lg:w-56 h-8 pl-8 pr-3 bg-slate-200/80 hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 border border-slate-300/50 rounded-full text-xs text-slate-800 placeholder:text-slate-400 transition-all outline-none"
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden p-2 rounded-full bg-slate-200/80 text-slate-600 hover:bg-slate-300 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Pill */}
          <Link
            href="/travel/reminders"
            prefetch={true}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
          </Link>

          {/* User Profile Capsule */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-200/80 hover:bg-slate-300 transition-colors border border-slate-300/40"
            >
              <div className="w-6 h-6 rounded-full bg-[#18181B] text-white flex items-center justify-center font-bold text-[10px] uppercase">
                {userName.charAt(0) || "A"}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500" />
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
