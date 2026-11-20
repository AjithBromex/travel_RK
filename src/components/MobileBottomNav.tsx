"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bus,
  MapPin,
  CreditCard,
  Settings,
  MoreHorizontal,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  Users,
  ShieldCheck,
  ChevronRight,
  X,
  Trash2,
  Database,
  MessageSquare,
} from "lucide-react";

export default function MobileBottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Primary 4 Tabs shown in the Bottom Bar
  const primaryUserTabs = [
    { name: "Dashboard", href: "/travel", icon: LayoutDashboard },
    { name: "Fleet", href: "/travel/vehicles", icon: Bus },
    { name: "Trips", href: "/travel/trips", icon: MapPin },
    { name: "Payments", href: "/travel/payments", icon: CreditCard },
  ];

  const primaryAdminTabs = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Fleet", href: "/admin/vehicles", icon: Bus },
    { name: "Trips", href: "/admin/trips", icon: MapPin },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
  ];

  // Secondary pages accessible via the 5th "More" tab
  const moreUserPages = [
    { name: "Expenses", href: "/travel/expenses", icon: Receipt, desc: "Fuel, maintenance & operating costs" },
    { name: "Cash Book", href: "/travel/cashbook", icon: BookOpen, desc: "Daily cash ledger & receipts" },
    { name: "Reports", href: "/travel/reports", icon: BarChart3, desc: "Financial summary & trip analysis" },
    { name: "Reminders", href: "/travel/reminders", icon: Bell, desc: "Vehicle compliance & alerts" },
    { name: "Settings", href: "/travel/settings", icon: Settings, desc: "Agency preferences & credentials" },
  ];

  const moreAdminPages = [
    { name: "Expenses", href: "/admin/expenses", icon: Receipt, desc: "Operating expenses & audits" },
    { name: "Cash Book", href: "/admin/cashbook", icon: BookOpen, desc: "Master cashbook & registers" },
    { name: "WhatsApp Alerts", href: "/admin/whatsapp-reminders", icon: MessageSquare, desc: "Automated 5-day admin trip alerts" },
    { name: "Reminders", href: "/admin/reminders", icon: Bell, desc: "Compliance & vehicle documents" },
    { name: "Users", href: "/admin/users", icon: Users, desc: "Staff & user role permissions" },
    { name: "Trash & Recovery", href: "/admin/trash", icon: Trash2, desc: "Restore soft-deleted records" },
    { name: "Backup & Recovery", href: "/admin/backups", icon: Database, desc: "Snapshots & disaster recovery" },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck, desc: "Security trail & change history" },
    { name: "Settings", href: "/admin/settings", icon: Settings, desc: "Global admin preferences" },
  ];

  const primaryTabs = isAdmin ? primaryAdminTabs : primaryUserTabs;
  const morePages = isAdmin ? moreAdminPages : moreUserPages;

  const isActive = (href: string) => {
    if (href === "/travel" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isAnyMoreActive = morePages.some((p) => isActive(p.href));

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. ELEGANT BOTTOM SLIDE-UP DRAWER FOR REMAINING PAGES ("MORE")
          ───────────────────────────────────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />

          {/* Slide-up Card Container */}
          <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-[28px] border-t border-slate-200/90 shadow-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto animate-slide-up z-50">
            {/* Grab Bar Indicator */}
            <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center font-bold">
                  {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {isAdmin ? "Admin Modules" : "More Modules"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Quick access to all remaining hub sections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5">
              {morePages.map((page) => {
                const active = isActive(page.href);
                const Icon = page.icon;

                return (
                  <Link
                    key={page.name}
                    href={page.href}
                    prefetch={true}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      active
                        ? "bg-sky-50/80 border-sky-200 text-[#0284C7] shadow-xs"
                        : "bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/70 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-[#0284C7] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200/80"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black tracking-tight text-slate-900 truncate">
                          {page.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {page.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        active ? "text-[#0284C7] translate-x-0.5" : "text-slate-300"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. FIXED 5-TAB MOBILE BOTTOM NAVIGATION BAR
          ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Mobile Navigation"
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] select-none"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-center">
          {primaryTabs.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={`flex flex-col items-center justify-center py-1 px-1 transition-all group ${
                  active ? "text-[#0284C7]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-9 h-7 rounded-full transition-all ${
                    active ? "bg-sky-50 text-[#0284C7]" : "text-slate-500 group-hover:text-slate-700"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${active ? "stroke-[2.4] scale-105" : "stroke-[1.8]"}`} />
                </div>
                <span
                  className={`text-[10px] tracking-tight transition-all mt-0.5 ${
                    active ? "font-bold text-[#0284C7]" : "font-medium text-slate-500"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: "More" Action Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center py-1 px-1 transition-all group cursor-pointer ${
              moreOpen || isAnyMoreActive ? "text-[#0284C7]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div
              className={`relative flex items-center justify-center w-9 h-7 rounded-full transition-all ${
                moreOpen || isAnyMoreActive
                  ? "bg-sky-50 text-[#0284C7]"
                  : "text-slate-500 group-hover:text-slate-700"
              }`}
            >
              <MoreHorizontal
                className={`w-5 h-5 transition-transform ${
                  moreOpen || isAnyMoreActive ? "stroke-[2.4] scale-105" : "stroke-[1.8]"
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-all mt-0.5 ${
                moreOpen || isAnyMoreActive ? "font-bold text-[#0284C7]" : "font-medium text-slate-500"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
