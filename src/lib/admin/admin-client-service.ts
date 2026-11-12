'use client';

// Client-side Admin Service
// Connects the Admin portal directly to the application's unified services,
// Firestore client, and localStorage synchronization engine.

import { MODULES } from './modules';
import {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
} from '@/services/trips.service';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '@/services/vehicles.service';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from '@/services/payments.service';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/services/expenses.service';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from '@/services/reminders.service';
import { getCashBookEntries } from '@/services/cashbook.service';
import {
  getAllUsers,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from '@/services/users.service';
import {
  getStoredTrips,
  saveStoredTrips,
  getStoredVehicles,
  saveStoredVehicles,
  getStoredPayments,
  saveStoredPayments,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredReminders,
  saveStoredReminders,
  notifyDataChanged,
  unmarkDeleted,
  markAsDeleted,
  isDeleted,
  markAsConfirmed,
  unmarkConfirmed,
  isRecordConfirmed,
} from '@/lib/storage-sync';
import type { Trip, Vehicle, Payment, Expense, Reminder, UserProfile } from '@/types';

// Normalizers: convert domain models into flat table records matching MODULES[slug].columns
export function normalizeTrip(t: Partial<Trip> & Record<string, any>): Record<string, unknown> {
  const amount = Number(t.totalFare ?? t.amount ?? t.baseFare ?? 0);
  const statusRaw = String(t.status || 'scheduled').toLowerCase();
  const status =
    statusRaw === 'on_trip'
      ? 'Ongoing'
      : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).replace('_', ' ');

  const recId = String(t.id || t.tripNumber || '');
  const isConfirmed = Boolean(t.isConfirmed || (recId && isRecordConfirmed('trips', recId)));

  return {
    id: t.id || t.tripNumber || `trip_${Math.random().toString(36).slice(2)}`,
    customer: t.customerName || t.customer || 'Customer',
    vehicle: t.vehicleName || t.vehicle || t.vehicleId || '–',
    from: t.from || '',
    to: t.to || '',
    startDate: t.tripDate || t.startDate || (typeof t.createdAt === 'string' ? t.createdAt.slice(0, 10) : ''),
    endDate: t.endDate || '',
    amount,
    status,
    note: t.notes || t.note || '',
    isConfirmed,
    customerName: t.customerName || t.customer || '',
    customerPhone: t.customerPhone || '',
    driverName: t.driverName || t.driver || '',
    driverPhone: t.driverPhone || '',
    receiptNumber: t.receiptNumber || t.tripNumber || '',
    vehicleName: t.vehicleName || '',
    vehicleId: t.vehicleId || '',
    pickupTime: t.pickupTime || t.reportingTime || t.time || '',
    raw: t,
  };
}

export function resolveVehicleSeats(v: Record<string, any>): number {
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

export function normalizeVehicle(v: Partial<Vehicle> & Record<string, any>): Record<string, unknown> {
  const statusRaw = String(v.status || 'active').toLowerCase();
  const status =
    statusRaw === 'active'
      ? 'Available'
      : statusRaw === 'service_due'
      ? 'Maintenance'
      : statusRaw === 'on_trip'
      ? 'On trip'
      : statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

  const recId = String(v.id || v.registrationNumber || '');
  const isConfirmed = Boolean(v.isConfirmed || (recId && isRecordConfirmed('vehicles', recId)));

  return {
    id: v.id || `veh_${Math.random().toString(36).slice(2)}`,
    number: v.registrationNumber || v.number || '',
    type: v.type ? (v.type.charAt(0).toUpperCase() + v.type.slice(1)) : 'Car',
    model: v.name || v.model || '',
    seats: resolveVehicleSeats(v),
    driver: v.driverName || v.driver || '',
    status,
    insuranceExpiry: v.insuranceExpiry || '',
    serviceDue: v.serviceDue || '',
    isConfirmed,
    raw: v,
  };
}

export function normalizePayment(p: Partial<Payment> & Record<string, any>): Record<string, unknown> {
  const mode = p.paymentMode || p.method || 'Cash';
  const status =
    p.status ||
    (p.type === 'customer_received' ? 'Paid' : p.type === 'driver_payment' ? 'Paid' : 'Pending');

  const recId = String(p.id || '');
  const isConfirmed = Boolean(p.isConfirmed || (recId && isRecordConfirmed('payments', recId)));

  let customerName = String(p.customerName || p.customer || '').trim();
  let tripRef = String(p.tripRef || '').trim();
  const tripIdentifier = String(p.tripId || p.tripNumber || '');

  if (tripIdentifier && tripIdentifier !== 'general') {
    try {
      const trips = typeof window !== 'undefined' ? getStoredTrips() : [];
      const linked = trips.find(
        (t) =>
          t.id === tripIdentifier ||
          t.tripNumber === tripIdentifier ||
          (t.receiptNumber && t.receiptNumber === tripIdentifier)
      );
      if (linked) {
        if (!customerName || customerName.toLowerCase().startsWith('trip ')) {
          customerName = linked.customerName || '';
        }
        if (!tripRef && linked.from && linked.to) {
          tripRef = `${linked.from} → ${linked.to}`;
        }
      }
    } catch {}
  }

  if (!customerName || customerName.toLowerCase().startsWith('trip ')) {
    customerName = 'Customer';
  }
  if (!tripRef) {
    tripRef = tripIdentifier && tripIdentifier !== 'general' ? `Trip #${tripIdentifier}` : 'Direct';
  }

  return {
    id: p.id || `pay_${Math.random().toString(36).slice(2)}`,
    customer: customerName,
    tripRef,
    amount: Number(p.amount || 0),
    date: p.paymentDate || p.date || (typeof p.createdAt === 'string' ? p.createdAt.slice(0, 10) : ''),
    method: mode.charAt(0).toUpperCase() + mode.slice(1),
    status,
    note: p.notes || p.note || '',
    isConfirmed,
    raw: p,
  };
}

export function normalizeExpense(e: Partial<Expense> & Record<string, any>): Record<string, unknown> {
  const cat = String(e.category || 'other');
  const recId = String(e.id || '');
  const isConfirmed = Boolean(e.isConfirmed || (recId && isRecordConfirmed('expenses', recId)));

  return {
    id: e.id || `exp_${Math.random().toString(36).slice(2)}`,
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    vehicle: e.vehicleName || e.vehicle || '',
    amount: Number(e.amount || 0),
    date: e.expenseDate || e.date || (typeof e.createdAt === 'string' ? e.createdAt.slice(0, 10) : ''),
    note: e.description || e.notes || e.note || '',
    isConfirmed,
    raw: e,
  };
}

export function normalizeReminder(r: Partial<Reminder> & Record<string, any>): Record<string, unknown> {
  const recId = String(r.id || '');
  const isConfirmed = Boolean(r.isConfirmed || (recId && isRecordConfirmed('reminders', recId)));

  return {
    id: r.id || `rem_${Math.random().toString(36).slice(2)}`,
    title: r.title || '',
    type: r.category ? (r.category.charAt(0).toUpperCase() + r.category.slice(1)) : (r.type || 'General'),
    dueDate: r.dueDate || r.date || '',
    status: r.status === 'completed' ? 'Done' : 'Pending',
    note: r.notes || r.note || '',
    isConfirmed,
    raw: r,
  };
}

export function normalizeCashbook(c: Record<string, any>): Record<string, unknown> {
  const recId = String(c.id || '');
  const isConfirmed = Boolean(c.isConfirmed || (recId && isRecordConfirmed('cashbook', recId)));

  return {
    id: c.id || `cb_${Math.random().toString(36).slice(2)}`,
    date: c.date || (typeof c.createdAt === 'string' ? c.createdAt.slice(0, 10) : ''),
    type: c.type === 'receipt' || (c.cashIn && Number(c.cashIn) > 0) ? 'In' : 'Out',
    description: c.description || '',
    amount: Number(c.cashIn > 0 ? c.cashIn : c.cashOut || c.amount || 0),
    mode: (c.paymentMode || c.mode || 'Cash').toUpperCase(),
    isConfirmed,
    raw: c,
  };
}

export function normalizeUser(u: Partial<UserProfile> & Record<string, any>): Record<string, unknown> {
  const recId = String(u.uid || u.id || '');
  const isConfirmed = Boolean((u as any).isConfirmed || (recId && isRecordConfirmed('users', recId)));

  const rawEmail = String(u.email || (u as any).userEmail || (u as any).mail || '').trim();
  const cleanUser = String(u.userId || u.displayName || (u as any).name || (u as any).username || recId || '')
    .trim()
    .replace(/@gmail\.com$/i, '')
    .replace(/@.*$/, '')
    .toLowerCase();
  const fallbackEmail = cleanUser && !cleanUser.startsWith('usr_') ? `${cleanUser}@gmail.com` : '';
  const email = rawEmail || fallbackEmail;

  return {
    id: u.uid || u.id || `usr_${Math.random().toString(36).slice(2)}`,
    name: u.displayName || u.userId || (u as any).name || 'Staff User',
    phone: u.phone || '',
    email,
    role: u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1)) : 'Staff',
    status: u.isActive === false ? 'Blocked' : 'Active',
    isConfirmed,
    raw: u,
  };
}

export async function fetchAdminRows(slug: string): Promise<Record<string, unknown>[]> {
  try {
    if (slug === 'trips') {
      const cloud = await getTrips(200).catch(() => null);
      if (cloud !== null) {
        saveStoredTrips(cloud);
        return cloud.map(normalizeTrip);
      }
      const local = getStoredTrips();
      return local.map(normalizeTrip);
    }

    if (slug === 'vehicles') {
      const cloud = await getVehicles(200).catch(() => null);
      if (cloud !== null) {
        saveStoredVehicles(cloud);
        return cloud.map(normalizeVehicle);
      }
      const local = getStoredVehicles();
      return local.map(normalizeVehicle);
    }

    if (slug === 'payments') {
      const cloud = await getPayments(200).catch(() => null);
      if (cloud !== null) {
        saveStoredPayments(cloud);
        return cloud
          .filter(
            (p) =>
              !isDeleted('payments', p.id) &&
              (!p.tripId || p.tripId === 'general' || !isDeleted('trips', p.tripId))
          )
          .map(normalizePayment);
      }
      const local = getStoredPayments();
      return local
        .filter(
          (p) =>
            !isDeleted('payments', p.id) &&
            (!p.tripId || p.tripId === 'general' || !isDeleted('trips', p.tripId))
        )
        .map(normalizePayment);
    }

    if (slug === 'expenses') {
      const cloud = await getExpenses(200).catch(() => null);
      if (cloud !== null) {
        saveStoredExpenses(cloud);
        return cloud
          .filter(
            (e) =>
              !isDeleted('expenses', e.id) &&
              (!e.tripId || !isDeleted('trips', e.tripId)) &&
              (!e.tripNumber || !isDeleted('trips', e.tripNumber))
          )
          .map(normalizeExpense);
      }
      const local = getStoredExpenses();
      return local
        .filter(
          (e) =>
            !isDeleted('expenses', e.id) &&
            (!e.tripId || !isDeleted('trips', e.tripId)) &&
            (!e.tripNumber || !isDeleted('trips', e.tripNumber))
        )
        .map(normalizeExpense);
    }

    if (slug === 'reminders') {
      const cloud = await getReminders(100).catch(() => null);
      if (cloud !== null) {
        saveStoredReminders(cloud);
        return cloud.map(normalizeReminder);
      }
      const local = getStoredReminders();
      return local.map(normalizeReminder);
    }

    if (slug === 'cashbook') {
      const list = await getCashBookEntries().catch(() => []);
      return list.map(normalizeCashbook);
    }

    if (slug === 'users') {
      const list = await getAllUsers().catch(() => []);
      return list
        .filter((u) => !isDeleted('users', u.uid || (u as any).id))
        .map(normalizeUser);
    }

    return [];
  } catch (err) {
    console.warn(`[AdminClientService] Error fetching ${slug}:`, err);
    return [];
  }
}

export async function saveAdminRow(
  slug: string,
  form: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const isEdit = Boolean(form.id);
  const id = String(form.id || '');

  if (slug === 'trips') {
    const rawStatus = String(form.status || 'scheduled').toLowerCase();
    const mappedStatus =
      rawStatus === 'ongoing' || rawStatus === 'in_progress'
        ? 'in_progress'
        : rawStatus === 'completed'
        ? 'completed'
        : rawStatus === 'cancelled'
        ? 'cancelled'
        : 'scheduled';

    const tripData: any = {
      customerName: String((form as Record<string, any>).customer || (form as Record<string, any>).customerName || ''),
      customerPhone: String((form as Record<string, any>).customerPhone || ''),
      driverName: String((form as Record<string, any>).driverName || ''),
      driverPhone: String((form as Record<string, any>).driverPhone || ''),
      vehicleName: String((form as Record<string, any>).vehicle || (form as Record<string, any>).vehicleName || ''),
      from: String((form as Record<string, any>).from || ''),
      to: String((form as Record<string, any>).to || ''),
      tripDate: String((form as Record<string, any>).startDate || new Date().toISOString().slice(0, 10)),
      endDate: String((form as Record<string, any>).endDate || ''),
      pickupTime: String((form as Record<string, any>).pickupTime || ''),
      totalFare: Number((form as Record<string, any>).amount || 0),
      status: mappedStatus,
      notes: String((form as Record<string, any>).note || ''),
    };

    let targetId = id;
    if (isEdit) {
      await updateTrip(id, tripData);
    } else {
      targetId = await createTrip(tripData);
    }
    unmarkDeleted('trips', targetId);
    notifyDataChanged('trips');
    notifyDataChanged('all');
    return normalizeTrip({ id: targetId, ...tripData });
  }

  if (slug === 'vehicles') {
    const rawSeats = Number(form.seats || 0);
    const resolvedSeats = rawSeats > 0 ? rawSeats : resolveVehicleSeats({ ...form, name: form.model });
    const vehicleData: any = {
      registrationNumber: String(form.number || '').toUpperCase(),
      name: String(form.model || form.number || ''),
      type: String(form.type || 'Car').toLowerCase(),
      seats: resolvedSeats,
      notes: form.seats ? `${form.seats} Seats` : undefined,
      driverName: String(form.driver || ''),
      status:
        form.status === 'Available'
          ? 'active'
          : form.status === 'Maintenance'
          ? 'service_due'
          : form.status === 'On trip'
          ? 'on_trip'
          : 'active',
      insuranceExpiry: String(form.insuranceExpiry || ''),
      serviceDue: String(form.serviceDue || ''),
    };

    let targetId = id;
    if (isEdit) {
      await updateVehicle(id, vehicleData);
    } else {
      targetId = await createVehicle(vehicleData);
    }
    unmarkDeleted('vehicles', targetId);
    notifyDataChanged('vehicles');
    notifyDataChanged('all');
    return normalizeVehicle({ id: targetId, ...vehicleData });
  }

  if (slug === 'payments') {
    const payData: any = {
      customerName: String(form.customer || ''),
      tripRef: String(form.tripRef || ''),
      amount: Number(form.amount || 0),
      paymentDate: String(form.date || new Date().toISOString().slice(0, 10)),
      paymentMode: String(form.method || 'cash').toLowerCase(),
      status: String(form.status || 'Paid'),
      notes: String(form.note || ''),
      type: 'customer_received',
    };

    let targetId = id;
    if (isEdit) {
      await updatePayment(id, payData);
    } else {
      targetId = await createPayment(payData);
    }
    unmarkDeleted('payments', targetId);
    notifyDataChanged('payments');
    notifyDataChanged('trips');
    notifyDataChanged('all');
    return normalizePayment({ id: targetId, ...payData });
  }

  if (slug === 'expenses') {
    const expData: any = {
      category: String(form.category || 'other').toLowerCase(),
      vehicleName: String(form.vehicle || ''),
      amount: Number(form.amount || 0),
      expenseDate: String(form.date || new Date().toISOString().slice(0, 10)),
      description: String(form.note || ''),
      paymentMode: 'cash',
    };

    let targetId = id;
    if (isEdit) {
      await updateExpense(id, expData);
    } else {
      targetId = await createExpense(expData);
    }
    unmarkDeleted('expenses', targetId);
    notifyDataChanged('expenses');
    notifyDataChanged('all');
    return normalizeExpense({ id: targetId, ...expData });
  }

  if (slug === 'reminders') {
    const remData: any = {
      title: String(form.title || ''),
      category: String(form.type || 'other').toLowerCase(),
      dueDate: String(form.dueDate || new Date().toISOString().slice(0, 10)),
      status: form.status === 'Done' ? 'completed' : 'pending',
      notes: String(form.note || ''),
    };

    let targetId = id;
    if (isEdit) {
      await updateReminder(id, remData);
    } else {
      targetId = await createReminder(remData);
    }
    unmarkDeleted('reminders', targetId);
    notifyDataChanged('all');
    return normalizeReminder({ id: targetId, ...remData });
  }

  if (slug === 'users') {
    const rawName = String(form.name || '');
    const cleanId = rawName.trim().replace(/@gmail\.com$/i, '').replace(/@.*$/, '').toLowerCase();
    const rawEmail = String(form.email || '').trim();
    const email = rawEmail || (cleanId ? `${cleanId}@gmail.com` : '');

    const userData: any = {
      displayName: rawName,
      phone: String(form.phone || ''),
      email,
      role: String(form.role || 'staff').toLowerCase(),
      isActive: form.status !== 'Blocked',
    };

    if (isEdit) {
      await updateUserProfile(id, userData);
      notifyDataChanged('all');
      return normalizeUser({ uid: id, ...userData });
    } else {
      const newUid = `usr_${Date.now()}`;
      const profile = await createUserProfile(newUid, userData);
      notifyDataChanged('all');
      return normalizeUser(profile);
    }
  }

  notifyDataChanged('all');
  return { id, ...form };
}

export async function toggleAdminConfirm(
  slug: string,
  id: string,
  currentStatus?: boolean
): Promise<boolean> {
  const nextStatus = !currentStatus;
  const now = new Date().toISOString();

  // 1. Update localStorage confirmation tracking
  if (nextStatus) {
    markAsConfirmed(slug, id);
  } else {
    unmarkConfirmed(slug, id);
  }

  // 2. Persist to Firestore & memory cache for supported modules
  const confirmPayload = {
    isConfirmed: nextStatus,
    confirmedAt: nextStatus ? now : undefined,
    confirmedBy: nextStatus ? 'Admin' : undefined,
  };

  try {
    if (slug === 'trips') {
      await updateTrip(id, confirmPayload);
    } else if (slug === 'vehicles') {
      await updateVehicle(id, confirmPayload);
    } else if (slug === 'payments') {
      await updatePayment(id, confirmPayload);
    } else if (slug === 'expenses') {
      await updateExpense(id, confirmPayload);
    } else if (slug === 'reminders') {
      await updateReminder(id, confirmPayload);
    }
  } catch (err) {
    console.warn(`[AdminClientService] Cloud update confirmation failed for ${slug}:${id}:`, err);
  }

  // 3. Notify all listeners and tabs
  notifyDataChanged(slug as any);
  notifyDataChanged('all');

  return nextStatus;
}

export async function deleteAdminRow(slug: string, id: string): Promise<void> {
  if (slug === 'trips') {
    await deleteTrip(id);
  } else if (slug === 'vehicles') {
    await deleteVehicle(id);
  } else if (slug === 'payments') {
    await deletePayment(id);
  } else if (slug === 'expenses') {
    await deleteExpense(id);
  } else if (slug === 'reminders') {
    await deleteReminder(id);
  } else if (slug === 'users') {
    await deleteUserProfile(id);
  }
  markAsDeleted(slug, id);
  notifyDataChanged(slug as any);
  notifyDataChanged('all');
}


