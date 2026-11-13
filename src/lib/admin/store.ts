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

function resolveVehicleSeats(v: Record<string, any>): number {
  const combined = `${v.name || ''} ${v.model || ''} ${v.type || ''}`.toLowerCase();

  // Check if vehicle is explicitly a large commercial van / bus / traveller / winger
  const isLargeCommercial =
    combined.includes('winger') ||
    combined.includes('traveller') ||
    combined.includes('tempo') ||
    combined.includes('urbania') ||
    combined.includes('bus') ||
    combined.includes('coach') ||
    combined.includes('volvo');

  if (v.seats != null && v.seats !== '') {
    const s = Number(v.seats);
    // If it's a known large commercial vehicle, a seat count of 5 or less is a bad placeholder
    if (!isNaN(s) && s > 0 && (!isLargeCommercial || s > 5)) {
      return s;
    }
  }

  const notes = String(v.notes || v.note || '');
  if (notes.includes('Seats') || notes.includes('seats')) {
    const match = notes.match(/(\d+)\s*seats?/i);
    if (match) {
      const s = parseInt(match[1], 10);
      if (!isNaN(s) && s > 0 && (!isLargeCommercial || s > 5)) {
        return s;
      }
    }
  }

  // Model & Type based auto-detection (checks name, model, and type)
  if (combined.includes('volvo') || combined.includes('coach') || (combined.includes('bus') && !combined.includes('mini'))) return 45;
  if (combined.includes('mini bus')) return 21;
  if (combined.includes('traveller') && !combined.includes('tempo')) return 26;
  if (combined.includes('urbania')) return 17;
  if (combined.includes('winger')) return 12; // Tata Winger is standard 12 seats
  if (combined.includes('tempo')) return 12;
  if (combined.includes('innova') || combined.includes('crysta') || combined.includes('hycross') || combined.includes('ertiga') || combined.includes('bolero') || combined.includes('scorpio') || combined.includes('suv')) return 7;
  if (combined.includes('sedan') || combined.includes('etios') || combined.includes('swift') || combined.includes('baleno') || combined.includes('dzire') || combined.includes('car')) return 4;
  if (combined.includes('van')) return 12;

  // Fallback to explicit numeric seats if available
  if (v.seats != null && v.seats !== '') {
    const s = Number(v.seats);
    if (!isNaN(s) && s > 0) return s;
  }

  return 12;
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
      customerName: d.customerName || d.customer || '',
      customerPhone: d.customerPhone || '',
      driverName: d.driverName || d.driver || '',
      driverPhone: d.driverPhone || '',
      receiptNumber: d.receiptNumber || d.tripNumber || '',
      vehicleName: d.vehicleName || '',
      vehicleId: d.vehicleId || '',
      pickupTime: d.pickupTime || d.reportingTime || d.time || '',
      isConfirmed: Boolean(d.isConfirmed),
      raw: d,
    };
  }

  if (slug === 'vehicles') {
    return {
      id: d.id,
      number: d.registrationNumber || d.number || '',
      type: d.type || 'Car',
      model: d.name || d.model || '',
      seats: resolveVehicleSeats(d),
      driver: d.driverName || d.driver || '',
      status: d.status === 'active' ? 'Available' : d.status === 'service_due' ? 'Maintenance' : (d.status || 'Available'),
      insuranceExpiry: d.insuranceExpiry || '',
      serviceDue: d.serviceDue || '',
    };
  }

  if (slug === 'payments') {
    let customer = String(d.customerName || d.customer || '').trim();
    if (!customer || customer.toLowerCase().startsWith('trip ')) {
      customer = 'Customer';
    }

    return {
      id: d.id,
      customer,
      tripRef: d.tripRef || (d.tripId ? `Trip #${d.tripId}` : ''),
      amount: Number(d.amount || 0),
      date: d.paymentDate || d.date || (typeof d.createdAt === 'string' ? d.createdAt.slice(0, 10) : ''),
      method: d.paymentMode ? d.paymentMode.toUpperCase() : (d.method || 'Cash'),
      status: d.status || (d.paymentStage === 'advance' ? 'Advance' : d.paymentStage === 'balance' ? 'Balance' : d.type === 'customer_received' ? 'Paid' : 'Pending'),
      paymentStage: d.paymentStage || '',
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
    const docs = (json.documents || [])
      .map(decodeDoc)
      .filter((d: any) => !d.isDeleted);
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
    payload.customerName = (cleaned as Record<string, any>).customer || (cleaned as Record<string, any>).customerName || '';
    payload.totalFare = cleaned.amount;
    payload.tripDate = cleaned.startDate;
    payload.vehicleName = cleaned.vehicle;
  } else if (slug === 'vehicles') {
    payload.registrationNumber = cleaned.number;
    payload.name = cleaned.model;
  } else if (slug === 'payments') {
    payload.paymentDate = cleaned.date;
    payload.paymentMode = String(cleaned.method || 'cash').toLowerCase();
    payload.type = 'customer_received';
    if (cleaned.paymentStage) payload.paymentStage = cleaned.paymentStage;
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
    payload.customerName = (cleaned as Record<string, any>).customer || (cleaned as Record<string, any>).customerName || '';
    payload.totalFare = cleaned.amount;
    payload.tripDate = cleaned.startDate;
    payload.vehicleName = cleaned.vehicle;
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

    if (slug === 'payments') {
      try {
        const payRes = await fetch(getEndpoint('payments', id), { cache: 'no-store' });
        if (payRes.ok) {
          const payDoc = decodeDoc(await payRes.json());
          const targetTripId = payDoc.tripId || payDoc.tripNumber;
          if (targetTripId && targetTripId !== 'general') {
            const tripsRes = await fetch(getEndpoint('trips') + (API_KEY ? '&pageSize=300' : '?pageSize=300'), { cache: 'no-store' });
            const allPayRes = await fetch(getEndpoint('payments') + (API_KEY ? '&pageSize=300' : '?pageSize=300'), { cache: 'no-store' });
            if (tripsRes.ok && allPayRes.ok) {
              const tripsData = await tripsRes.json();
              const allPayData = await allPayRes.json();
              const tripDocs = (tripsData.documents || []).map(decodeDoc);
              const allPayments = (allPayData.documents || []).map(decodeDoc).filter((p: any) => p.id !== id);

              const targetTrip = tripDocs.find((t: any) =>
                t.id === targetTripId ||
                t.tripNumber === targetTripId ||
                t.receiptNumber === targetTripId ||
                (t.receiptNumber && String(targetTripId).replace(/^#/, '') === String(t.receiptNumber).replace(/^#/, ''))
              );

              if (targetTrip) {
                const isLinked = (p: any) => {
                  return (
                    p.tripId === targetTrip.id ||
                    p.tripId === targetTrip.tripNumber ||
                    p.tripId === targetTrip.receiptNumber ||
                    (targetTrip.receiptNumber && String(p.tripId).replace(/^#/, '') === String(targetTrip.receiptNumber).replace(/^#/, ''))
                  );
                };

                const activeCustPayments = allPayments.filter((p: any) => p.type === 'customer_received' && isLinked(p));
                const activeDriverPayments = allPayments.filter((p: any) => p.type === 'driver_payment' && isLinked(p));
                const custPaidSum = activeCustPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
                const driverPaidSum = activeDriverPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

                const advancePayments = activeCustPayments.filter(
                  (p: any) => p.paymentStage === 'advance' || (p.notes && /advance/i.test(p.notes))
                );
                const advanceFromPayments = advancePayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

                const hasCustPayments = activeCustPayments.length > 0;
                const trueCustPaid = hasCustPayments ? custPaidSum : 0;
                const trueAdv = hasCustPayments ? advanceFromPayments : 0;

                const totalFare = Number(targetTrip.totalFare ?? (Number(targetTrip.baseFare || 0) + Number(targetTrip.extraKmCharge || 0))) || 0;
                const agreedPay = Number(targetTrip.driverAgreedPay) || 0;
                const trueCustBal = Math.max(0, totalFare - trueCustPaid);
                const trueDriverBal = Math.max(0, agreedPay - driverPaidSum);

                const patchUrl = `${getEndpoint('trips', targetTrip.id)}${API_KEY ? '&' : '?'}updateMask.fieldPaths=customerPaid&updateMask.fieldPaths=customerBalance&updateMask.fieldPaths=driverPaid&updateMask.fieldPaths=driverBalance&updateMask.fieldPaths=advanceReceived&updateMask.fieldPaths=updatedAt`;
                await fetch(patchUrl, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fields: {
                      customerPaid: encodeFirestoreValue(trueCustPaid),
                      customerBalance: encodeFirestoreValue(trueCustBal),
                      driverPaid: encodeFirestoreValue(driverPaidSum),
                      driverBalance: encodeFirestoreValue(trueDriverBal),
                      advanceReceived: encodeFirestoreValue(trueAdv),
                      updatedAt: encodeFirestoreValue(new Date().toISOString()),
                    },
                  }),
                }).catch(() => {});
                rowsCache.delete('trips');
              }
            }
          }
        }
      } catch (payReconcileErr) {
        console.warn('[AdminStore] Cascade delete linked payment error:', payReconcileErr);
      }
    }

    const now = new Date().toISOString();
    const patchUrl =
      getEndpoint(slug, id) +
      (API_KEY ? '&' : '?') +
      'updateMask.fieldPaths=isDeleted&updateMask.fieldPaths=deletedAt&updateMask.fieldPaths=updatedAt';

    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          isDeleted: encodeFirestoreValue(true),
          deletedAt: encodeFirestoreValue(now),
          updatedAt: encodeFirestoreValue(now),
        },
      }),
    });

    // Also record in trash collection
    try {
      let existingDocData: Record<string, any> = {};
      try {
        const getRes = await fetch(getEndpoint(slug, id), { cache: 'no-store' });
        if (getRes.ok) {
          existingDocData = decodeDoc(await getRes.json());
        }
      } catch {}

      const trashId = `${slug}_${id}`;
      const recordName = existingDocData.category
        ? `${String(existingDocData.category).toUpperCase()}: ${existingDocData.description || existingDocData.note || ''} (₹${existingDocData.amount || 0})`
        : existingDocData.customer || existingDocData.customerName || existingDocData.name || `${slug.toUpperCase()} #${id}`;

      const updateMaskParams = [
        'updateMask.fieldPaths=id',
        'updateMask.fieldPaths=originalId',
        'updateMask.fieldPaths=originalCollection',
        'updateMask.fieldPaths=recordName',
        'updateMask.fieldPaths=recordType',
        'updateMask.fieldPaths=isDeleted',
        'updateMask.fieldPaths=deletedAt',
        'updateMask.fieldPaths=restored',
        'updateMask.fieldPaths=updatedAt',
        'updateMask.fieldPaths=data',
      ].join('&');

      const trashUrl = `${getEndpoint('trash', trashId)}${API_KEY ? '&' : '?'}${updateMaskParams}`;
      await fetch(trashUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: encodeFirestoreValue(trashId),
            originalId: encodeFirestoreValue(id),
            originalCollection: encodeFirestoreValue(slug),
            recordName: encodeFirestoreValue(recordName),
            recordType: encodeFirestoreValue(slug),
            isDeleted: encodeFirestoreValue(true),
            deletedAt: encodeFirestoreValue(now),
            restored: encodeFirestoreValue(false),
            updatedAt: encodeFirestoreValue(now),
            data: encodeFirestoreValue({ ...existingDocData, isDeleted: true, deletedAt: now }),
          },
        }),
      });

      // Also record in audit_logs collection
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const auditMask = [
        'updateMask.fieldPaths=id',
        'updateMask.fieldPaths=action',
        'updateMask.fieldPaths=collectionName',
        'updateMask.fieldPaths=recordId',
        'updateMask.fieldPaths=userId',
        'updateMask.fieldPaths=userEmail',
        'updateMask.fieldPaths=userRole',
        'updateMask.fieldPaths=timestamp',
        'updateMask.fieldPaths=details',
      ].join('&');
      const auditUrl = `${getEndpoint('audit_logs', auditId)}${API_KEY ? '&' : '?'}${auditMask}`;
      await fetch(auditUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: encodeFirestoreValue(auditId),
            action: encodeFirestoreValue('SOFT_DELETE'),
            collectionName: encodeFirestoreValue(slug),
            recordId: encodeFirestoreValue(id),
            userId: encodeFirestoreValue('admin'),
            userEmail: encodeFirestoreValue('admin@gmail.com'),
            userRole: encodeFirestoreValue('admin'),
            timestamp: encodeFirestoreValue(now),
            details: encodeFirestoreValue(`Deleted ${recordName} from ${slug}.`),
          },
        }),
      }).catch(() => {});
    } catch (trashErr) {
      console.warn('[AdminStore] Record in trash collection error:', trashErr);
    }

    rowsCache.delete(slug);
    if (slug === 'trips') {
      rowsCache.delete('payments');
      rowsCache.delete('expenses');
    }
    if (slug === 'payments') {
      rowsCache.delete('trips');
    }
    return res.ok;
  } catch {
    return false;
  }
}

