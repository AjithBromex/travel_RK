import { NextResponse } from 'next/server';
import { SLUGS } from '@/lib/modules';
import { updateRow, deleteRow } from '@/lib/store';

export const dynamic = 'force-dynamic';
const nf = (m) => NextResponse.json({ error: m }, { status: 404 });

export async function PUT(req, { params }) {
  if (!SLUGS.includes(params.module)) return nf('Unknown module');
  try {
    const row = updateRow(params.module, params.id, await req.json());
    return row ? NextResponse.json(row) : nf('Record not found');
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}

export async function DELETE(_, { params }) {
  if (!SLUGS.includes(params.module)) return nf('Unknown module');
  return deleteRow(params.module, params.id) ? NextResponse.json({ ok: true }) : nf('Record not found');
}
