import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal Login • RK Travel Hub',
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </main>
  );
}
