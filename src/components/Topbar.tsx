"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthContext";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export default function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const router = useRouter();
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

  return (
    <header className="sticky top-0 z-30 h-[68px] bg-white/75 backdrop-blur-md border-b border-border/80 flex items-center justify-between px-4 lg:px-8 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center relative">
          <Search className="absolute left-3 w-4 h-4 text-text-muted" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search trips, vehicles, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[280px] lg:w-[340px] h-9 pl-9 pr-4 bg-slate-100/70 backdrop-blur-xs border border-border/80 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="sm:hidden p-2 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link
          href="/travel/reminders"
          className="relative p-2 rounded-lg hover:bg-slate-100 text-text-secondary transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </Link>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
              {userName.charAt(0) || "A"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-text-primary leading-tight">{userName}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">{userRole}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden md:block" />
          </button>

          {/* Dropdown with Frosted Glass */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-xl border border-border/90 shadow-xl py-1.5 z-50 animate-fade-in">
              <div className="px-3.5 py-2 border-b border-border">
                <p className="text-xs font-semibold text-text-primary">{userName}</p>
                <p className="text-[11px] text-text-muted capitalize">{userRole}</p>
              </div>
              <Link
                href="/travel/settings"
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors"
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
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-danger hover:bg-danger-subtle transition-colors w-full text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 h-[72px] bg-white border-b border-border flex items-center px-4 gap-3 sm:hidden z-40 animate-fade-in">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 h-10 text-sm text-text-primary placeholder:text-text-muted bg-transparent focus:outline-none"
          />
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      )}
    </header>
  );
}
