import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Admin Portal Login • RK Travel Hub',
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden p-4 font-sans selection:bg-blue-600/30 selection:text-white">
      {/* Cinematic Alpine Mountain Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/login-scenic-bg.jpg')" }}
      >
        <Image
          src="/images/login-scenic-bg.jpg"
          alt="RK Travel Alpine Highway"
          fill
          priority
          unoptimized
          className="object-cover object-center scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/25" />
      </div>

      <div className="relative z-10 w-full flex justify-center py-6">
        {children}
      </div>
    </main>
  );
}

