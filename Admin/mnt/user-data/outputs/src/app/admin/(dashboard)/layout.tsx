import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/admin/server';
import SignOutButton from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin(); // second, server-side check (proxy is the first)
  if (!admin) redirect('/admin/login');
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <span className="font-semibold text-slate-900">RK Travels Admin</span>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:inline">{admin.email}</span><SignOutButton /></div>
      </header>
      {children}
    </div>
  );
}
