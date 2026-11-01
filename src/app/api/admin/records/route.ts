import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, adminDb, currentAdmin } from '@/lib/admin/server';

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const RESERVED = ['id', 'reviewedBy', 'reviewedAt', 'rejectionReason', 'createdBy', 'createdAt', 'updatedAt', 'updatedBy'];
type Col = (typeof COLLECTIONS)[number];
const isCol = (c: unknown): c is Col => typeof c === 'string' && (COLLECTIONS as readonly string[]).includes(c);
class Fail extends Error {
  constructor(public status: number, m: string) {
    super(m);
  }
}
const json = (b: unknown, status = 200) =>
  new NextResponse(
    JSON.stringify(b, (_, v) =>
      v && typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().toISOString() : v
    ),
    {
      status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    }
  );

function clean(d: unknown) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > 20000) {
    throw new Fail(400, 'Invalid record data.');
  }
  return Object.fromEntries(
    Object.entries(d as Record<string, unknown>).filter(([k]) => !RESERVED.includes(k) && !k.startsWith('__'))
  );
}

// Fallback REST fetch for Firestore when service account credentials are not configured
async function fetchFirestoreRest(collectionName: string) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}${apiKey ? `?key=${apiKey}` : ''}`;
  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((doc: any) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      const fields: Record<string, unknown> = { id };
      for (const [k, v] of Object.entries(doc.fields || {})) {
        const valObj = v as any;
        if ('stringValue' in valObj) fields[k] = valObj.stringValue;
        else if ('integerValue' in valObj) fields[k] = parseInt(valObj.integerValue, 10);
        else if ('doubleValue' in valObj) fields[k] = parseFloat(valObj.doubleValue);
        else if ('booleanValue' in valObj) fields[k] = valObj.booleanValue;
        else if ('timestampValue' in valObj) fields[k] = valObj.timestampValue;
        else fields[k] = valObj;
      }
      return fields;
    });
  } catch (err) {
    console.warn(`[FirestoreREST] fallback fetch failed for ${collectionName}:`, err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return json({ error: 'Unauthorized' }, 401);

  const c = req.nextUrl.searchParams.get('collection');

  // Return counts for all collections
  if (!c) {
    try {
      const db = adminDb();
      const out = await Promise.all(
        COLLECTIONS.map(async (n) => {
          const colRef = db.collection(n);
          const [t, p] = await Promise.all([
            colRef.count().get(),
            colRef.where('status', '==', 'pending').count().get(),
          ]);
          return [n, { total: t.data().count, pending: p.data().count }];
        })
      );
      return json(Object.fromEntries(out));
    } catch {
      // Fallback count via REST
      const counts: Record<string, { total: number; pending: number }> = {};
      for (const col of COLLECTIONS) {
        const docs = await fetchFirestoreRest(col);
        const pendingCount = docs.filter((d: any) => d.status === 'pending' || !d.status).length;
        counts[col] = { total: docs.length, pending: pendingCount };
      }
      return json(counts);
    }
  }

  if (!isCol(c)) return json({ error: 'Unknown collection.' }, 400);

  // Return documents for specific collection
  try {
    const db = adminDb();
    const snap = await db.collection(c).limit(500).get();
    return json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.warn(`[AdminRecords] AdminDb GET failed, using REST fallback for ${c}:`, err);
    const docs = await fetchFirestoreRest(c);
    return json(docs);
  }
}

export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return json({ error: 'Unauthorized' }, 401);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }

  const { action, collection: c, id, data, reason } = b;

  try {
    if (!isCol(c)) throw new Fail(400, 'Unknown collection.');
    if (!['create', 'update', 'approve', 'reject', 'delete'].includes(String(action))) {
      throw new Fail(400, 'Unknown action.');
    }
    if (action !== 'create' && (typeof id !== 'string' || !ID.test(id))) {
      throw new Fail(400, 'Invalid record ID.');
    }
    if (action === 'reject' && (typeof reason !== 'string' || !reason.trim())) {
      throw new Fail(400, 'A rejection reason is required.');
    }

// Fallback REST write for Firestore when service account credentials are not configured
async function writeFirestoreRest(collectionName: string, id: string | undefined, data: Record<string, unknown>, method: 'PATCH' | 'POST' | 'DELETE') {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;
  const url = id ? `${baseUrl}/${id}${apiKey ? `?key=${apiKey}` : ''}` : `${baseUrl}${apiKey ? `?key=${apiKey}` : ''}`;

  if (method === 'DELETE') {
    return fetch(url, { method: 'DELETE' });
  }

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'object') fields[k] = { stringValue: JSON.stringify(v) };
  }

  const queryParams = method === 'PATCH'
    ? Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
    : '';

  const finalUrl = queryParams ? `${url}${url.includes('?') ? '&' : '?'}${queryParams}` : url;

  return fetch(finalUrl, {
    method: method === 'PATCH' ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

    try {
      const db = adminDb();
      const target = db.collection(c).doc(action === 'create' ? undefined as unknown as string : (id as string));
      const log = db.collection('auditLogs').doc();
      const base = {
        adminUid: admin.uid,
        action,
        collection: c,
        targetId: target.id,
        at: FieldValue.serverTimestamp(),
      };

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
          t.delete(target);
          t.set(log, { ...base, before: { status: from } });
        } else {
          if (from !== 'pending') throw new Fail(409, `Only pending records can be ${action}d.`);
          const to = action === 'approve' ? 'approved' : 'rejected';
          t.update(target, {
            status: to,
            reviewedBy: admin.uid,
            reviewedAt: FieldValue.serverTimestamp(),
            ...(to === 'rejected' ? { rejectionReason: String(reason).trim().slice(0, 500) } : {}),
          });
          t.set(log, { ...base, before: { status: from }, after: { status: to } });
        }
      });
    } catch (txErr) {
      if (txErr instanceof Fail) throw txErr;
      console.warn('[AdminRecords] Transaction failed, using REST fallback:', txErr);
      const now = new Date().toISOString();
      if (action === 'create') {
        const d = clean(data);
        await writeFirestoreRest(c, (id as string) || undefined, { ...d, createdAt: now, createdBy: admin.uid }, 'POST');
      } else if (action === 'update') {
        const d = clean(data);
        await writeFirestoreRest(c, id as string, { ...d, updatedAt: now, updatedBy: admin.uid }, 'PATCH');
      } else if (action === 'delete') {
        await writeFirestoreRest(c, id as string, {}, 'DELETE');
      } else if (action === 'approve') {
        await writeFirestoreRest(c, id as string, { status: 'approved', reviewedBy: admin.uid, reviewedAt: now }, 'PATCH');
      } else if (action === 'reject') {
        await writeFirestoreRest(c, id as string, { status: 'rejected', reviewedBy: admin.uid, reviewedAt: now, rejectionReason: String(reason || '') }, 'PATCH');
      }
    }

    return json({ ok: true });
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error('[AdminRecords] Action failed:', e);
    return json({ error: (e as Error)?.message || 'Action failed. Try again.' }, 500);
  }
}

