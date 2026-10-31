import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Login | RK Travel Hub',
  description: 'Administrative portal authentication for RK Travel Hub management.',
}

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-slate-950">{children}</div>
}
