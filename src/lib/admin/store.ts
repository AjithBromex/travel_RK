// Real database store backed by Firestore Cloud Database.
import { MODULES } from './modules';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rk-travels-1f4f3';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

function getEndpoint(col: string, docId?: string) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${col}`;
  const suffix = docId ? `/${docId}` : '';
  const keyParam = API_KEY ? `?key=${API_KEY}` : '';
  return `${base}${suffix}${keyParam}`;
}

function decodeFirestoreValue(v: any): any {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return parseFloat(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      out[k] = decodeFirestoreValue(val);
    }
    return out;
  }
  return null;
}

function decodeDoc(doc: any): Record<string, any> {
  const id = doc.name.split('/').pop();
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    data[k] = decodeFirestoreValue(v);
  }
  return data;
}

function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(encodeFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = encodeFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function normalize(slug: string, d: Record<string, any>): Record<string, any> {
  if (slug === 'users') {
    const rawEmail = String(d.email || d.userEmail || d.mail || '').trim();
    const cleanUser = String(d.userId || d.displayName || d.name || d.username || d.id || '')
      .trim()
      .replace(/@gmail\.com$/i, '')
      .replace(/@.*$/, '')
      .toLowerCase();
    const fallbackEmail = cleanUser && !cleanUser.startsWith('usr_') ? `${cleanUser}@gmail.com` : '';
    const email = rawEmail || fallbackEmail;

    return {
      id: d.id,
      name: d.displayName || d.userId || d.name || 'Staff User',
      phone: d.phone || '',
      email,
      role: d.role ? (d.role.charAt(0).toUpperCase() + d.role.slice(1)) : 'Staff',
      status: d.isActive === false ? 'Blocked' : 'Active',
    };
  }

  if (slug === 'trips') {
    return {
      id: d.id,
      customer: d.customerName || d.customer || 'Customer',
      vehicle: d.vehicleName || d.vehicle || d.vehicleId || '–',
      from: d.from || '',
      to: d.to || '',
      startDate: d.tripDate || d.startDate || (typeof d.createdAt === 'string' ? d.createdAt.slice(0, 10) : ''),
      endDate: d.endDate || '',
      amount: Number(d.totalFare || d.amount || d.baseFare || 0),
      status: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1).replace('_', ' ')) : 'Scheduled',
      note: d.notes || d.note || '',
    };
  }

  if (slug === 'vehicles') {
    return {
      id: d.id,
      number: d.registrationNumber || d.number || '',
      type: d.type || 'Car',
      model: d.name || d.model || '',
      seats: Number(d.seats || 5),
      driver: d.driverName || d.driver || '',
      status: d.status === 'active' ? 'Available' : d.status === 'service_due' ? 'Maintenance' : (d.status || 'Available'),
      insuranceExpiry: d.insuranceExpiry || '',
      serviceDue: d.serviceDue || '',
    };
  }

  if (slug === 'payments') {
    return {
      id: d.id,
      customer: d.customerName || d.customer || (d.tripId ? `Trip ${d.tripId}` : 'Customer Payment'),
      tripRef: d.tripRef || (d.tripId ? `Trip #${d.tripId}` : ''),
      amount: Number(d.amount || 0),
      date: d.paymentDate || d.date || (typeof d.createdAt === 'string' ? d.createdAt.slice(0, 10) : ''),
      method: d.paymentMode ? d.paymentMode.toUpperCase() : (d.method || 'Cash'),
      status: d.status || (d.type === 'customer_received' ? 'Paid' : 'Pending'),
      note: d.notes || d.note || '',
    };
  }

  if (slug === 'expenses') {
    return {
      id: d.id,
      category: d.category ? (d.category.charAt(0).toUpperCase() + d.category.slice(1)) : 'Other',
      vehicle: d.vehicleName || d.vehicle || '',
      amount: Number(d.amount || 0),
      date: d.expenseDate || d.date || (typeof d.createdAt === 'string' ? d.createdAt.slice(0, 10) : ''),
      note: d.description || d.notes || d.note || '',
    };
  }

  if (slug === 'reminders') {
    return {
      id: d.id,
      title: d.title || '',
      type: d.category ? (d.category.charAt(0).toUpperCase() + d.category.slice(1)) : (d.type || 'General'),
      dueDate: d.dueDate || d.date || '',
      status: d.status === 'completed' ? 'Done' : (d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : 'Pending'),
      note: d.notes || d.note || '',
    };
  }

  if (slug === 'cashbook') {
    return {
      id: d.id,
      date: d.date || (typeof d.createdAt === 'string' ? d.createdAt.slice(0, 10) : ''),
      type: d.type || (d.cashIn ? 'In' : 'Out'),
      description: d.description || '',
      amount: Number(d.amount || d.cashIn || d.cashOut || 0),
      mode: d.mode || d.paymentMode || 'Cash',
    };
  }

  return d;
}

// Memory cache to eliminate redundant network roundtrips during tab switching
const rowsCache = new Map<string, { time: number; data: Record<string, unknown>[] }>();
const CACHE_TTL_MS = 15000; // 15 seconds fast cache

export async function listRows(slug: string): Promise<Record<string, unknown>[]> {
  const cached = rowsCache.get(slug);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    const url = getEndpoint(slug) + (API_KEY ? '&pageSize=200' : '?pageSize=200');
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      return cached?.data || [];
    }
    const json = await res.json();
    const docs = (json.documents || []).map(decodeDoc);
    const normalized = docs.map((d: Record<string, any>) => normalize(slug, d));
    rowsCache.set(slug, { time: Date.now(), data: normalized });
    return normalized;
  } catch (err) {
    console.warn(`[AdminStore] Error fetching Firestore collection ${slug}:`, err);
    return cached?.data || [];
  }
}

export function clean(slug: string, body: Record<string, unknown>): Record<string, unknown> {
  const mod = MODULES[slug];
  if (!mod) throw new Error(`Unknown module: ${slug}`);
  const out: Record<string, unknown> = {};

  for (const f of mod.fields) {
    let v = body[f.key];
    if (f.type === 'number' || f.type === 'money') {
      v = v === '' || v == null ? 0 : Number(v);
    } else {
      v = (v ?? '').toString().trim();
    }
    if (f.required && (v === '' || Number.isNaN(v))) {
      throw new Error(`${f.label} is required`);
    }
    out[f.key] = v;
  }
  return out;
}

export async function createRow(slug: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const cleaned = clean(slug, body);
  const now = new Date().toISOString();
  const payload: Record<string, any> = { ...cleaned, createdAt: now, updatedAt: now };

  // Sync dual keys for compatibility between user app & admin table
  if (slug === 'trips') {
    payload.customerName = cleaned.customer;
    payload.totalFare = cleaned.amount;
    payload.tripDate = cleaned.startDate;
  } else if (slug === 'vehicles') {
    payload.registrationNumber = cleaned.number;
    payload.name = cleaned.model;
  } else if (slug === 'payments') {
    payload.paymentDate = cleaned.date;
    payload.paymentMode = String(cleaned.method || 'cash').toLowerCase();
    payload.type = 'customer_received';
  } else if (slug === 'expenses') {
    payload.expenseDate = cleaned.date;
    payload.description = cleaned.note;
    payload.category = String(cleaned.category || 'other').toLowerCase();
  } else if (slug === 'users') {
    payload.displayName = cleaned.name;
    payload.userId = cleaned.name;
    const cleanId = String(cleaned.name || '').trim().replace(/@gmail\.com$/i, '').replace(/@.*$/, '').toLowerCase();
    payload.email = cleaned.email || (cleanId ? `${cleanId}@gmail.com` : '');
    payload.role = String(cleaned.role || 'staff').toLowerCase();
    payload.isActive = cleaned.status !== 'Blocked';
  }

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    fields[k] = encodeFirestoreValue(v);
  }

  const res = await fetch(getEndpoint(slug), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create ${slug} record: ${errText}`);
  }

  const doc = await res.json();
  rowsCache.delete(slug);
  return normalize(slug, decodeDoc(doc));
}

export async function updateRow(slug: string, id: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const cleaned = clean(slug, body);
  const now = new Date().toISOString();
  const payload: Record<string, any> = { ...cleaned, updatedAt: now };

  if (slug === 'trips') {
    payload.customerName = cleaned.customer;
    payload.totalFare = cleaned.amount;
    payload.tripDate = cleaned.startDate;
  } else if (slug === 'vehicles') {
    payload.registrationNumber = cleaned.number;
    payload.name = cleaned.model;
  } else if (slug === 'payments') {
    payload.paymentDate = cleaned.date;
    payload.paymentMode = String(cleaned.method || 'cash').toLowerCase();
  } else if (slug === 'expenses') {
    payload.expenseDate = cleaned.date;
    payload.description = cleaned.note;
  } else if (slug === 'users') {
    payload.displayName = cleaned.name;
    const cleanId = String(cleaned.name || '').trim().replace(/@gmail\.com$/i, '').replace(/@.*$/, '').toLowerCase();
    payload.email = cleaned.email || (cleanId ? `${cleanId}@gmail.com` : '');
    payload.role = String(cleaned.role || 'staff').toLowerCase();
    payload.isActive = cleaned.status !== 'Blocked';
  }

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    fields[k] = encodeFirestoreValue(v);
  }

  const res = await fetch(getEndpoint(slug, id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    return null;
  }

  const doc = await res.json();
  return normalize(slug, decodeDoc(doc));
}

export async function deleteRow(slug: string, id: string): Promise<boolean> {
  try {
    if (slug === 'trips') {
      try {
        const urlPay = getEndpoint('payments') + (API_KEY ? '&pageSize=300' : '?pageSize=300');
        const urlExp = getEndpoint('expenses') + (API_KEY ? '&pageSize=300' : '?pageSize=300');
        const [payRes, expRes] = await Promise.all([
          fetch(urlPay, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch(urlExp, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (payRes && payRes.documents) {
          for (const d of payRes.documents) {
            const dec = decodeDoc(d);
            if (
              dec.tripId === id ||
              dec.tripNumber === id ||
              dec.tripRef === id ||
              (typeof dec.tripRef === 'string' && dec.tripRef.includes(id))
            ) {
              await fetch(getEndpoint('payments', dec.id), { method: 'DELETE' }).catch(() => {});
            }
          }
        }

        if (expRes && expRes.documents) {
          for (const d of expRes.documents) {
            const dec = decodeDoc(d);
            if (dec.tripId === id || dec.tripNumber === id) {
              await fetch(getEndpoint('expenses', dec.id), { method: 'DELETE' }).catch(() => {});
            }
          }
        }
      } catch (cascadeErr) {
        console.warn('[AdminStore] Cascade delete linked records error:', cascadeErr);
      }
    }

    const res = await fetch(getEndpoint(slug, id), {
      method: 'DELETE',
    });
    rowsCache.delete(slug);
    if (slug === 'trips') {
      rowsCache.delete('payments');
      rowsCache.delete('expenses');
    }
    return res.ok;
  } catch {
    return false;
  }
}

