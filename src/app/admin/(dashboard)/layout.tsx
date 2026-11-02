import AdminTopbar from '@/components/admin/AdminTopbar';

export const dynamic = 'force-dynamic';

export default function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FB] relative selection:bg-blue-600/10 selection:text-blue-600 font-sans text-slate-900 antialiased overflow-x-hidden">
      {/* Lightweight GPU-accelerated ambient backdrop */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-60"
        style={{
          transform: 'translateZ(0)',
          background: `
            radial-gradient(circle 600px at 80% 10%, rgba(219, 234, 254, 0.4), transparent 60%),
            radial-gradient(circle 500px at 10% 40%, rgba(243, 232, 255, 0.3), transparent 60%)
          `,
        }}
      />

      <div className="w-full relative z-10 flex flex-col min-h-screen">
        <AdminTopbar />
        <main className="flex-1 w-full p-2.5 sm:p-4 md:p-6 lg:p-8 max-w-[1520px] mx-auto transition-all">
          {children}
        </main>
      </div>
    </div>
  );
}
