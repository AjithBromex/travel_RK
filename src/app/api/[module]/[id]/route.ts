import { NextResponse, type NextRequest } from 'next/server';
import { SLUGS } from '@/lib/admin/modules';
import { updateRow, deleteRow } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';
const nf = (m: string) => NextResponse.json({ error: m }, { status: 404 });

interface RouteContext {
  params: Promise<{ module: string; id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { module: slug, id } = await params;
  if (!SLUGS.includes(slug)) return nf('Unknown module');
  try {
    const body = await req.json();
    const row = await updateRow(slug, id, body);
    return row ? NextResponse.json(row) : nf('Record not found');
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const { module: slug, id } = await params;
  if (!SLUGS.includes(slug)) return nf('Unknown module');
  const ok = await deleteRow(slug, id);
  return ok ? NextResponse.json({ ok: true }) : nf('Record not found');
}
