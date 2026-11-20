// Core Business Logic & Date Services for Automated WhatsApp Trip Reminders
// RK Travel Hub - Strictly follows Asia/Kolkata (IST) calendar calculations and Twilio specs

import type { Trip, Vehicle, WhatsAppNotificationRecord, WhatsAppNotificationStatus } from '@/types';
import { resolveVehicleDetails } from '@/lib/admin/whatsapp';

export const TIMEZONE_IST = 'Asia/Kolkata';
export const REMINDER_TYPE_ADMIN_5DAY = 'admin_5day';

/**
 * Returns year, month, day, and YYYY-MM-DD string in Asia/Kolkata timezone.
 */
export function getKolkataDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date); // en-CA gives YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, dateStr };
}

/**
 * Calculates the target trip date exactly `daysAhead` calendar days from `baseDate` in Asia/Kolkata.
 * Example: baseDate = 2026-11-20 -> targetDate = 2026-11-25 (for daysAhead = 5)
 */
export function getTargetTripDateKolkata(daysAhead = 5, baseDate: Date = new Date()): string {
  const { year, month, day } = getKolkataDateParts(baseDate);
  // Construct noon UTC on the calculated target date to avoid boundary/DST shifts
  const target = new Date(Date.UTC(year, month - 1, day + daysAhead, 12, 0, 0));
  return getKolkataDateParts(target).dateStr;
}

/**
 * Calculates difference in calendar days between today (IST) and a target trip date (YYYY-MM-DD).
 * Returns positive number of days if tripDate is in the future.
 */
export function getDaysUntilTripKolkata(tripDateStr: string, baseDate: Date = new Date()): number {
  const todayStr = getKolkataDateParts(baseDate).dateStr;
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const [targetYear, targetMonth, targetDay] = tripDateStr.split('-').map(Number);

  const utcToday = Date.UTC(tYear, tMonth - 1, tDay);
  const utcTarget = Date.UTC(targetYear, targetMonth - 1, targetDay);

  const diffMs = utcTarget - utcToday;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes phone numbers to standard WhatsApp E.164 format:
 * e.g., "9876543210" -> "whatsapp:+919876543210"
 * "+919876543210" -> "whatsapp:+919876543210"
 * "whatsapp:+919876543210" -> "whatsapp:+919876543210"
 */
export function formatWhatsAppRecipient(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim();
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace(/^whatsapp:/, '').trim();
  }
  // Strip non-digits except leading +
  const hasPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D/g, '');

  if (digits.length === 10) {
    // Standard 10-digit Indian mobile
    return `whatsapp:+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    // 0-prefixed 10-digit Indian mobile
    return `whatsapp:+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `whatsapp:+${digits}`;
  }
  if (hasPlus) {
    return `whatsapp:+${digits}`;
  }
  return digits.length >= 10 ? `whatsapp:+${digits}` : '';
}

/**
 * Deterministic notification ID generator preventing duplicates:
 * Format: `${tripId}_admin_5day_${sanitizedTripDate}`
 */
export function getReminderDocumentId(
  tripId: string,
  tripDate: string,
  reminderType = REMINDER_TYPE_ADMIN_5DAY
): string {
  const cleanTripId = String(tripId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = String(tripDate).trim().replace(/[^0-9-]/g, '');
  return `${cleanTripId}_${reminderType}_${cleanDate}`;
}

export interface EligibilityResult {
  isEligible: boolean;
  reason: string;
  status: WhatsAppNotificationStatus;
}

/**
 * Strict evaluation of trip eligibility for the 5-day automated admin reminder:
 * - Must be confirmed by admin (`isConfirmed === true` or explicit confirmation)
 * - Must have valid trip date
 * - Must not be cancelled or completed
 * - Must not be soft-deleted
 * - Must be scheduled exactly 5 calendar days ahead (if evaluating for scheduled trigger)
 * - If confirmed fewer than 5 days before departure, marked as 'missed'
 */
export function evaluateTripEligibility(
  trip: Trip | Record<string, any>,
  targetTripDate: string,
  todayDateStr: string = getKolkataDateParts().dateStr
): EligibilityResult {
  // 1. Soft-delete check
  if (trip.isDeleted || trip.deletedAt) {
    return {
      isEligible: false,
      reason: 'Trip has been deleted/moved to trash.',
      status: 'missed',
    };
  }

  // 2. Cancellation & Completion checks
  const status = String(trip.status || 'scheduled').toLowerCase();
  if (status === 'cancelled') {
    return {
      isEligible: false,
      reason: 'Trip has been cancelled.',
      status: 'missed',
    };
  }
  if (status === 'completed') {
    return {
      isEligible: false,
      reason: 'Trip has already been completed.',
      status: 'missed',
    };
  }

  // 3. Confirmation check
  const isConfirmed = Boolean(trip.isConfirmed);
  if (!isConfirmed) {
    return {
      isEligible: false,
      reason: 'Trip has not yet been confirmed by administrator.',
      status: 'pending',
    };
  }

  // 4. Trip date validity
  const tripDate = String(trip.tripDate || (trip as any).startDate || '').trim();
  if (!tripDate || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
    return {
      isEligible: false,
      reason: `Invalid or missing trip date: "${tripDate}".`,
      status: 'failed',
    };
  }

  // 5. Target date matching check
  if (tripDate !== targetTripDate) {
    const daysUntil = getDaysUntilTripKolkata(tripDate, new Date());
    if (daysUntil < 5) {
      return {
        isEligible: false,
        reason: `Trip confirmed/scheduled ${daysUntil} days before departure (< 5 days). Marked as missed.`,
        status: 'missed',
      };
    }
    return {
      isEligible: false,
      reason: `Trip date (${tripDate}) does not match target 5-day reminder date (${targetTripDate}).`,
      status: 'pending',
    };
  }

  return {
    isEligible: true,
    reason: 'Trip is fully eligible for 5-day automated admin reminder.',
    status: 'pending',
  };
}

export interface WhatsAppReminderDetails {
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  tripDate: string;
  pickupLocation: string;
  destination: string;
  driverName: string;
  driverPhone: string;
  vehicleName: string;
  vehicleNumber: string;
  tripAmount: string;
  plainTextMessage: string;
  contentVariables: Record<string, string>;
}

/**
 * Extracts and formats all parameters for the 5-day admin trip reminder according to Requirement 5.
 */
export function buildReminderDetails(
  trip: Trip | Record<string, any>,
  vehicle?: Partial<Vehicle> | null
): WhatsAppReminderDetails {
  const raw = (trip as any).raw || trip;

  const receiptNumber = String(
    raw.receiptNumber || raw.tripNumber || trip.receiptNumber || trip.tripNumber || trip.id || 'N/A'
  ).trim();

  const customerName = String(
    raw.customerName || trip.customerName || raw.customer || trip.customer || 'Valued Customer'
  ).trim();

  const customerPhone = String(
    raw.customerPhone || trip.customerPhone || raw.phone || (trip as any).phone || 'N/A'
  ).trim();

  const tripDate = String(raw.tripDate || trip.tripDate || raw.startDate || (trip as any).startDate || 'N/A').trim();

  const pickupLocation = String(raw.from || trip.from || raw.pickupLocation || 'N/A').trim();
  const destination = String(raw.to || trip.to || raw.destination || 'N/A').trim();

  const driverName = String(raw.driverName || trip.driverName || raw.driver || 'Unassigned').trim();
  const driverPhone = String(raw.driverPhone || trip.driverPhone || 'N/A').trim();

  const { vehicleName: resolvedVehName, vehicleNumber: resolvedVehNo } = resolveVehicleDetails(
    raw,
    vehicle
  );
  const vehicleName = resolvedVehName || 'Standard Fleet';
  const vehicleNumber = resolvedVehNo || 'Pending Assignment';

  const rawAmount = Number(raw.totalFare || raw.baseFare || trip.totalFare || trip.baseFare || 0);
  const tripAmount = `₹${rawAmount.toLocaleString('en-IN')}`;

  // Exact plaintext template required by Section 5
  const plainTextMessage = [
    'Hello Admin,',
    '',
    'A trip is scheduled in 5 days!',
    '',
    'TRIP DETAILS',
    '',
    `Receipt Number: ${receiptNumber}`,
    '',
    `Customer Name: ${customerName}`,
    '',
    `Customer Phone: ${customerPhone}`,
    '',
    `Trip Date: ${tripDate}`,
    '',
    `Pickup Location: ${pickupLocation}`,
    '',
    `Destination: ${destination}`,
    '',
    `Assigned Driver: ${driverName}`,
    '',
    `Driver Phone: ${driverPhone}`,
    '',
    `Vehicle: ${vehicleName}`,
    '',
    `Vehicle Registration: ${vehicleNumber}`,
    '',
    `Trip Amount: ${tripAmount}`,
    '',
    'Please verify the vehicle, driver and trip arrangements before departure.',
    '',
    'Regards,',
    'RK Travel Hub.',
  ].join('\n');

  // Both positional indices (1..11) and named variable maps for Twilio Content Templates
  const contentVariables: Record<string, string> = {
    '1': receiptNumber,
    '2': customerName,
    '3': customerPhone,
    '4': tripDate,
    '5': pickupLocation,
    '6': destination,
    '7': driverName,
    '8': driverPhone,
    '9': vehicleName,
    '10': vehicleNumber,
    '11': tripAmount,
    receiptNumber,
    customerName,
    customerPhone,
    tripDate,
    pickupLocation,
    destination,
    driverName,
    driverPhone,
    vehicleName,
    vehicleNumber,
    tripAmount,
  };

  return {
    receiptNumber,
    customerName,
    customerPhone,
    tripDate,
    pickupLocation,
    destination,
    driverName,
    driverPhone,
    vehicleName,
    vehicleNumber,
    tripAmount,
    plainTextMessage,
    contentVariables,
  };
}
