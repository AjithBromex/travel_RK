import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/admin/server';
import SignOutButton from './SignOutButton';
import Link from 'next/link';
import { Shield, ArrowUpRight, Bus, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-2">
              <span>RK Travels Admin</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-200/60">
                Governance
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User Portal Link */}
          <Link
            href="/travel"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 transition-colors"
            title="Open Operational User Pages"
          >
            <Bus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open User Portal</span>
            <span className="sm:hidden">Portal</span>
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </Link>

          <span className="hidden md:inline text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {admin.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
