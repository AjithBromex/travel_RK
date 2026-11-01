'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES, SLUGS } from '@/lib/modules';

export default function Sidebar() {
  const path = usePathname();
  const item = (href, label) => (
    <Link key={href} href={href} className={path === href ? 'nav on' : 'nav'}>{label}</Link>
  );
  return (
    <aside className="side">
      <div className="brand">RK Travel Hub<span>Admin</span></div>
      <nav>
        {item('/admin', 'Dashboard')}
        {SLUGS.map((s) => item(`/admin/${s}`, MODULES[s].title))}
      </nav>
      <form action="/api/logout" method="post"><button className="nav out">Sign out</button></form>
    </aside>
  );
}
