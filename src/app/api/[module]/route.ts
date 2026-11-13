import { NextResponse, type NextRequest } from 'next/server';
import { SLUGS } from '@/lib/admin/modules';
import { listRows, createRow } from '@/lib/admin/store';
import { verifyAdminAuth } from '@/lib/admin/auth-check';

export const dynamic = 'force-dynamic';
const bad = () => NextResponse.json({ error: 'Unknown module' }, { status: 404 });

interface RouteContext {
  params: Promise<{ module: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 });
  }

  const { module: slug } = await params;
  if (!SLUGS.includes(slug)) return bad();
  return NextResponse.json(await listRows(slug));
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 });
  }

  const { module: slug } = await params;
  if (!SLUGS.includes(slug)) return bad();
  try {
    const body = await req.json();
    const row = await createRow(slug, body);
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
