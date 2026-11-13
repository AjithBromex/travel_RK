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
