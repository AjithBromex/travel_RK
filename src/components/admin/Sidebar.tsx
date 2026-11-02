'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Bus,
  Wallet,
  Receipt,
  BookOpen,
  Bell,
  LogOut,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { MODULES, SLUGS } from '@/lib/admin/modules';

const ICONS: Record<string, React.ElementType> = {
  users: Users,
  vehicles: Car,
  trips: Bus,
  payments: Wallet,
  expenses: Receipt,
  cashbook: BookOpen,
  reminders: Bell,
};

export default function Sidebar() {
  const pathname = usePathname();

  const isNavActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-[#0A0F1D] text-slate-100 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800/80 z-20">
      {/* Brand Header - No images, pure SVG and typography */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="leading-tight overflow-hidden">
          <span className="text-xs font-black tracking-wider text-white uppercase block">
            RK TRAVEL HUB
          </span>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
            ADMIN PORTAL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </p>

        {/* Dashboard Link */}
        <Link
          href="/admin"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
            isNavActive('/admin')
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </Link>

        {/* Dynamic Modules Links */}
        {SLUGS.map((slug) => {
          const mod = MODULES[slug];
          const IconComponent = ICONS[slug] || LayoutDashboard;
          const href = `/admin/${slug}`;
          const active = isNavActive(href);

          return (
            <Link
              key={slug}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <IconComponent className="w-4 h-4 shrink-0" />
              <span>{mod.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 bg-[#0A0F1D]">
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
