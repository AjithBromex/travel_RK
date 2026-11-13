import { notFound, redirect } from 'next/navigation';
import Crud from '@/components/admin/Crud';
import { MODULES } from '@/lib/admin/modules';
import { listRows } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ module: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { module: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase().trim();

  if (slug === 'settings') {
    redirect('/admin/settings');
  }
  if (slug === 'trash') {
    redirect('/admin/trash');
  }
  if (slug === 'backups' || slug === 'backup') {
    redirect('/admin/backups');
  }
  if (
    slug === 'audit-logs' ||
    slug === 'audit logs' ||
    slug === 'audit_logs' ||
    slug === 'auditlog' ||
    slug === 'auditlogs'
  ) {
    redirect('/admin/audit-logs');
  }

  const m = MODULES[rawSlug] || MODULES[slug];
  if (!m) notFound();

  return (
    <Crud
      key={slug}
      slug={slug}
      title={m.title}
      singular={m.singular}
      fields={m.fields}
      columns={m.columns}
      initial={await listRows(slug)}
    />
  );
}
