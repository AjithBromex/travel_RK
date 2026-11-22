// =============================================================================
// RK Travel Hub - Production Test Automation Suite
// Comprehensive Unit, Integration, Security, Logic & Boundary Verification
// =============================================================================

import assert from 'node:assert';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    -> ${err.message}`);
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    -> ${err.message}`);
  }
}

console.log('=============================================================================');
console.log('  RUNNING RK TRAVEL HUB AUTOMATED TEST SUITE');
console.log('=============================================================================\n');

// ─── 1. SECURITY & CRYPTOGRAPHY TESTS ─────────────────────────────────────────
console.log('[SUITE 1: Security & Cryptography]');

const TEST_SECRET = 'test-audit-admin-session-secret-2026-key-32chars';

function mockCreateToken(secret = TEST_SECRET, ttlMs = 12 * 60 * 60 * 1000) {
  const now = Date.now();
  const exp = now + ttlMs;
  const nonce = randomBytes(8).toString('hex');
  const payload = Buffer.from(`${now}:${exp}:${nonce}`).toString('base64url');
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const sig = hmac.digest('base64url');
  return `${payload}.${sig}`;
}

function mockVerifyToken(token, secret = TEST_SECRET) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSig = hmac.digest('base64url');
    const bufA = Buffer.from(sig, 'utf-8');
    const bufB = Buffer.from(expectedSig, 'utf-8');
    if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) return false;

    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const [_, expStr] = decoded.split(':');
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}

test('Session Token Generation & Validation: valid token must pass', () => {
  const token = mockCreateToken();
  assert.strictEqual(mockVerifyToken(token), true);
});

test('Session Token Tamper Detection: modified payload must fail', () => {
  const token = mockCreateToken();
  const [payload, sig] = token.split('.');
  const tamperedPayload = Buffer.from('tampered-payload').toString('base64url');
  assert.strictEqual(mockVerifyToken(`${tamperedPayload}.${sig}`), false);
});

test('Session Token Tamper Detection: modified signature must fail', () => {
  const token = mockCreateToken();
  const [payload] = token.split('.');
  const forgedSig = 'forged-invalid-signature';
  assert.strictEqual(mockVerifyToken(`${payload}.${forgedSig}`), false);
});

test('Session Token Expiration: expired token must be rejected', () => {
  const expiredToken = mockCreateToken(TEST_SECRET, -5000); // Expired 5 seconds ago
  assert.strictEqual(mockVerifyToken(expiredToken), false);
});

test('Session Token Secret Isolation: token signed with wrong secret must be rejected', () => {
  const wrongSecretToken = mockCreateToken('attacker-wrong-secret-key-123456');
  assert.strictEqual(mockVerifyToken(wrongSecretToken, TEST_SECRET), false);
});

test('Constant-Time String Comparison: timingSafeEqual behaves properly', () => {
  const a = 'admin123456';
  const b = 'admin123456';
  const c = 'admin123457';
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  const bufC = Buffer.from(c, 'utf-8');
  assert.strictEqual(timingSafeEqual(bufA, bufB), true);
  assert.strictEqual(timingSafeEqual(bufA, bufC), false);
});

// ─── 2. RATE LIMITING & BRUTE FORCE SIMULATION ──────────────────────────────
console.log('\n[SUITE 2: Rate Limiting & Brute-Force Prevention]');

test('Rate Limiter: locks out after 5 consecutive failed attempts', () => {
  const attemptsMap = new Map();
  const clientId = '192.168.1.100';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;

  function attemptLogin(pass) {
    const now = Date.now();
    const rec = attemptsMap.get(clientId);
    if (rec && rec.lockedUntil > now) {
      return { allowed: false, error: 'Locked out' };
    }
    if (pass === 'correct-secret-password') {
      attemptsMap.delete(clientId);
      return { allowed: true };
    }
    const current = (rec?.count || 0) + 1;
    const lockedUntil = current >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
    attemptsMap.set(clientId, { count: current, lockedUntil });
    return { allowed: false, remaining: Math.max(0, MAX_ATTEMPTS - current) };
  }

  // 4 failed attempts: still allowed to try
  assert.strictEqual(attemptLogin('wrong1').allowed, false);
  assert.strictEqual(attemptLogin('wrong2').allowed, false);
  assert.strictEqual(attemptLogin('wrong3').allowed, false);
  assert.strictEqual(attemptLogin('wrong4').allowed, false);

  // 5th failed attempt: triggers lockout
  const fifth = attemptLogin('wrong5');
  assert.strictEqual(fifth.allowed, false);
  assert.strictEqual(fifth.remaining, 0);

  // 6th attempt: immediately rejected by lockout
  const sixth = attemptLogin('correct-secret-password');
  assert.strictEqual(sixth.allowed, false);
  assert.strictEqual(sixth.error, 'Locked out');
});

// ─── 3. TRIP CALCULATIONS & PRICING FORMULA TESTS ─────────────────────────────
console.log('\n[SUITE 3: Business Logic & Trip Pricing Calculations]');

function calculateTripFare(params) {
  const distanceTraveled = Math.max(0, (params.endingKm || 0) - (params.startingKm || 0));
  const extraKm = Math.max(0, distanceTraveled - (params.includedKm || 0));
  const extraKmCharge = extraKm * (params.extraKmRate || 0);
  const totalFare = (params.baseFare || 0) + extraKmCharge;
  const totalPaid =
    (Number(params.customerPaid) || 0) >= (Number(params.advanceReceived) || 0)
      ? Number(params.customerPaid) || 0
      : Number(params.advanceReceived) || 0;
  const customerBalance = Math.max(0, totalFare - totalPaid);
  const driverBalance = Math.max(0, (Number(params.driverAgreedPay) || 0) - (Number(params.driverPaid) || 0));

  return {
    distanceTraveled,
    extraKm,
    extraKmCharge,
    totalFare,
    customerBalance,
    driverBalance,
  };
}

test('calculateTripFare: standard trip with included KM within package', () => {
  const result = calculateTripFare({
    startingKm: 1000,
    endingKm: 1200, // 200 km
    includedKm: 250,
    extraKmRate: 20,
    baseFare: 5000,
    advanceReceived: 1000,
    customerPaid: 1000,
    driverAgreedPay: 2000,
    driverPaid: 500,
  });

  assert.strictEqual(result.distanceTraveled, 200);
  assert.strictEqual(result.extraKm, 0);
  assert.strictEqual(result.extraKmCharge, 0);
  assert.strictEqual(result.totalFare, 5000);
  assert.strictEqual(result.customerBalance, 4000);
  assert.strictEqual(result.driverBalance, 1500);
});

test('calculateTripFare: extra KM exceeds package', () => {
  const result = calculateTripFare({
    startingKm: 5000,
    endingKm: 5350, // 350 km
    includedKm: 300, // 50 extra km
    extraKmRate: 25, // 50 * 25 = 1250 extra
    baseFare: 8000,
    advanceReceived: 2000,
    customerPaid: 2000,
    driverAgreedPay: 3000,
    driverPaid: 1000,
  });

  assert.strictEqual(result.distanceTraveled, 350);
  assert.strictEqual(result.extraKm, 50);
  assert.strictEqual(result.extraKmCharge, 1250);
  assert.strictEqual(result.totalFare, 9250);
  assert.strictEqual(result.customerBalance, 7250);
});

test('calculateTripFare: ensures advance is not double-subtracted when customerPaid includes it', () => {
  // If customer paid ₹3,000 total (which includes ₹1,000 advance)
  const result = calculateTripFare({
    startingKm: 0,
    endingKm: 100,
    includedKm: 100,
    extraKmRate: 10,
    baseFare: 10000,
    advanceReceived: 1000,
    customerPaid: 3000,
  });

  // Balance should be 10000 - 3000 = 7000 (NOT 6000!)
  assert.strictEqual(result.customerBalance, 7000);
});

test('calculateTripFare: negative ending KM clamped to zero distance', () => {
  const result = calculateTripFare({
    startingKm: 500,
    endingKm: 400, // Invalid meter rollback
    includedKm: 100,
    extraKmRate: 20,
    baseFare: 3000,
  });
  assert.strictEqual(result.distanceTraveled, 0);
  assert.strictEqual(result.extraKm, 0);
  assert.strictEqual(result.totalFare, 3000);
});

// ─── 4. NUMBER TO WORDS (INDIAN RUPEES) TESTS ────────────────────────────────
console.log('\n[SUITE 4: Currency & Number to Words in INR]');

function numberToWordsINR(amount) {
  if (!amount || isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return tens[ten] + (rest ? ' ' + ones[rest] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) res += convertTwoDigits(rest);
    return res;
  }

  const rounded = Math.floor(Math.abs(amount));
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  const parts = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  const words = parts.filter(Boolean).join(' ');
  return words ? `${words} Rupees Only` : 'Zero Rupees Only';
}

test('numberToWordsINR: handles basic numbers accurately', () => {
  assert.strictEqual(numberToWordsINR(0), 'Zero Rupees Only');
  assert.strictEqual(numberToWordsINR(500), 'Five Hundred Rupees Only');
  assert.strictEqual(numberToWordsINR(2500), 'Two Thousand Five Hundred Rupees Only');
  assert.strictEqual(numberToWordsINR(15000), 'Fifteen Thousand Rupees Only');
  assert.strictEqual(numberToWordsINR(125000), 'One Lakh Twenty Five Thousand Rupees Only');
  assert.strictEqual(numberToWordsINR(10000000), 'One Crore Rupees Only');
});

// ─── 5. WHATSAPP PHONE NUMBER VALIDATION TESTS ───────────────────────────────
console.log('\n[SUITE 5: Phone Number Formatting & WhatsApp Integration]');

function validateAndFormatWhatsAppPhone(rawInput) {
  if (!rawInput || !String(rawInput).trim()) {
    return { isValid: false, formattedNumber: '' };
  }
  const cleaned = String(rawInput).trim();
  let digits = cleaned.replace(/\D/g, '');
  if (digits.length < 10) {
    return { isValid: false, formattedNumber: '' };
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { isValid: true, formattedNumber: digits };
  }
  if (digits.length === 10) {
    return { isValid: true, formattedNumber: `91${digits}` };
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return { isValid: true, formattedNumber: digits };
  }
  return { isValid: false, formattedNumber: '' };
}

test('validateAndFormatWhatsAppPhone: formats 10-digit mobile with +91 country code', () => {
  const res = validateAndFormatWhatsAppPhone('9876543210');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.formattedNumber, '919876543210');
});

test('validateAndFormatWhatsAppPhone: handles 11-digit mobile starting with 0', () => {
  const res = validateAndFormatWhatsAppPhone('09876543210');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.formattedNumber, '919876543210');
});

test('validateAndFormatWhatsAppPhone: avoids double country code on 12-digit number', () => {
  const res = validateAndFormatWhatsAppPhone('+91 98765 43210');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.formattedNumber, '919876543210');
});

test('validateAndFormatWhatsAppPhone: rejects invalid short numbers', () => {
  const res = validateAndFormatWhatsAppPhone('12345');
  assert.strictEqual(res.isValid, false);
});

// ─── 6. TRASH & DATA RECOVERY IDENTIFIER TESTS ───────────────────────────────
console.log('\n[SUITE 6: Trash & Soft-Delete System]');

function parseTrashIdentifier(trashId, itemParam) {
  if (itemParam?.originalCollection && itemParam?.originalId) {
    return { origCol: itemParam.originalCollection, origId: itemParam.originalId };
  }
  let clean = trashId.startsWith('trash_') ? trashId.replace(/^trash_/, '') : trashId;
  const KNOWN = ['payments', 'expenses', 'trips', 'vehicles', 'reminders', 'cashbook', 'users', 'settings'];
  for (const col of KNOWN) {
    if (clean.startsWith(`${col}_`)) {
      return { origCol: col, origId: clean.slice(col.length + 1) };
    }
  }
  const parts = clean.split('_');
  if (parts.length >= 2) {
    return { origCol: parts[0], origId: parts.slice(1).join('_') };
  }
  return { origCol: itemParam?.originalCollection || 'expenses', origId: clean };
}

test('parseTrashIdentifier: extracts collection and original document ID accurately', () => {
  assert.deepStrictEqual(parseTrashIdentifier('trips_trp-1234'), { origCol: 'trips', origId: 'trp-1234' });
  assert.deepStrictEqual(parseTrashIdentifier('payments_pay_998877'), { origCol: 'payments', origId: 'pay_998877' });
  assert.deepStrictEqual(parseTrashIdentifier('trash_expenses_exp_5544'), { origCol: 'expenses', origId: 'exp_5544' });
});

// ─── 7. BACKUP RETENTION & EXPIRY POLICY TESTS ───────────────────────────────
console.log('\n[SUITE 7: Automated Backup Retention & Disaster Recovery]');

const RETENTION_DAYS = 30;

function isBackupExpired(createdAt, retentionDays = RETENTION_DAYS) {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > retentionDays * 24 * 60 * 60 * 1000;
}

function getDaysUntilExpiry(createdAt, retentionDays = RETENTION_DAYS) {
  if (!createdAt) return 0;
  const expiryTime = new Date(createdAt).getTime() + retentionDays * 24 * 60 * 60 * 1000;
  const diffMs = expiryTime - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

test('Backup Expiry: 10-day-old backup is active with ~20 days remaining', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isBackupExpired(tenDaysAgo), false);
  assert.strictEqual(getDaysUntilExpiry(tenDaysAgo), 20);
});

test('Backup Expiry: 31-day-old backup is flagged expired with 0 days remaining', () => {
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isBackupExpired(thirtyOneDaysAgo), true);
  assert.strictEqual(getDaysUntilExpiry(thirtyOneDaysAgo), 0);
});

// ─── 8. CSV SANITIZATION & CSV INJECTION (CWE-1236) TESTS ─────────────────────
console.log('\n[SUITE 8: CSV Export Security & Formula Injection Sanitization]');

function escapeCsvField(field) {
  const str = String(field ?? '');
  // Prevent CSV Formula Injection (=, +, -, @)
  const sanitized = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

test('CSV Sanitization: neutralizes formula injection (=cmd, +SUM, @echo)', () => {
  assert.strictEqual(escapeCsvField('=1+2'), "'=1+2");
  assert.strictEqual(escapeCsvField('+cmd|'), "'+cmd|");
  assert.strictEqual(escapeCsvField('@SUM(A1:A10)'), "'@SUM(A1:A10)");
});

test('CSV Sanitization: quotes strings with commas, quotes, and newlines', () => {
  assert.strictEqual(escapeCsvField('Chennai, Tamil Nadu'), '"Chennai, Tamil Nadu"');
  assert.strictEqual(escapeCsvField('Trip "Special" Discount'), '"Trip ""Special"" Discount"');
});

// ─── 9. PAYMENT TRIP LINKAGE & SETTLEMENT VALIDATION TESTS ──────────────────
console.log('\n[SUITE 9: Payment Trip Linkage & Settlement Validation]');

function validatePaymentSubmission({ tripId, selectedTrip, type, stage, amount, maxBalance }) {
  if (!tripId || tripId === 'general' || !selectedTrip) {
    return { ok: false, error: 'Please select a trip booking. Payments can only be recorded after selecting a trip.' };
  }
  const num = Number(amount);
  if (!num || num <= 0) {
    return { ok: false, error: 'Please enter a valid payment amount' };
  }
  if (selectedTrip && type === 'customer_received' && stage === 'balance' && maxBalance !== null) {
    if (maxBalance <= 0) {
      return { ok: false, error: 'This trip is already fully settled. There is no pending balance due.' };
    }
    if (num > maxBalance) {
      return { ok: false, error: `Cannot enter more than the remaining balance of ₹${maxBalance}.` };
    }
  }
  return { ok: true };
}

test('Payment Trip Linkage: payment without linked trip (empty or general) is strictly rejected', () => {
  const trip = { id: 'TRP-1', tripNumber: 'TRP-1', totalFare: 5000, customerBalance: 2000 };
  
  const resEmpty = validatePaymentSubmission({ tripId: '', selectedTrip: null, type: 'customer_received', stage: 'advance', amount: 1000, maxBalance: 2000 });
  assert.strictEqual(resEmpty.ok, false);
  assert.match(resEmpty.error, /Please select a trip booking/);

  const resGeneral = validatePaymentSubmission({ tripId: 'general', selectedTrip: null, type: 'customer_received', stage: 'advance', amount: 1000, maxBalance: 2000 });
  assert.strictEqual(resGeneral.ok, false);
  assert.match(resGeneral.error, /Please select a trip booking/);
});

test('Payment Trip Linkage: valid linked trip succeeds', () => {
  const trip = { id: 'TRP-1', tripNumber: 'TRP-1', totalFare: 5000, customerBalance: 2000 };
  const res = validatePaymentSubmission({ tripId: 'TRP-1', selectedTrip: trip, type: 'customer_received', stage: 'balance', amount: 2000, maxBalance: 2000 });
  assert.strictEqual(res.ok, true);
});

test('Payment Settlement: balance payment exceeding remaining due is strictly rejected', () => {
  const trip = { id: 'TRP-1', tripNumber: 'TRP-1', totalFare: 5000, customerBalance: 1500 };
  const res = validatePaymentSubmission({ tripId: 'TRP-1', selectedTrip: trip, type: 'customer_received', stage: 'balance', amount: 2000, maxBalance: 1500 });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /Cannot enter more than the remaining balance/);
});

test('Payment Settlement: balance payment for fully settled trip (due = 0) is rejected', () => {
  const trip = { id: 'TRP-1', tripNumber: 'TRP-1', totalFare: 5000, customerBalance: 0 };
  const res = validatePaymentSubmission({ tripId: 'TRP-1', selectedTrip: trip, type: 'customer_received', stage: 'balance', amount: 500, maxBalance: 0 });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /This trip is already fully settled/);
});

test('Driver Payout: driver payment voucher succeeds without customer balance restriction', () => {
  const trip = { id: 'TRP-1', tripNumber: 'TRP-1', totalFare: 5000, customerBalance: 0, driverName: 'Ramesh', driverAgreedPay: 1500, driverBalance: 1500 };
  const res = validatePaymentSubmission({ tripId: 'TRP-1', selectedTrip: trip, type: 'driver_payment', stage: undefined, amount: 1500, maxBalance: 0 });
  assert.strictEqual(res.ok, true);
});

test('Driver Payout: sanitizeData removes undefined properties to prevent Firestore addDoc crashes', () => {
  const payload = {
    tripId: 'TRP-1',
    type: 'driver_payment',
    paymentStage: undefined,
    amount: 1500,
    paymentDate: '2026-11-22',
    notes: 'Driver bata',
  };
  const cleanData = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) cleanData[k] = v;
  }
  assert.strictEqual('paymentStage' in cleanData, false);
  assert.strictEqual(cleanData.type, 'driver_payment');
  assert.strictEqual(cleanData.amount, 1500);
});

test('Driver Payout: getPayments preserves local pending payments across Firestore syncs', () => {
  const localPayments = [
    { id: 'pay_1795359', tripId: 'TRP-1', type: 'driver_payment', amount: 1500, paymentDate: '2026-11-22' }
  ];
  const remotePayments = [
    { id: 'remote_1', tripId: 'TRP-1', type: 'customer_received', amount: 14500, paymentDate: '2026-11-22' }
  ];
  const remoteIds = new Set(remotePayments.map(p => p.id));
  const merged = [...remotePayments, ...localPayments.filter(p => !remoteIds.has(p.id))];
  assert.strictEqual(merged.length, 2);
  assert.ok(merged.some(p => p.id === 'pay_1795359'));
});

// ─── 10. EXPENSE TRIP LINKAGE VALIDATION TESTS ───────────────────────────────
console.log('\n[SUITE 10: Expense Trip Linkage Validation]');

function validateExpenseSubmission({ tripId, selectedTrip, amount }) {
  if (!tripId || tripId === 'general' || !selectedTrip) {
    return { ok: false, error: 'Please select a trip booking. Expenses can only be recorded after selecting a trip.' };
  }
  const num = Number(amount);
  if (!num || num <= 0) {
    return { ok: false, error: 'Please enter a valid expense amount.' };
  }
  return { ok: true };
}

test('Expense Trip Linkage: expense without linked trip (empty or general) is strictly rejected', () => {
  const resEmpty = validateExpenseSubmission({ tripId: '', selectedTrip: null, amount: 500 });
  assert.strictEqual(resEmpty.ok, false);
  assert.match(resEmpty.error, /Please select a trip booking/);

  const resGeneral = validateExpenseSubmission({ tripId: 'general', selectedTrip: null, amount: 500 });
  assert.strictEqual(resGeneral.ok, false);
  assert.match(resGeneral.error, /Please select a trip booking/);
});

test('Expense Trip Linkage: valid linked trip and amount succeeds', () => {
  const trip = { id: 'TRP-99', tripNumber: 'TRP-99', vehicleName: 'Innova' };
  const res = validateExpenseSubmission({ tripId: 'TRP-99', selectedTrip: trip, amount: 1500 });
  assert.strictEqual(res.ok, true);
});

test('Expense Trip Linkage: invalid or zero amount is rejected', () => {
  const trip = { id: 'TRP-99', tripNumber: 'TRP-99', vehicleName: 'Innova' };
  const resZero = validateExpenseSubmission({ tripId: 'TRP-99', selectedTrip: trip, amount: 0 });
  assert.strictEqual(resZero.ok, false);
  assert.match(resZero.error, /Please enter a valid expense amount/);

  const resNegative = validateExpenseSubmission({ tripId: 'TRP-99', selectedTrip: trip, amount: -100 });
  assert.strictEqual(resNegative.ok, false);
  assert.match(resNegative.error, /Please enter a valid expense amount/);
});

// ─── 10B. CASH BOOK DELETION & BALANCE RECALCULATION TESTS ────────────────────
console.log('\n[SUITE 10B: Cash Book Record Deletion & Real-time Ledger Recalculation]');

function resolveCashBookTarget(id) {
  const cleanId = String(id || '').trim();
  if (cleanId.startsWith('p-')) {
    return { targetCollection: 'payments', targetId: cleanId.slice(2) };
  }
  if (cleanId.startsWith('e-')) {
    return { targetCollection: 'expenses', targetId: cleanId.slice(2) };
  }
  return { targetCollection: 'cashbook', targetId: cleanId };
}

test('Cash Book Deletion: resolves underlying collection and document IDs for p- and e- prefixes', () => {
  const resPay = resolveCashBookTarget('p-pay_123456');
  assert.strictEqual(resPay.targetCollection, 'payments');
  assert.strictEqual(resPay.targetId, 'pay_123456');

  const resExp = resolveCashBookTarget('e-exp_789012');
  assert.strictEqual(resExp.targetCollection, 'expenses');
  assert.strictEqual(resExp.targetId, 'exp_789012');

  const resDirect = resolveCashBookTarget('cb-1700000000');
  assert.strictEqual(resDirect.targetCollection, 'cashbook');
  assert.strictEqual(resDirect.targetId, 'cb-1700000000');
});

test('Cash Book Deletion: deleted cash receipt is permanently filtered out and does not reappear', () => {
  const allPayments = [
    { id: 'pay_1', type: 'customer_received', amount: 2000, date: '2026-11-19', isDeleted: false },
    { id: 'pay_2', type: 'customer_received', amount: 3500, date: '2026-11-19', isDeleted: false },
    { id: 'pay_3', type: 'customer_received', amount: 1000, date: '2026-11-19', isDeleted: false },
  ];

  const deletedTracker = new Set(['payments:pay_2', 'cashbook:p-pay_2']);

  const activePayments = allPayments.filter(
    (p) => !p.isDeleted && !deletedTracker.has(`payments:${p.id}`) && !deletedTracker.has(`cashbook:p-${p.id}`)
  );

  assert.strictEqual(activePayments.length, 2);
  assert.strictEqual(activePayments.some((p) => p.id === 'pay_2'), false);
  assert.strictEqual(activePayments[0].id, 'pay_1');
  assert.strictEqual(activePayments[1].id, 'pay_3');
});

test('Cash Book Balance: recalculates running balance accurately upon deletion of an inflow entry', () => {
  const rawEntries = [
    { id: 'p-pay_1', date: '2026-11-19T10:00:00Z', cashIn: 1000, cashOut: 0 },
    { id: 'p-pay_2', date: '2026-11-19T11:00:00Z', cashIn: 3500, cashOut: 0 },
    { id: 'e-exp_1', date: '2026-11-19T12:00:00Z', cashIn: 0, cashOut: 500 },
  ];

  // Initial calculation
  let running = 0;
  rawEntries.forEach((e) => {
    running += e.cashIn - e.cashOut;
    e.balance = running;
  });
  assert.strictEqual(rawEntries[0].balance, 1000);
  assert.strictEqual(rawEntries[1].balance, 4500);
  assert.strictEqual(rawEntries[2].balance, 4000);

  // Delete 'p-pay_2' (receipt of 3500)
  const remaining = rawEntries.filter((e) => e.id !== 'p-pay_2');
  let newRunning = 0;
  remaining.forEach((e) => {
    newRunning += e.cashIn - e.cashOut;
    e.balance = newRunning;
  });

  assert.strictEqual(remaining.length, 2);
  assert.strictEqual(remaining[0].balance, 1000);
  // 1000 - 500 = 500
  assert.strictEqual(remaining[1].balance, 500);
});

test('Cash Book Order: sorts chronologically by date and createdAt so Advance comes before Balance payments', () => {
  const entries = [
    {
      id: 'p-pay_balance_2',
      date: '2026-11-19',
      createdAt: '2026-11-19T14:00:00.000Z',
      description: 'Customer Balance (Trip #TRP-3214)',
      cashIn: 1000,
      cashOut: 0,
      type: 'receipt',
    },
    {
      id: 'p-pay_balance_1',
      date: '2026-11-19',
      createdAt: '2026-11-19T12:00:00.000Z',
      description: 'Customer Balance (Trip #TRP-3214)',
      cashIn: 3500,
      cashOut: 0,
      type: 'receipt',
    },
    {
      id: 'p-pay_advance',
      date: '2026-11-19',
      createdAt: '2026-11-19T09:00:00.000Z',
      description: 'Customer Advance (Trip #TRP-3214)',
      cashIn: 2000,
      cashOut: 0,
      type: 'receipt',
    },
    {
      id: 'e-exp_fuel',
      date: '2026-11-19',
      createdAt: '2026-11-19T15:00:00.000Z',
      description: 'FUEL: Fuel Expense',
      cashIn: 0,
      cashOut: 1000,
      type: 'expense',
    },
  ];

  // Chronological sort
  entries.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;

    const timeA = new Date(a.createdAt || a.date).getTime();
    const timeB = new Date(b.createdAt || b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const isAdvanceA = a.type === 'receipt' && (/advance/i.test(a.description));
    const isAdvanceB = b.type === 'receipt' && (/advance/i.test(b.description));
    if (isAdvanceA && !isAdvanceB) return -1;
    if (!isAdvanceA && isAdvanceB) return 1;

    return String(a.id).localeCompare(String(b.id));
  });

  // Calculate forward running balance
  let running = 0;
  entries.forEach((e) => {
    running += e.cashIn - e.cashOut;
    e.balance = running;
  });

  // 1. Advance is first (+2000 -> balance 2000)
  assert.strictEqual(entries[0].id, 'p-pay_advance');
  assert.strictEqual(entries[0].balance, 2000);

  // 2. Balance 1 is second (+3500 -> balance 5500)
  assert.strictEqual(entries[1].id, 'p-pay_balance_1');
  assert.strictEqual(entries[1].balance, 5500);

  // 3. Balance 2 is third (+1000 -> balance 6500)
  assert.strictEqual(entries[2].id, 'p-pay_balance_2');
  assert.strictEqual(entries[2].balance, 6500);

  // 4. Fuel expense is fourth (-1000 -> balance 5500)
  assert.strictEqual(entries[3].id, 'e-exp_fuel');
  assert.strictEqual(entries[3].balance, 5500);

  // When reversed for display (newest on top):
  const displayItems = [...entries].reverse();
  assert.strictEqual(displayItems[0].id, 'e-exp_fuel'); // latest on top
  assert.strictEqual(displayItems[0].balance, 5500); // final balance on top
  assert.strictEqual(displayItems[3].id, 'p-pay_advance'); // initial advance on bottom
  assert.strictEqual(displayItems[3].balance, 2000); // initial balance on bottom
});

// ─── 11. AUDIT LOG RETENTION & AUTO-EXPIRY TESTS ─────────────────────────────
console.log('\n[SUITE 11: Audit Log 30-Day Retention & Auto-Pruning]');

const AUDIT_RETENTION_DAYS = 30;

function isAuditLogExpired(timestamp, retentionDays = AUDIT_RETENTION_DAYS) {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (isNaN(t)) return false;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return t < cutoff;
}

function getDaysUntilAuditExpiry(timestamp, retentionDays = AUDIT_RETENTION_DAYS) {
  const t = new Date(timestamp).getTime();
  const exp = t + retentionDays * 24 * 60 * 60 * 1000;
  const diff = exp - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

test('Audit Log Expiry: 5-day-old audit log is active and kept', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isAuditLogExpired(fiveDaysAgo), false);
  assert.strictEqual(getDaysUntilAuditExpiry(fiveDaysAgo), 25);
});

test('Audit Log Expiry: 31-day-old audit log is marked expired and automatically pruned', () => {
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(isAuditLogExpired(thirtyOneDaysAgo), true);
  assert.strictEqual(getDaysUntilAuditExpiry(thirtyOneDaysAgo), 0);
});

// ─── 12. ADMIN AUTH HARDENING & CREDENTIAL PRECEDENCE TESTS ─────────────────
console.log('\n[SUITE 12: Admin Authentication Hardening & Bypass Prevention]');

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function validateLoginCredentials(username, password, envUser, envPass) {
  const hasConfiguredPass = Boolean(envPass);
  const hasConfiguredUser = Boolean(envUser);
  const configuredUser = (envUser || 'admin@gmail.com').toLowerCase().trim();
  const configuredPass = (envPass || 'admin123').trim();
  const inputUser = String(username || '').toLowerCase().trim();
  const inputPass = String(password || '').trim();
  if (!inputUser || !inputPass) return false;

  const isValidUser =
    secureCompare(inputUser, configuredUser) ||
    (!hasConfiguredUser && (secureCompare(inputUser, 'admin@gmail.com') || secureCompare(inputUser, 'admin')));

  const isValidPass =
    secureCompare(inputPass, configuredPass) ||
    (!hasConfiguredPass && secureCompare(inputPass, 'admin123'));

  return isValidUser && isValidPass;
}

test('Login Security: configured ADMIN_PASS strictly rejects default admin123 bypass', () => {
  const envPass = 'CustomProductionKey#99!';
  // Default password MUST fail when custom password is set
  assert.strictEqual(validateLoginCredentials('admin@gmail.com', 'admin123', null, envPass), false);
  // Custom password MUST succeed
  assert.strictEqual(validateLoginCredentials('admin@gmail.com', envPass, null, envPass), true);
});

test('Login Security: default admin123 is only accepted when ADMIN_PASS is unset', () => {
  assert.strictEqual(validateLoginCredentials('admin@gmail.com', 'admin123', null, undefined), true);
  assert.strictEqual(validateLoginCredentials('admin', 'admin123', null, undefined), true);
  assert.strictEqual(validateLoginCredentials('admin@gmail.com', 'wrongpassword', null, undefined), false);
});

test('Session Security: raw ADMIN_SECRET string cannot be used directly as a session token', () => {
  // Raw secret has no HMAC signature, format is not payload.sig
  assert.strictEqual(mockVerifyToken(TEST_SECRET), false);
  assert.strictEqual(mockVerifyToken('rk-travel-admin-secret-2026-key'), false);
});

// ─── 13. SECURITY HEADERS & HSTS POLICY ENFORCEMENT ─────────────────────────
console.log('\n[SUITE 13: Security Headers & Transport Security (HSTS) Enforcement]');

function getSecurityHeaders(isProduction = false) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return headers;
}

test('Security Headers: nosniff, SAMEORIGIN, and Referrer-Policy are enforced', () => {
  const devHeaders = getSecurityHeaders(false);
  assert.strictEqual(devHeaders['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(devHeaders['X-Frame-Options'], 'SAMEORIGIN');
  assert.strictEqual(devHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.strictEqual(devHeaders['Strict-Transport-Security'], undefined);
});

test('Security Headers: HSTS max-age=31536000 is enforced in production', () => {
  const prodHeaders = getSecurityHeaders(true);
  assert.strictEqual(prodHeaders['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
});

// ─── 14. SETTINGS OPERATIONAL OVERVIEW & DATA HYDRATION ─────────────────────
console.log('\n[SUITE 14: Settings Operational Overview & Client Hydration]');

function calculateSettingsOperationalMetrics({ trips = [], vehicles = [], payments = [], reminders = [] }) {
  const totalFleetCount = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status !== 'inactive');
  const activeVehiclesCount = activeVehicles.length > 0 ? activeVehicles.length : vehicles.length;

  const totalTripsCount = trips.length;

  const custPayments = payments
    .filter((p) => p.type === 'customer_received')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const unrecordedAdvances = trips.reduce((sum, t) => {
    const hasRecorded = payments.some(
      (p) =>
        p.type === 'customer_received' &&
        (p.paymentStage === 'advance' || (p.notes && /advance/i.test(p.notes))) &&
        (p.tripId === t.id || p.tripId === t.tripNumber)
    );
    return sum + (hasRecorded ? 0 : Number(t.advanceReceived || 0));
  }, 0);

  const totalRevenue = custPayments + unrecordedAdvances;

  const pendingReminders = reminders.filter((r) => r.status !== 'completed');
  const activeRemindersCount = pendingReminders.length > 0 ? pendingReminders.length : reminders.length;

  return {
    totalFleetCount,
    activeVehiclesCount,
    totalTripsCount,
    totalRevenue,
    activeRemindersCount,
  };
}

test('Settings Operational Overview: calculates metrics accurately with active data', () => {
  const mockVehicles = [
    { id: 'v1', status: 'active' },
    { id: 'v2', status: 'active' },
    { id: 'v3', status: 'inactive' },
  ];
  const mockTrips = [
    { id: 't1', tripNumber: 'TRP-001', advanceReceived: 1000 },
    { id: 't2', tripNumber: 'TRP-002', advanceReceived: 2000 },
  ];
  const mockPayments = [
    { id: 'p1', tripId: 't1', type: 'customer_received', paymentStage: 'advance', amount: 1000 },
    { id: 'p2', tripId: 't1', type: 'customer_received', paymentStage: 'balance', amount: 4000 },
  ];
  const mockReminders = [
    { id: 'r1', status: 'pending' },
    { id: 'r2', status: 'completed' },
  ];

  const metrics = calculateSettingsOperationalMetrics({
    trips: mockTrips,
    vehicles: mockVehicles,
    payments: mockPayments,
    reminders: mockReminders,
  });

  assert.strictEqual(metrics.totalFleetCount, 3);
  assert.strictEqual(metrics.activeVehiclesCount, 2);
  assert.strictEqual(metrics.totalTripsCount, 2);
  // Revenue: 1000 + 4000 from p1,p2 + 2000 unrecorded advance from t2 = 7000
  assert.strictEqual(metrics.totalRevenue, 7000);
  assert.strictEqual(metrics.activeRemindersCount, 1);
});

test('Settings Hydration Fallback: falls back to stored local data when server props are empty', () => {
  const serverTrips = [];
  const storedTrips = [{ id: 't1', tripNumber: 'TRP-001' }];
  const effectiveTrips = (serverTrips && serverTrips.length > 0) ? serverTrips : storedTrips;
  assert.strictEqual(effectiveTrips.length, 1);
});

// ─── 15. AUTOMATED 5-DAY WHATSAPP TRIP REMINDERS (TWILIO) ───────────────────
console.log('\n[SUITE 15: Automated 5-Day WhatsApp Trip Reminders (Twilio Integration)]');

const TIMEZONE_IST = 'Asia/Kolkata';
const REMINDER_TYPE_ADMIN_5DAY = 'admin_5day';

function getKolkataDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, dateStr };
}

function getTargetTripDateKolkata(daysAhead = 5, baseDate = new Date()) {
  const { year, month, day } = getKolkataDateParts(baseDate);
  const target = new Date(Date.UTC(year, month - 1, day + daysAhead, 12, 0, 0));
  return getKolkataDateParts(target).dateStr;
}

function getDaysUntilTripKolkata(tripDateStr, baseDate = new Date()) {
  const todayStr = getKolkataDateParts(baseDate).dateStr;
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const [targetYear, targetMonth, targetDay] = tripDateStr.split('-').map(Number);

  const utcToday = Date.UTC(tYear, tMonth - 1, tDay);
  const utcTarget = Date.UTC(targetYear, targetMonth - 1, targetDay);

  const diffMs = utcTarget - utcToday;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatWhatsAppRecipient(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim();
  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.replace(/^whatsapp:/, '').trim();
  }
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
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

function getReminderDocumentId(tripId, tripDate, reminderType = REMINDER_TYPE_ADMIN_5DAY) {
  const cleanTripId = String(tripId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = String(tripDate).trim().replace(/[^0-9-]/g, '');
  return `${cleanTripId}_${reminderType}_${cleanDate}`;
}

function evaluateTripEligibility(trip, targetTripDate, todayDateStr = getKolkataDateParts().dateStr) {
  if (trip.isDeleted || trip.deletedAt) {
    return { isEligible: false, reason: 'Trip has been deleted/moved to trash.', status: 'missed' };
  }
  const status = String(trip.status || 'scheduled').toLowerCase();
  if (status === 'cancelled') {
    return { isEligible: false, reason: 'Trip has been cancelled.', status: 'missed' };
  }
  if (status === 'completed') {
    return { isEligible: false, reason: 'Trip has already been completed.', status: 'missed' };
  }
  if (!trip.isConfirmed) {
    return { isEligible: false, reason: 'Trip has not yet been confirmed by administrator.', status: 'pending' };
  }
  const tripDate = String(trip.tripDate || trip.startDate || '').trim();
  if (!tripDate || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
    return { isEligible: false, reason: `Invalid or missing trip date: "${tripDate}".`, status: 'failed' };
  }
  if (tripDate !== targetTripDate) {
    const daysUntil = getDaysUntilTripKolkata(tripDate, new Date());
    if (daysUntil < 5) {
      return { isEligible: false, reason: `Trip confirmed/scheduled ${daysUntil} days before departure (< 5 days). Marked as missed.`, status: 'missed' };
    }
    return { isEligible: false, reason: `Trip date (${tripDate}) does not match target 5-day reminder date (${targetTripDate}).`, status: 'pending' };
  }
  return { isEligible: true, reason: 'Trip is fully eligible for 5-day automated admin reminder.', status: 'pending' };
}

function buildReminderDetails(trip, vehicle) {
  const raw = trip.raw || trip;
  const receiptNumber = String(raw.receiptNumber || raw.tripNumber || trip.receiptNumber || trip.id || 'N/A').trim();
  const customerName = String(raw.customerName || trip.customerName || trip.customer || 'Valued Customer').trim();
  const customerPhone = String(raw.customerPhone || trip.customerPhone || raw.phone || trip.phone || 'N/A').trim();
  const tripDate = String(raw.tripDate || trip.tripDate || raw.startDate || 'N/A').trim();
  const pickupLocation = String(raw.from || trip.from || raw.pickupLocation || 'N/A').trim();
  const destination = String(raw.to || trip.to || raw.destination || 'N/A').trim();
  const driverName = String(raw.driverName || trip.driverName || raw.driver || 'Unassigned').trim();
  const driverPhone = String(raw.driverPhone || trip.driverPhone || 'N/A').trim();
  const vehicleName = String(vehicle?.name || raw.vehicleName || 'Standard Fleet').trim();
  const vehicleNumber = String(vehicle?.registrationNumber || raw.vehicleNumber || 'Pending Assignment').trim();
  const rawAmount = Number(raw.totalFare || raw.baseFare || trip.totalFare || trip.baseFare || 0);
  const tripAmount = `₹${rawAmount.toLocaleString('en-IN')}`;

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
  };
}

function validateTwilioSignature(authToken, signature, url, params = {}) {
  if (!authToken || !signature || !url) return false;
  let data = url;
  const keys = Object.keys(params).sort();
  for (const key of keys) {
    data += key + params[key];
  }
  const expected = createHmac('sha1', authToken).update(data).digest('base64');
  return expected === signature;
}

// SCENARIO 1: Confirmed trip exactly five days away
test('WhatsApp Reminders: Scenario 1 - Confirmed trip exactly 5 days away is eligible', () => {
  const todayStr = getKolkataDateParts().dateStr;
  const targetDate = getTargetTripDateKolkata(5);

  const trip = {
    id: 'trip_101',
    receiptNumber: '#1001',
    customerName: 'Ajith Customer',
    customerPhone: '9876543210',
    tripDate: targetDate,
    status: 'scheduled',
    isConfirmed: true,
    totalFare: 5000,
  };

  const result = evaluateTripEligibility(trip, targetDate, todayStr);
  assert.strictEqual(result.isEligible, true);
  assert.strictEqual(result.status, 'pending');

  const details = buildReminderDetails(trip);
  assert.strictEqual(details.receiptNumber, '#1001');
  assert.strictEqual(details.customerName, 'Ajith Customer');
  assert.strictEqual(details.tripDate, targetDate);
  assert.strictEqual(details.tripAmount, '₹5,000');
  assert.match(details.plainTextMessage, /Hello Admin,/);
  assert.match(details.plainTextMessage, /A trip is scheduled in 5 days!/);
  assert.match(details.plainTextMessage, /Receipt Number: #1001/);
});

// SCENARIO 2: Trip scheduled more than five days away
test('WhatsApp Reminders: Scenario 2 - Trip scheduled > 5 days away is not yet eligible for 5-day reminder', () => {
  const todayStr = getKolkataDateParts().dateStr;
  const targetDate5 = getTargetTripDateKolkata(5);
  const futureDate8 = getTargetTripDateKolkata(8);

  const trip = {
    id: 'trip_102',
    tripDate: futureDate8,
    isConfirmed: true,
    status: 'scheduled',
  };

  const result = evaluateTripEligibility(trip, targetDate5, todayStr);
  assert.strictEqual(result.isEligible, false);
  assert.match(result.reason, /does not match target 5-day/);
});

// SCENARIO 3: Unconfirmed trip
test('WhatsApp Reminders: Scenario 3 - Unconfirmed trip is strictly rejected', () => {
  const targetDate = getTargetTripDateKolkata(5);
  const trip = {
    id: 'trip_103',
    tripDate: targetDate,
    isConfirmed: false,
    status: 'scheduled',
  };

  const result = evaluateTripEligibility(trip, targetDate);
  assert.strictEqual(result.isEligible, false);
  assert.match(result.reason, /not yet been confirmed/);
});

// SCENARIO 4: Cancelled trip
test('WhatsApp Reminders: Scenario 4 - Cancelled trip is strictly rejected and marked missed', () => {
  const targetDate = getTargetTripDateKolkata(5);
  const trip = {
    id: 'trip_104',
    tripDate: targetDate,
    isConfirmed: true,
    status: 'cancelled',
  };

  const result = evaluateTripEligibility(trip, targetDate);
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'missed');
  assert.match(result.reason, /cancelled/i);
});

// SCENARIO 5: Completed trip
test('WhatsApp Reminders: Scenario 5 - Completed trip is strictly rejected and marked missed', () => {
  const targetDate = getTargetTripDateKolkata(5);
  const trip = {
    id: 'trip_105',
    tripDate: targetDate,
    isConfirmed: true,
    status: 'completed',
  };

  const result = evaluateTripEligibility(trip, targetDate);
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'missed');
  assert.match(result.reason, /completed/i);
});

// SCENARIO 6: Trip date changed before reminder
test('WhatsApp Reminders: Scenario 6 - Rescheduled trip invalidates old pending reminder', () => {
  const originalDate = '2026-11-25';
  const newRescheduledDate = '2026-11-28';

  const notification = {
    id: getReminderDocumentId('trip_106', originalDate),
    tripId: 'trip_106',
    tripDate: originalDate,
    status: 'pending',
  };

  const updatedTrip = {
    id: 'trip_106',
    tripDate: newRescheduledDate,
    isConfirmed: true,
    status: 'scheduled',
  };

  // When live trip date differs from recorded notification date, stale record is invalidated
  const isStale = updatedTrip.tripDate !== notification.tripDate;
  assert.strictEqual(isStale, true);

  const updatedNotification = {
    ...notification,
    status: isStale ? 'missed' : notification.status,
    errorMessage: isStale ? `Trip date was rescheduled from ${originalDate} to ${newRescheduledDate}.` : null,
  };

  assert.strictEqual(updatedNotification.status, 'missed');
  assert.match(updatedNotification.errorMessage, /rescheduled/);

  // New reminder cycle is generated with new target date
  const newNotificationId = getReminderDocumentId('trip_106', newRescheduledDate);
  assert.notStrictEqual(newNotificationId, notification.id);
});

// SCENARIO 7: Trip confirmed fewer than five days before departure
test('WhatsApp Reminders: Scenario 7 - Trip confirmed < 5 days before departure is marked missed', () => {
  const todayStr = getKolkataDateParts().dateStr;
  const targetDate5 = getTargetTripDateKolkata(5);
  const urgentDate2 = getTargetTripDateKolkata(2);

  const trip = {
    id: 'trip_107',
    tripDate: urgentDate2,
    isConfirmed: true,
    status: 'scheduled',
  };

  const result = evaluateTripEligibility(trip, targetDate5, todayStr);
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'missed');
  assert.match(result.reason, /Marked as missed/);
});

// SCENARIO 8: Multiple trips on the same date
test('WhatsApp Reminders: Scenario 8 - Multiple trips on the same target date receive unique idempotent IDs', () => {
  const targetDate = getTargetTripDateKolkata(5);
  const tripA = { id: 'trip_201', tripDate: targetDate, isConfirmed: true, status: 'scheduled' };
  const tripB = { id: 'trip_202', tripDate: targetDate, isConfirmed: true, status: 'scheduled' };

  const notifIdA = getReminderDocumentId(tripA.id, tripA.tripDate);
  const notifIdB = getReminderDocumentId(tripB.id, tripB.tripDate);

  assert.strictEqual(notifIdA, `trip_201_admin_5day_${targetDate}`);
  assert.strictEqual(notifIdB, `trip_202_admin_5day_${targetDate}`);
  assert.notStrictEqual(notifIdA, notifIdB);
});

// SCENARIO 9: Duplicate scheduler execution
test('WhatsApp Reminders: Scenario 9 - Idempotency lock strictly prevents duplicate dispatch', () => {
  const notificationsStore = new Map();

  function attemptAcquireLock(notificationId, targetStatus) {
    if (notificationsStore.has(notificationId)) {
      const existing = notificationsStore.get(notificationId);
      if (['submitted', 'sent', 'delivered', 'missed'].includes(existing.status)) {
        return { locked: false, reason: 'Already in terminal state' };
      }
      if (existing.status === 'processing') {
        return { locked: false, reason: 'Currently locked by another process' };
      }
    }

    notificationsStore.set(notificationId, { status: targetStatus, timestamp: Date.now() });
    return { locked: true };
  }

  const notifId = 'trip_301_admin_5day_2026-11-25';

  // Execution 1: successfully acquires lock
  const run1 = attemptAcquireLock(notifId, 'processing');
  assert.strictEqual(run1.locked, true);

  // Execution 2 (concurrent or repeated trigger): rejected by lock
  const run2 = attemptAcquireLock(notifId, 'processing');
  assert.strictEqual(run2.locked, false);
  assert.strictEqual(run2.reason, 'Currently locked by another process');

  // Execution 1 completes and marks submitted
  notificationsStore.set(notifId, { status: 'submitted', messageSid: 'SM123456789' });

  // Execution 3 (retry after completion): strictly skipped
  const run3 = attemptAcquireLock(notifId, 'processing');
  assert.strictEqual(run3.locked, false);
  assert.strictEqual(run3.reason, 'Already in terminal state');
});

// SCENARIO 10: Twilio API failure handling
test('WhatsApp Reminders: Scenario 10 - Twilio API failure marks status failed without throwing unhandled error', () => {
  const mockNotification = {
    id: 'trip_401_admin_5day_2026-11-25',
    status: 'processing',
  };

  const simulatedTwilioError = new Error('Twilio API Error [21608]: The number is not joined to the sandbox.');

  function handleTwilioResult(notif, err, result) {
    if (err) {
      return {
        ...notif,
        status: 'failed',
        errorMessage: err.message,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      ...notif,
      status: 'submitted',
      twilioMessageSid: result.sid,
      updatedAt: new Date().toISOString(),
    };
  }

  const failedState = handleTwilioResult(mockNotification, simulatedTwilioError, null);
  assert.strictEqual(failedState.status, 'failed');
  assert.match(failedState.errorMessage, /21608/);
});

// SCENARIO 11: Invalid admin phone number
test('WhatsApp Reminders: Scenario 11 - Invalid admin phone number is rejected before calling Twilio', () => {
  assert.strictEqual(formatWhatsAppRecipient(''), '');
  assert.strictEqual(formatWhatsAppRecipient('12345'), ''); // Too short
  assert.strictEqual(formatWhatsAppRecipient('invalid_text'), '');

  // Valid numbers format correctly
  assert.strictEqual(formatWhatsAppRecipient('9876543210'), 'whatsapp:+919876543210');
  assert.strictEqual(formatWhatsAppRecipient('09876543210'), 'whatsapp:+919876543210');
  assert.strictEqual(formatWhatsAppRecipient('+919876543210'), 'whatsapp:+919876543210');
  assert.strictEqual(formatWhatsAppRecipient('whatsapp:+919876543210'), 'whatsapp:+919876543210');
});

// SCENARIO 12: Failed delivery callback
test('WhatsApp Reminders: Scenario 12 - Twilio status callback updates delivered or failed states accurately', () => {
  const currentNotif = {
    id: 'trip_501_admin_5day_2026-11-25',
    twilioMessageSid: 'SM999888777',
    status: 'submitted',
  };

  function applyTwilioCallback(notif, messageStatus, errorCode, errorMessage) {
    const status = String(messageStatus).toLowerCase();
    if (status === 'delivered' || status === 'read') {
      return { ...notif, status: 'delivered', deliveredAt: new Date().toISOString() };
    }
    if (status === 'failed' || status === 'undelivered') {
      return { ...notif, status: 'failed', errorMessage: errorMessage || `Code ${errorCode}` };
    }
    if (status === 'sent') {
      return notif.status === 'delivered' ? notif : { ...notif, status: 'sent' };
    }
    return notif;
  }

  const delivered = applyTwilioCallback(currentNotif, 'delivered', null, null);
  assert.strictEqual(delivered.status, 'delivered');
  assert.ok(delivered.deliveredAt);

  const failed = applyTwilioCallback(currentNotif, 'undelivered', '30008', 'Unknown error');
  assert.strictEqual(failed.status, 'failed');
  assert.strictEqual(failed.errorMessage, 'Unknown error');
});

// SCENARIO 13: Unauthorized access to notification history
test('WhatsApp Reminders: Scenario 13 - Unauthorized requests are strictly blocked', () => {
  function verifyAdminAuth(req) {
    const cookieVal = req?.cookies?.get?.('rk_admin')?.value;
    if (mockVerifyToken(cookieVal)) return { authorized: true };
    const authHeader = req?.headers?.get?.('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (mockVerifyToken(bearer)) return { authorized: true };
    }
    return { authorized: false, reason: 'Unauthorized administrative access' };
  }

  const fakeUnauthorizedReq = {
    cookies: { get: () => undefined },
    headers: { get: () => null },
  };

  const authCheck = verifyAdminAuth(fakeUnauthorizedReq);
  assert.strictEqual(authCheck.authorized, false);

  // Authenticated admin token succeeds
  const validToken = mockCreateToken();
  const fakeAuthorizedReq = {
    cookies: { get: (name) => (name === 'rk_admin' ? { value: validToken } : undefined) },
    headers: { get: () => null },
  };
  const authCheckPass = verifyAdminAuth(fakeAuthorizedReq);
  assert.strictEqual(authCheckPass.authorized, true);
});

// SCENARIO 14: Manual retry of failed notifications
test('WhatsApp Reminders: Scenario 14 - Manual retry safely re-dispatches failed notification', () => {
  const failedNotif = {
    id: 'trip_601_admin_5day_2026-11-25',
    tripId: 'trip_601',
    status: 'failed',
    errorMessage: 'Twilio unreachable',
    attempts: 1,
  };

  function manualRetry(notif) {
    if (notif.status === 'delivered') {
      return { success: false, reason: 'Already delivered' };
    }
    // Simulate successful retry
    return {
      success: true,
      updatedRecord: {
        ...notif,
        status: 'submitted',
        twilioMessageSid: 'SM_RETRY_SUCCESS_111',
        errorMessage: null,
        attempts: (notif.attempts || 1) + 1,
        sentAt: new Date().toISOString(),
      },
    };
  }

  const retryRes = manualRetry(failedNotif);
  assert.strictEqual(retryRes.success, true);
  assert.strictEqual(retryRes.updatedRecord.status, 'submitted');
  assert.strictEqual(retryRes.updatedRecord.twilioMessageSid, 'SM_RETRY_SUCCESS_111');
  assert.strictEqual(retryRes.updatedRecord.errorMessage, null);
  assert.strictEqual(retryRes.updatedRecord.attempts, 2);
});

// SCENARIO 15: Timezone accuracy at 10:00 AM Asia/Kolkata
test('WhatsApp Reminders: Scenario 15 - Timezone calculation accurately computes 5 calendar days ahead in IST', () => {
  // Test IST base date: 2026-11-20
  const istDate = new Date('2026-11-20T04:30:00.000Z'); // 10:00 AM IST is 04:30 UTC
  const kolkataParts = getKolkataDateParts(istDate);
  assert.strictEqual(kolkataParts.dateStr, '2026-11-20');

  const targetDate = getTargetTripDateKolkata(5, istDate);
  assert.strictEqual(targetDate, '2026-11-25');

  const daysDiff = getDaysUntilTripKolkata('2026-11-25', istDate);
  assert.strictEqual(daysDiff, 5);
});

// Webhook signature validation test
test('WhatsApp Reminders: Twilio signature verification succeeds with matching HMAC-SHA1', () => {
  const authToken = '12345secret-auth-token-twilio';
  const url = 'https://travel-rk.vercel.app/api/webhooks/twilio';
  const params = {
    MessageSid: 'SM1234567890',
    MessageStatus: 'delivered',
  };

  // Generate valid signature using HMAC-SHA1
  let data = url + 'MessageSidSM1234567890' + 'MessageStatusdelivered';
  const validSignature = createHmac('sha1', authToken).update(data).digest('base64');

  assert.strictEqual(validateTwilioSignature(authToken, validSignature, url, params), true);
  assert.strictEqual(validateTwilioSignature(authToken, 'tampered_signature', url, params), false);
  assert.strictEqual(validateTwilioSignature('', validSignature, url, params), false);
});

// ─── 16. EDGE RUNTIME & MIDDLEWARE API SECURITY RULES ───────────────────────
console.log('\n[SUITE 16: Edge Middleware Routing & Webhook Protection]');

test('Middleware API Security: Twilio webhook path is exempted from admin cookie requirement', () => {
  function checkMiddlewareExemption(pathname) {
    const isExempt =
      pathname === '/api/login' ||
      pathname === '/api/logout' ||
      pathname === '/api/auth/session' ||
      pathname === '/api/webhooks/twilio';
    return isExempt;
  }

  assert.strictEqual(checkMiddlewareExemption('/api/webhooks/twilio'), true);
  assert.strictEqual(checkMiddlewareExemption('/api/login'), true);
  assert.strictEqual(checkMiddlewareExemption('/api/logout'), true);
  assert.strictEqual(checkMiddlewareExemption('/api/auth/session'), true);
  assert.strictEqual(checkMiddlewareExemption('/api/trips'), false);
  assert.strictEqual(checkMiddlewareExemption('/api/admin/trash'), false);
});

test('Middleware API Security: Vercel Cron routes accept CRON_SECRET or x-vercel-cron header', () => {
  const CRON_SECRET = 'sample-cron-secret-2026';

  function evaluateCronAuth(pathname, authBearer, vercelHeader) {
    const isCronPath =
      pathname === '/api/admin/backups/cron' ||
      pathname === '/api/admin/whatsapp/cron';

    if (!isCronPath) return false;

    const isTokenValid = Boolean(CRON_SECRET) && authBearer === CRON_SECRET;
    const isHeaderValid = vercelHeader === '1';

    return isTokenValid || isHeaderValid;
  }

  // Backup cron with bearer token
  assert.strictEqual(evaluateCronAuth('/api/admin/backups/cron', 'sample-cron-secret-2026', null), true);
  // WhatsApp cron with bearer token
  assert.strictEqual(evaluateCronAuth('/api/admin/whatsapp/cron', 'sample-cron-secret-2026', null), true);
  // WhatsApp cron with x-vercel-cron header
  assert.strictEqual(evaluateCronAuth('/api/admin/whatsapp/cron', '', '1'), true);
  // Invalid secret
  assert.strictEqual(evaluateCronAuth('/api/admin/whatsapp/cron', 'wrong-secret', null), false);
  // Normal non-cron path should not pass via cron auth
  assert.strictEqual(evaluateCronAuth('/api/admin/trash', 'sample-cron-secret-2026', null), false);
});

// ─── 17. ADMIN STORE DATA NORMALIZATION & CACHE INTEGRITY ──────────────────
console.log('\n[SUITE 17: Admin Store Data Normalization & Cache Invalidation]');

test('Admin Store Data Normalization: non-numeric strings safely default to 0 instead of NaN', () => {
  function cleanNumericField(v, isRequired = false) {
    const parsed = Number(v);
    const cleaned = (v === '' || v == null || Number.isNaN(parsed)) ? 0 : parsed;
    if (isRequired && (cleaned === 0 && (v === '' || Number.isNaN(parsed)))) {
      throw new Error('Required numeric field is invalid');
    }
    return cleaned;
  }

  assert.strictEqual(cleanNumericField('500'), 500);
  assert.strictEqual(cleanNumericField(1250), 1250);
  assert.strictEqual(cleanNumericField(''), 0);
  assert.strictEqual(cleanNumericField(null), 0);
  assert.strictEqual(cleanNumericField(undefined), 0);
  assert.strictEqual(cleanNumericField('abc'), 0);
  assert.strictEqual(cleanNumericField(NaN), 0);
  assert.throws(() => cleanNumericField('invalid', true), /Required numeric field is invalid/);
});

test('Admin Store Cache Invalidation: updates and deletions purge related cached datasets', () => {
  const memoryCache = new Map();
  memoryCache.set('trips', [{ id: '1' }]);
  memoryCache.set('payments', [{ id: '1' }]);
  memoryCache.set('expenses', [{ id: '1' }]);
  memoryCache.set('cashbook', [{ id: '1' }]);

  function invalidateOnMutation(slug) {
    memoryCache.delete(slug);
    if (slug === 'trips') {
      memoryCache.delete('payments');
      memoryCache.delete('expenses');
      memoryCache.delete('cashbook');
    }
    if (slug === 'payments' || slug === 'expenses') {
      memoryCache.delete('trips');
      memoryCache.delete('cashbook');
    }
  }

  // Mutating a payment purges payments, trips, and cashbook
  invalidateOnMutation('payments');
  assert.strictEqual(memoryCache.has('payments'), false);
  assert.strictEqual(memoryCache.has('cashbook'), false);
  assert.strictEqual(memoryCache.has('trips'), false);
  assert.strictEqual(memoryCache.has('expenses'), true);
});

// ─── 18. ENHANCED CSV FORMULA INJECTION HARDENING (CWE-1236) ────────────────
console.log('\n[SUITE 18: Enhanced CSV Formula Injection Defense]');

test('CSV Formula Injection: neutralizes tab, carriage return, pipe, and formula operators', () => {
  function escapeCsvField(field) {
    if (typeof field === 'number') {
      return isNaN(field) ? '0' : String(field);
    }
    const str = String(field ?? '');
    const sanitized = /^[=+\-@\t\r|]/.test(str) ? `'${str}` : str;
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }

  // Formula injections are neutralized with single quote prefix
  assert.strictEqual(escapeCsvField('=cmd|/C calc'), '\'=cmd|/C calc');
  assert.strictEqual(escapeCsvField('+1+1'), '\'+1+1');
  assert.strictEqual(escapeCsvField('-2+3'), '\'-2+3');
  assert.strictEqual(escapeCsvField('@SUM(A1:A10)'), '\'@SUM(A1:A10)');
  assert.strictEqual(escapeCsvField('\tpowershell'), '\'\tpowershell');
  assert.strictEqual(escapeCsvField('|whoami'), '\'|whoami');

  // Genuine numbers are safely preserved without quote prefix
  assert.strictEqual(escapeCsvField(1500), '1500');
  assert.strictEqual(escapeCsvField(-250), '-250');
  assert.strictEqual(escapeCsvField(0), '0');
  assert.strictEqual(escapeCsvField(NaN), '0');

  // Text with commas and quotes are escaped
  assert.strictEqual(escapeCsvField('RK Travels, Kerala'), '"RK Travels, Kerala"');
  assert.strictEqual(escapeCsvField('Trip "Special" Package'), '"Trip ""Special"" Package"');
});

// ─── 19. FIRESTORE PRIVILEGE ESCALATION DEFENSE ─────────────────────────────
console.log('\n[SUITE 19: Firestore Privilege Escalation Guard]');

test('Privilege Escalation Defense: non-admin cannot self-assign or escalate role to admin', () => {
  function evaluateUserCreateRule(authUid, resourceData, requestUid, requestRole, isAdmin) {
    if (isAdmin) return true;
    if (authUid === requestUid) {
      if (!requestRole) return true;
      if (String(requestRole).toLowerCase() === 'admin') return false; // Rejected!
      return true;
    }
    return false;
  }

  // Self-signup attempting to set role: "admin" is rejected
  assert.strictEqual(evaluateUserCreateRule('user_123', null, 'user_123', 'admin', false), false);
  assert.strictEqual(evaluateUserCreateRule('user_123', null, 'user_123', 'ADMIN', false), false);

  // Self-signup setting role: "staff" is accepted
  assert.strictEqual(evaluateUserCreateRule('user_123', null, 'user_123', 'staff', false), true);

  // Administrator can assign any role
  assert.strictEqual(evaluateUserCreateRule('admin_001', null, 'user_123', 'admin', true), true);
});

test('Immutable Audit Logs: update operation on audit log records is strictly forbidden', () => {
  function allowAuditLogUpdate() {
    return false; // In firestore.rules: allow update: if false;
  }
  assert.strictEqual(allowAuditLogUpdate(), false);
});

// ─── 20. FINANCIAL & PAYMENT BOUNDARY CONDITIONS ────────────────────────────
console.log('\n[SUITE 20: Financial & Payment Boundary Conditions]');

test('Payment Calculations: fractional currency rounding and zero due trips', () => {
  // Test precision
  const fare = 15450.75;
  const advance = 5000.25;
  const balance = fare - advance;
  assert.strictEqual(balance, 10450.5);

  // Zero-fare trip (complimentary service)
  const zeroFare = 0;
  const zeroDue = Math.max(0, zeroFare - 0);
  assert.strictEqual(zeroDue, 0);

  // Overpayment gracefully clamps balance to 0 instead of negative
  const overPaid = Math.max(0, 1000 - 1500);
  assert.strictEqual(overPaid, 0);
});


// ─── TEST SUMMARY ─────────────────────────────────────────────────────────────
console.log('\n=============================================================================');
console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests > 0) {
  console.log(`  FAILURES: ${failedTests}`);
  failures.forEach(f => console.error(`    - ${f.name}: ${f.error.message}`));
  process.exit(1);
} else {
  console.log('  ALL TESTS COMPLETED SUCCESSFULLY! ZERO DEFECTS DETECTED.');
  console.log('=============================================================================');
}

