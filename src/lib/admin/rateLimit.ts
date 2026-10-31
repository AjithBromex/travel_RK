interface RateLimitRecord {
  attempts: number[]
  lockedUntil?: number
}

// In-memory rate limiting store
const rateLimitStore = new Map<string, RateLimitRecord>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes lockout

/**
 * Prunes expired attempts from a record.
 */
function pruneAttempts(record: RateLimitRecord, now: number): number[] {
  return record.attempts.filter((ts) => now - ts < WINDOW_MS)
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
  remainingAttempts: number
}

/**
 * Checks if the given IP and email are allowed to attempt admin login.
 */
export function checkAdminRateLimit(ip: string, email: string): RateLimitResult {
  const now = Date.now()
  const normalizedEmail = email.trim().toLowerCase()

  const keys = [`ip:${ip || 'unknown'}`, `email:${normalizedEmail}`]

  for (const key of keys) {
    const record = rateLimitStore.get(key)
    if (!record) continue

    // Check if under active lockout
    if (record.lockedUntil && now < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000)
      return {
        allowed: false,
        retryAfterSeconds,
        remainingAttempts: 0,
      }
    }

    // Prune expired attempts
    const validAttempts = pruneAttempts(record, now)
    record.attempts = validAttempts

    if (validAttempts.length >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS
      const retryAfterSeconds = Math.ceil(LOCKOUT_MS / 1000)
      return {
        allowed: false,
        retryAfterSeconds,
        remainingAttempts: 0,
      }
    }
  }

  // Calculate lowest remaining attempts among keys
  let maxAttemptsUsed = 0
  for (const key of keys) {
    const record = rateLimitStore.get(key)
    if (record) {
      const valid = pruneAttempts(record, now)
      if (valid.length > maxAttemptsUsed) {
        maxAttemptsUsed = valid.length
      }
    }
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - maxAttemptsUsed),
  }
}

/**
 * Records a failed admin login attempt for both IP and email.
 */
export function recordFailedAdminAttempt(ip: string, email: string): RateLimitResult {
  const now = Date.now()
  const normalizedEmail = email.trim().toLowerCase()
  const keys = [`ip:${ip || 'unknown'}`, `email:${normalizedEmail}`]

  let isLocked = false
  let maxAttemptsUsed = 0

  for (const key of keys) {
    let record = rateLimitStore.get(key)
    if (!record) {
      record = { attempts: [] }
      rateLimitStore.set(key, record)
    }

    const validAttempts = pruneAttempts(record, now)
    validAttempts.push(now)
    record.attempts = validAttempts

    if (validAttempts.length >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS
      isLocked = true
    }

    if (validAttempts.length > maxAttemptsUsed) {
      maxAttemptsUsed = validAttempts.length
    }
  }

  if (isLocked) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
      remainingAttempts: 0,
    }
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - maxAttemptsUsed),
  }
}

/**
 * Clears failed attempts for an IP and email upon successful authentication.
 */
export function resetAdminRateLimit(ip: string, email: string): void {
  const normalizedEmail = email.trim().toLowerCase()
  rateLimitStore.delete(`ip:${ip || 'unknown'}`)
  rateLimitStore.delete(`email:${normalizedEmail}`)
}
