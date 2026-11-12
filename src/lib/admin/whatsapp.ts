// WhatsApp Click-to-Chat Service for Admin Portal
// RK Travel Hub - Strictly Admin-Only WhatsApp Messaging Integration

import type { Trip, Vehicle } from '@/types';

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string; // e.g. "919876543210"
  displayNumber: string;   // e.g. "+91 98765 43210"
  errorMessage?: string;
}

/**
 * Validates and formats phone numbers for WhatsApp Click-to-Chat (https://wa.me/)
 * Handles Indian phone numbers (+91, 0, spaces, dashes) and prevents duplicate country codes.
 */
export function validateAndFormatWhatsAppPhone(rawInput?: string | null): PhoneValidationResult {
  if (!rawInput || !String(rawInput).trim()) {
    return {
      isValid: false,
      formattedNumber: '',
      displayNumber: '',
      errorMessage: 'Phone number is missing.',
    };
  }

  const cleaned = String(rawInput).trim();
  // Strip all non-digit characters
  let digits = cleaned.replace(/\D/g, '');

  if (digits.length < 10) {
    return {
      isValid: false,
      formattedNumber: '',
      displayNumber: cleaned,
      errorMessage: `Phone number is too short (${digits.length} digits). Standard mobile requires 10 digits.`,
    };
  }

  // 11 digits starting with 0 (e.g., 09876543210) -> remove leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // 12 digits starting with 91 (e.g., 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    const mobilePart = digits.slice(2);
    return {
      isValid: true,
      formattedNumber: digits,
      displayNumber: `+91 ${mobilePart.slice(0, 5)} ${mobilePart.slice(5)}`,
    };
  }

  // Exactly 10 digits (e.g., 9876543210) -> prepend Indian country code 91
  if (digits.length === 10) {
    return {
      isValid: true,
      formattedNumber: `91${digits}`,
      displayNumber: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  }

  // Other valid international phone numbers (10 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return {
      isValid: true,
      formattedNumber: digits,
      displayNumber: `+${digits}`,
    };
  }

  return {
    isValid: false,
    formattedNumber: '',
    displayNumber: cleaned,
    errorMessage: `Invalid phone number format (${digits.length} digits).`,
  };
}

/**
 * Extracts and separates vehicle model name and registration number cleanly
 */
export function resolveVehicleDetails(
  trip: Record<string, any>,
  vehicle?: Partial<Vehicle> | null
): { vehicleName: string; vehicleNumber: string } {
  let vehicleName = String(vehicle?.name || '').trim();
  let vehicleNumber = String(vehicle?.registrationNumber || '').trim();

  // If vehicle was not provided or partial, check trip fields
  if (!vehicleName || !vehicleNumber) {
    const raw = trip.raw || trip;
    const tripVehStr = String(
      raw.vehicleName || raw.vehicle || trip.vehicleName || trip.vehicle || ''
    ).trim();
    if (tripVehStr && tripVehStr !== '–' && tripVehStr !== '-') {
      // Check pattern "Model Name (REG NUMBER)"
      const match = tripVehStr.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        if (!vehicleName) vehicleName = match[1].trim();
        if (!vehicleNumber) vehicleNumber = match[2].trim();
      } else {
        // Check if string looks like an Indian registration number (e.g. KL 07 CF 2211, KL07CF2211)
        const isRegPattern = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i.test(tripVehStr);
        if (isRegPattern) {
          if (!vehicleNumber) vehicleNumber = tripVehStr;
        } else {
          if (!vehicleName) vehicleName = tripVehStr;
        }
      }
    }
  }

  return { vehicleName, vehicleNumber };
}

/**
 * Extracts pickup/reporting time from trip notes or time fields if available
 */
export function extractPickupTime(trip: Record<string, any>): string {
  const raw = trip.raw || trip;
  const directTime = String(
    raw.pickupTime || raw.reportingTime || raw.time || trip.pickupTime || ''
  ).trim();
  if (directTime) return directTime;

  const notes = String(raw.notes || raw.note || trip.note || trip.notes || '').trim();
  if (!notes) return '';
  const match = notes.match(
    /(?:pickup|reporting|time|at)\s*[:=-]?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs)?)/i
  );
  return match ? match[1].trim() : '';
}

/**
 * Generates the Customer WhatsApp Message
 */
export function buildCustomerWhatsAppMessage(
  trip: Record<string, any>,
  vehicle?: Partial<Vehicle> | null
): string {
  const raw = trip.raw || trip;
  const customerName = String(
    raw.customerName || trip.customerName || trip.customer || 'Valued Customer'
  ).trim();
  const receiptNo = String(
    raw.receiptNumber || raw.tripNumber || trip.receiptNumber || trip.id || ''
  ).trim();
  const tripDate = String(raw.tripDate || trip.startDate || '').trim();
  const pickupTime = extractPickupTime(trip);
  const origin = String(raw.from || trip.from || '').trim();
  const destination = String(raw.to || trip.to || '').trim();

  const { vehicleName, vehicleNumber } = resolveVehicleDetails(trip, vehicle);

  const lines: string[] = [
    `Hello ${customerName},`,
    '',
    'Greetings from RK Travel Hub!',
    '',
    'Your trip has been confirmed successfully.',
    '',
    'TRIP DETAILS',
    '',
  ];

  if (receiptNo) lines.push(`Receipt Number: ${receiptNo}`);
  if (tripDate) lines.push(`Trip Date: ${tripDate}`);
  if (pickupTime) lines.push(`Pickup Time: ${pickupTime}`);
  if (origin) lines.push(`Pickup Location: ${origin}`);
  if (destination) lines.push(`Destination: ${destination}`);
  if (vehicleName) lines.push(`Vehicle: ${vehicleName}`);
  if (vehicleNumber) lines.push(`Vehicle Number: ${vehicleNumber}`);

  lines.push('');
  lines.push('Thank you for choosing RK Travel Hub.');
  lines.push('');
  lines.push('We look forward to providing you with a comfortable and safe journey.');
  lines.push('');
  lines.push('Regards,');
  lines.push('RK Travel Hub');

  return lines.join('\n');
}

/**
 * Checks if a trip has a valid driver assigned
 */
export function isTripDriverAssigned(trip: Record<string, any>): boolean {
  const raw = trip.raw || trip;
  const driverName = String(raw.driverName || trip.driverName || trip.driver || '').trim();
  if (!driverName) return false;
  const lower = driverName.toLowerCase();
  return !['–', '-', 'unassigned', 'none', 'n/a', 'na'].includes(lower);
}

/**
 * Generates the Driver WhatsApp Message
 */
export function buildDriverWhatsAppMessage(
  trip: Record<string, any>,
  vehicle?: Partial<Vehicle> | null
): string {
  const raw = trip.raw || trip;
  const driverName = String(
    raw.driverName || trip.driverName || trip.driver || 'Driver Partner'
  ).trim();
  const receiptNo = String(
    raw.receiptNumber || raw.tripNumber || trip.receiptNumber || trip.id || ''
  ).trim();
  const tripDate = String(raw.tripDate || trip.startDate || '').trim();
  const reportingTime = extractPickupTime(trip);
  const customerName = String(raw.customerName || trip.customerName || trip.customer || '').trim();
  const customerPhone = String(raw.customerPhone || trip.customerPhone || '').trim();
  const origin = String(raw.from || trip.from || '').trim();
  const destination = String(raw.to || trip.to || '').trim();

  const { vehicleName, vehicleNumber } = resolveVehicleDetails(trip, vehicle);

  const lines: string[] = [
    `Hello ${driverName},`,
    '',
    'A new trip has been assigned to you by RK Travel Hub.',
    '',
    'TRIP DETAILS',
    '',
  ];

  if (receiptNo) lines.push(`Receipt Number: ${receiptNo}`);
  if (tripDate) lines.push(`Trip Date: ${tripDate}`);
  if (reportingTime) lines.push(`Reporting Time: ${reportingTime}`);

  if (customerName || customerPhone) {
    lines.push('');
    lines.push('CUSTOMER DETAILS');
    lines.push('');
    if (customerName) lines.push(`Customer Name: ${customerName}`);
    if (customerPhone) lines.push(`Customer Phone: ${customerPhone}`);
  }

  if (origin || destination) {
    lines.push('');
    lines.push('JOURNEY DETAILS');
    lines.push('');
    if (origin) lines.push(`Pickup Location: ${origin}`);
    if (destination) lines.push(`Destination: ${destination}`);
  }

  if (vehicleName || vehicleNumber) {
    lines.push('');
    lines.push('VEHICLE DETAILS');
    lines.push('');
    if (vehicleName) lines.push(`Vehicle: ${vehicleName}`);
    if (vehicleNumber) lines.push(`Registration Number: ${vehicleNumber}`);
  }

  lines.push('');
  lines.push('Please report on time and coordinate with the customer.');
  lines.push('');
  lines.push('Thank you.');
  lines.push('');
  lines.push('RK Travel Hub');

  return lines.join('\n');
}

/**
 * Builds the official WhatsApp Click-to-Chat URL
 * Official format: https://wa.me/PHONE_NUMBER?text=ENCODED_MESSAGE
 */
export function buildWhatsAppClickToChatUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Comprehensive Trip WhatsApp Context for Admin actions & modal
 */
export interface TripWhatsAppContext {
  customerName: string;
  customerPhone: string;
  customerValidation: PhoneValidationResult;
  customerMessage: string;
  customerWhatsAppUrl: string;

  isDriverAssigned: boolean;
  driverName: string;
  driverPhone: string;
  driverValidation: PhoneValidationResult;
  driverMessage: string;
  driverWhatsAppUrl: string;
}

export function resolveTripWhatsAppContext(
  trip: Record<string, any>,
  vehicle?: Partial<Vehicle> | null
): TripWhatsAppContext {
  const raw = trip.raw || trip;
  const customerName = String(
    raw.customerName || trip.customerName || trip.customer || 'Valued Customer'
  ).trim();
  const customerPhone = String(
    raw.customerPhone || trip.customerPhone || raw.phone || trip.phone || ''
  ).trim();
  const customerValidation = validateAndFormatWhatsAppPhone(customerPhone);
  const customerMessage = buildCustomerWhatsAppMessage(trip, vehicle);
  const customerWhatsAppUrl = customerValidation.isValid
    ? buildWhatsAppClickToChatUrl(customerValidation.formattedNumber, customerMessage)
    : '';

  const isDriverAssigned = isTripDriverAssigned(trip);
  const driverName = String(
    raw.driverName || trip.driverName || trip.driver || 'Driver Partner'
  ).trim();
  const driverPhone = String(
    raw.driverPhone || trip.driverPhone || ''
  ).trim();
  const driverValidation = validateAndFormatWhatsAppPhone(driverPhone);
  const driverMessage = buildDriverWhatsAppMessage(trip, vehicle);
  const driverWhatsAppUrl = driverValidation.isValid
    ? buildWhatsAppClickToChatUrl(driverValidation.formattedNumber, driverMessage)
    : '';

  return {
    customerName,
    customerPhone,
    customerValidation,
    customerMessage,
    customerWhatsAppUrl,
    isDriverAssigned,
    driverName,
    driverPhone,
    driverValidation,
    driverMessage,
    driverWhatsAppUrl,
  };
}

/**
 * Manual tracking structure for Administrator reference
 * Note: WhatsApp Click-to-Chat does not provide automated delivery status.
 */
export interface WhatsAppNotificationRecord {
  customerSentAt?: string;
  customerSentBy?: string;
  driverSentAt?: string;
  driverSentBy?: string;
}

export function getWhatsAppRecord(tripId: string): WhatsAppNotificationRecord {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`rk_wa_status_${tripId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markWhatsAppSent(
  tripId: string,
  type: 'customer' | 'driver',
  marked: boolean,
  adminUser = 'Administrator'
): WhatsAppNotificationRecord {
  if (typeof window === 'undefined') return {};
  const current = getWhatsAppRecord(tripId);
  const now = new Date().toISOString();

  if (type === 'customer') {
    if (marked) {
      current.customerSentAt = now;
      current.customerSentBy = adminUser;
    } else {
      delete current.customerSentAt;
      delete current.customerSentBy;
    }
  } else {
    if (marked) {
      current.driverSentAt = now;
      current.driverSentBy = adminUser;
    } else {
      delete current.driverSentAt;
      delete current.driverSentBy;
    }
  }

  try {
    localStorage.setItem(`rk_wa_status_${tripId}`, JSON.stringify(current));
  } catch {}
  return current;
}
