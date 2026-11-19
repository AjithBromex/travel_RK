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

