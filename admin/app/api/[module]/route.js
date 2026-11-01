import { NextResponse } from 'next/server';
import { SLUGS } from '@/lib/modules';
import { listRows, createRow } from '@/lib/store';

export const dynamic = 'force-dynamic';
const bad = () => NextResponse.json({ error: 'Unknown module' }, { status: 404 });

export async function GET(_, { params }) {
  if (!SLUGS.includes(params.module)) return bad();
  return NextResponse.json(listRows(params.module));
}

export async function POST(req, { params }) {
  if (!SLUGS.includes(params.module)) return bad();
  try { return NextResponse.json(createRow(params.module, await req.json()), { status: 201 }); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
