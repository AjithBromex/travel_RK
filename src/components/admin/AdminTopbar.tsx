'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LayoutDashboard,
  Bus,
  Car,
  Wallet,
  Receipt,
  BookOpen,
  Bell,
  Users,
  Settings,
  LogOut,
  ArrowLeft,
  Search,
  Menu,
  X,
  ChevronDown,
  Trash2,
  Database,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Trips', href: '/admin/trips', icon: Bus },
  { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
  { name: 'Payments', href: '/admin/payments', icon: Wallet },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { name: 'Trash', href: '/admin/trash', icon: Trash2 },
  { name: 'Backups', href: '/admin/backups', icon: Database },
  { name: 'Users', href: '/admin/users', icon: Users },
];

export default function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNavActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-40 pt-2 sm:pt-3.5 pb-2 px-2.5 sm:px-4 md:px-6 lg:px-8 bg-transparent">
        <div className="max-w-[1520px] mx-auto flex flex-col gap-2">
          {/* Main Floating Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
            {/* 1. LEFT: PILL BRAND CAPSULE (NO IMAGES, PURE SVG) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="xl:hidden p-2 rounded-full bg-white/95 border border-slate-200/90 hover:bg-slate-100 text-slate-700 cursor-pointer shadow-xs transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              <Link
                href="/admin"
                className={`inline-flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all hover:scale-[1.01] active:scale-[0.99] select-none shrink-0 ${
                  scrolled
                    ? 'bg-white/95 border-slate-300/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)]'
                    : 'bg-white/95 border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.3]" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] sm:text-xs font-black tracking-wider text-slate-900 uppercase">
                    RK TRAVEL HUB
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] font-bold text-blue-600 uppercase tracking-widest hidden xs:inline">
                    ADMIN GOVERNANCE
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. CENTER: PILL NAVIGATION BAR (DESKTOP) */}
            <nav
              className={`hidden xl:inline-flex items-center p-1 rounded-full border transition-all ${
                scrolled
                  ? 'bg-white/95 border-slate-300/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)]'
                  : 'bg-white/95 border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
              }`}
            >
              {navItems.map((item) => {
                const active = isNavActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`inline-flex items-center gap-1.5 px-2.5 2xl:px-3.5 py-1 2xl:py-1.5 rounded-full text-[11px] 2xl:text-xs font-bold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-[#0D62FE] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* 3. RIGHT: PROFILE PILL */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Admin Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    scrolled
                      ? 'bg-white/95 border-slate-300/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)]'
                      : 'bg-white/95 border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-xs shrink-0">
                    AD
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-slate-900">ADMIN</span>
                    <span className="text-[9px] font-semibold text-slate-500">Administrator</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">Signed in as Admin</p>
                      <p className="text-[11px] text-slate-500 truncate">admin@gmail.com</p>
                    </div>

                    <div className="hidden sm:block py-1 border-b border-slate-100">
                      <Link
                        href="/admin/trash"
                        prefetch={true}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Trash & Recovery</span>
                      </Link>
                      <Link
                        href="/admin/backups"
                        prefetch={true}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <Database className="w-3.5 h-3.5 text-slate-500" />
                        <span>Backup & Recovery</span>
                      </Link>
                      <Link
                        href="/admin/audit-logs"
                        prefetch={true}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Audit Logs</span>
                      </Link>
                      <Link
                        href="/admin/settings"
                        prefetch={true}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1">
                      <form action="/api/logout" method="post">
                        <button
                          type="submit"
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl p-5 flex flex-col justify-between z-50 border-r border-slate-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">RK TRAVEL HUB</p>
                    <p className="text-[10px] font-semibold text-blue-600">ADMIN GOVERNANCE</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const active = isNavActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[#0D62FE] text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
