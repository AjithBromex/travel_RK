import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Database,
  ScrollText,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/adminSession";
import { logoutAction } from "@/app/admin/actions";

const items = [
  ["Overview", "/admin", LayoutDashboard],
  ["Users", "/admin/users", Users],
  ["All Data", "/admin/data", Database],
  ["Audit Log", "/admin/audit", ScrollText],
] as const;

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900 md:flex font-sans">
      {/* ─── Dedicated Admin Navigation Sidebar ─── */}
      <aside className="flex shrink-0 flex-col bg-[#0f2f78] p-5 text-white md:min-h-screen md:w-64 border-r border-blue-900/40 shadow-xl">
        {/* Header branding */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20">
              <Image
                src="/images/rk-logo.png"
                alt="RK Logo"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-white uppercase">
                RK TRAVEL HUB
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  ADMIN
                </span>
                <span className="text-[10px] text-blue-200/80 font-semibold">
                  CONSOLE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col">
          {items.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-all"
            >
              <Icon className="h-4 w-4 text-blue-300" /> {label}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-white/10">
            <Link
              href="/travel"
              className="flex shrink-0 items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold text-blue-200 hover:bg-white/10 hover:text-white transition-all"
            >
              <span>User Travel Hub</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-300" />
            </Link>
          </div>
        </nav>

        {/* Footer info & Visible Sign out button */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="truncate text-xs font-medium text-white/80">
              {admin.email}
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
