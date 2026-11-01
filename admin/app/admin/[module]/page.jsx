import { notFound } from 'next/navigation';
import Crud from '@/components/Crud';
import { MODULES } from '@/lib/modules';
import { listRows } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function ModulePage({ params }) {
  const m = MODULES[params.module];
  if (!m) notFound();
  return <Crud key={params.module} slug={params.module} title={m.title} singular={m.singular}
    fields={m.fields} columns={m.columns} initial={listRows(params.module)} />;
}
