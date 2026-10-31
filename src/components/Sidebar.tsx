"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Bus,
  Car,
  Wallet,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

const navItems = [
  { name: "Dashboard", href: "/travel", icon: LayoutDashboard },
  { name: "Trips", href: "/travel/trips", icon: Bus },
  { name: "Vehicles", href: "/travel/vehicles", icon: Car },
  { name: "Payments", href: "/travel/payments", icon: Wallet },
  { name: "Expenses", href: "/travel/expenses", icon: Receipt },
  { name: "Cash Book", href: "/travel/cashbook", icon: BookOpen },
  { name: "Reports", href: "/travel/reports", icon: BarChart3 },
  { name: "Reminders", href: "/travel/reminders", icon: Bell },
  { name: "Settings", href: "/travel/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);

  // Clear pending state during render when pathname changes
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setPendingHref(null);
  }

  const isActive = (href: string) => {
    if (pendingHref) {
      return pendingHref === href;
    }
    if (href === "/travel") return pathname === "/travel";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar with Dark Frosted Glass */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen flex flex-col
          bg-[#0A0F1D]/92 backdrop-blur-xl text-slate-100 transition-all duration-300 ease-in-out border-r border-slate-800/70
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
          w-[260px]
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 h-[68px] shrink-0 border-b border-slate-800/80">
          <div className="w-8 h-8 relative shrink-0">
            <Image
              src="/images/rk-logo.png"
              alt="RK Logo"
              fill
              className="object-contain"
            />
          </div>
          {!collapsed && (
            <div className="overflow-hidden leading-none">
              <h1 className="text-xs font-black tracking-wider text-white uppercase">
                RK TRAVEL HUB
              </h1>
            </div>
          )}
          {/* Mobile close */}
          <button
            onClick={onCloseMobile}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2.5">
              Operations Menu
            </p>
          )}
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  setPendingHref(item.href);
                  onCloseMobile();
                }}
                title={collapsed ? item.name : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-150 group relative
                  ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25 border border-blue-400/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <item.icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {!collapsed && <span>{item.name}</span>}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg border border-slate-700">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="px-3 py-2 border-t border-slate-800/80">
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-full h-9 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs gap-2"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px] font-medium text-slate-400">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom operational status */}
        <div className="px-3.5 py-3 border-t border-slate-800/80 bg-slate-950/40">
          {!collapsed ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-slate-300">System Connected</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-slate-500" />
                <span>Fleet Operations v0.1.0</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="System Connected (v0.1.0)">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
