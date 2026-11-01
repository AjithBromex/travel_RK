import Sidebar from '@/components/admin/Sidebar';

export const dynamic = 'force-dynamic';

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
