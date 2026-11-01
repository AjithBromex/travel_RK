import AdminTopbar from '@/components/admin/AdminTopbar';

export const dynamic = 'force-dynamic';

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FB] relative selection:bg-blue-600/10 selection:text-blue-600 font-sans text-slate-900 antialiased">
      {/* High-Performance Ambient Light Background matching User Portal UI */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle 600px at 75% 10%, rgba(219, 234, 254, 0.5), transparent 70%),
            radial-gradient(circle 500px at 15% 35%, rgba(243, 232, 255, 0.4), transparent 70%),
            radial-gradient(circle 500px at 85% 85%, rgba(209, 250, 229, 0.35), transparent 70%)
          `,
        }}
      />

      <div className="w-full relative z-10">
        <AdminTopbar />
        <main className="p-3 sm:p-5 lg:p-6 min-h-[calc(100vh-68px)] max-w-[1520px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
