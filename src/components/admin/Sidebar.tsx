'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES, SLUGS } from '@/lib/admin/modules';

export default function Sidebar() {
  const path = usePathname();

  const item = (href: string, label: string) => (
    <Link key={href} href={href} className={path === href ? 'nav on' : 'nav'}>
      {label}
    </Link>
  );

  return (
    <aside className="side">
      <div className="brand">
        RK Travel Hub
        <span>Admin Governance</span>
      </div>
      <nav>
        {item('/admin', 'Dashboard')}
        {SLUGS.map((s) => item(`/admin/${s}`, MODULES[s].title))}
      </nav>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link href="/travel" className="nav" style={{ fontSize: '0.82rem', opacity: 0.85 }}>
          ← Exit to User Portal
        </Link>
        <form action="/api/logout" method="post">
          <button type="submit" className="nav out">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
