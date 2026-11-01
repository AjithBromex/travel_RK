import { notFound } from 'next/navigation';
import Crud from '@/components/admin/Crud';
import { MODULES } from '@/lib/admin/modules';
import { listRows } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ module: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { module: slug } = await params;
  const m = MODULES[slug];
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
