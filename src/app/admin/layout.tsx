import Sidebar from '@/components/admin/Sidebar';
import './admin.css';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-body">
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
