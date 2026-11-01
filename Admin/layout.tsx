import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Admin Login', robots: { index: false, follow: false } };
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">{children}</main>;
}
