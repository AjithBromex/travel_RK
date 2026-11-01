import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, adminDb, currentAdmin } from '@/lib/admin/server';

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const RESERVED = ['id', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy'];
type Col = (typeof COLLECTIONS)[number];
const isCol = (c: unknown): c is Col => typeof c === 'string' && (COLLECTIONS as readonly string[]).includes(c);
class Fail extends Error { constructor(public status: number, m: string) { super(m); } }
const json = (b: unknown, status = 200) => new NextResponse(JSON.stringify(b, (_, v) =>
  v && typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().toISOString() : v),
  { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function clean(d: unknown) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > 20000) throw new Fail(400, 'Invalid record data.');
  return Object.fromEntries(Object.entries(d).filter(([k]) => !RESERVED.includes(k) && !k.startsWith('__')));
}

export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) return json({ error: 'Unauthorized' }, 401);
  const c = req.nextUrl.searchParams.get('collection'); const db = adminDb();
  if (!c) {
    const out = await Promise.all(COLLECTIONS.map(async (n) => {
      const col = db.collection(n);
      const [t, p] = await Promise.all([col.count().get(), col.where('status', '==', 'pending').count().get()]);
      return [n, { total: t.data().count, pending: p.data().count }];
    }));
    return json(Object.fromEntries(out));
  }
  if (!isCol(c)) return json({ error: 'Unknown collection.' }, 400);
  const snap = await db.collection(c).limit(500).get();
  return json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return json({ error: 'Unauthorized' }, 401);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const { action, collection: c, id, data, reason } = b;
  try {
    if (!isCol(c)) throw new Fail(400, 'Unknown collection.');
    if (!['create', 'update', 'approve', 'reject', 'delete'].includes(String(action))) throw new Fail(400, 'Unknown action.');
    if (action !== 'create' && (typeof id !== 'string' || !ID.test(id))) throw new Fail(400, 'Invalid record ID.');
    if (action === 'reject' && (typeof reason !== 'string' || !reason.trim())) throw new Fail(400, 'A rejection reason is required.');
    const db = adminDb();
    const target = db.collection(c).doc(action === 'create' ? undefined as unknown as string : (id as string));
    const log = db.collection('auditLogs').doc();
    const base = { adminUid: admin.uid, action, collection: c, targetId: target.id, at: FieldValue.serverTimestamp() };
    await db.runTransaction(async (t) => {
      const snap = await t.get(target);
      if (action !== 'create' && !snap.exists) throw new Fail(404, 'Record not found.');
      const from = (snap.data()?.status as string | undefined) ?? 'pending';
      if (action === 'create') {
        const d = clean(data);
        t.set(target, { ...d, createdAt: FieldValue.serverTimestamp(), createdBy: admin.uid });
        t.set(log, { ...base, after: { fields: Object.keys(d) } });
      } else if (action === 'update') {
        const d = clean(data);
        t.set(target, { ...d, updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.uid }, { merge: true });
        t.set(log, { ...base, after: { fields: Object.keys(d) } });
      } else if (action === 'delete') {
        t.delete(target); t.set(log, { ...base, before: { status: from } });
      } else {
        if (from !== 'pending') throw new Fail(409, `Only pending records can be ${action}d.`);
        const to = action === 'approve' ? 'approved' : 'rejected';
        t.update(target, { status: to, reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp(),
          ...(to === 'rejected' ? { rejectionReason: String(reason).trim().slice(0, 500) } : {}) });
        t.set(log, { ...base, before: { status: from }, after: { status: to } });
      }
    });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    return json({ error: 'Action failed. Try again.' }, 500);
  }
}
