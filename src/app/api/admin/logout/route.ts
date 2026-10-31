import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, hasAdminConfig } from '@/lib/firebase/admin'
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
  const sessionCookie = req.cookies.get('firebase_admin_session')?.value

  if (sessionCookie && hasAdminConfig()) {
    try {
      const auth = getAdminAuth()
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, false)

      // Revoke all refresh tokens for this user (Requirement g)
      await auth.revokeRefreshTokens(decodedClaims.sub)

      await logAuditEvent({
        action: 'ADMIN_LOGOUT',
        email: decodedClaims.email || 'unknown',
        ip,
        userAgent,
        reason: 'Administrator signed out and revoked tokens',
        metadata: { uid: decodedClaims.sub },
      })
    } catch (err) {
      console.warn('[AdminLogout] Error revoking refresh tokens:', err)
    }
  }

  const response = NextResponse.json({
    success: true,
    redirect: '/admin/login',
  })

  // Clear admin session cookie
  response.cookies.set({
    name: 'firebase_admin_session',
    value: '',
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })

  return response
}
