import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminAuth,
  hasAdminConfig,
  verifyAdminIdToken,
} from '@/lib/firebase/admin'
import {
  checkAdminRateLimit,
  recordFailedAdminAttempt,
  resetAdminRateLimit,
} from '@/lib/admin/rateLimit'
import { logAuditEvent } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || '127.0.0.1'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'

  let body: { idToken?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 400 })
  }

  const { idToken, email = '' } = body
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Rate-limit check by IP and Email (5 attempts per 15 minutes)
  const rateLimitStatus = checkAdminRateLimit(ip, normalizedEmail)
  if (!rateLimitStatus.allowed) {
    await logAuditEvent({
      action: 'ADMIN_LOGIN_LOCKOUT',
      email: normalizedEmail || 'unknown',
      ip,
      userAgent,
      reason: `Account lockout active. Retry in ${rateLimitStatus.retryAfterSeconds}s`,
    })

    return NextResponse.json(
      {
        error: `Too many failed attempts. Access is locked for 15 minutes. Please try again in ${rateLimitStatus.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitStatus.retryAfterSeconds || 900),
        },
      }
    )
  }

  if (!idToken) {
    recordFailedAdminAttempt(ip, normalizedEmail)
    await logAuditEvent({
      action: 'ADMIN_LOGIN_FAILURE',
      email: normalizedEmail || 'unknown',
      ip,
      userAgent,
      reason: 'Missing ID token',
    })
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 })
  }

  // 2. Check server-side Firebase Admin configuration
  if (!hasAdminConfig()) {
    console.error(
      '[AdminLogin] Firebase Admin SDK credentials are not configured on the server. Please set service account credentials.'
    )
    return NextResponse.json(
      {
        error:
          'Firebase Admin service account not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY or run scripts/setAdminClaim.ts.',
      },
      { status: 500 }
    )
  }

  try {
    // 3. Verify ID token and check custom claim `admin: true`
    const verification = await verifyAdminIdToken(idToken, true)

    if (!verification.valid || !verification.admin) {
      // Failed validation or missing `admin: true` claim
      recordFailedAdminAttempt(ip, normalizedEmail)
      await logAuditEvent({
        action: 'ADMIN_LOGIN_FAILURE',
        email: normalizedEmail || verification.email || 'unknown',
        ip,
        userAgent,
        reason: verification.error || 'Custom claim admin: true missing',
      })

      // Generic message: Never reveal whether the email exists
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 403 })
    }

    // 4. Create server-side session cookie: 1 hour duration (3600 seconds)
    const auth = getAdminAuth()
    const expiresIn = 60 * 60 * 1000 // 1 hour in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn })

    // Reset rate limiter on successful authentication
    resetAdminRateLimit(ip, normalizedEmail)

    // Log successful login
    await logAuditEvent({
      action: 'ADMIN_LOGIN_SUCCESS',
      email: verification.email || normalizedEmail,
      ip,
      userAgent,
      reason: 'Successful administrator authentication',
      metadata: { uid: verification.uid },
    })

    const response = NextResponse.json({
      success: true,
      redirect: '/admin',
      message: 'Admin session authenticated.',
    })

    // 5. Set HTTP-only, secure, Strict sameSite session cookie (Requirement e)
    response.cookies.set({
      name: 'firebase_admin_session',
      value: sessionCookie,
      maxAge: 3600, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return response
  } catch (err: unknown) {
    console.error('[AdminLogin] Error creating admin session:', err)
    recordFailedAdminAttempt(ip, normalizedEmail)
    await logAuditEvent({
      action: 'ADMIN_LOGIN_FAILURE',
      email: normalizedEmail || 'unknown',
      ip,
      userAgent,
      reason: 'Server error during authentication',
    })

    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 403 })
  }
}
