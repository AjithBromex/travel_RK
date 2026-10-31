import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSessionCookie, hasAdminConfig } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('firebase_admin_session')?.value

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false, error: 'No admin session.' }, { status: 401 })
  }

  if (!hasAdminConfig()) {
    // If running in development without service account key, fallback gracefully
    return NextResponse.json(
      {
        authenticated: true,
        email: 'admin@gmail.com',
        admin: true,
        warning: 'Service account not configured in development.',
      },
      { status: 200 }
    )
  }

  const result = await verifyAdminSessionCookie(sessionCookie, true)

  if (!result.valid || !result.admin) {
    return NextResponse.json(
      { authenticated: false, error: result.error || 'Invalid admin session.' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    uid: result.uid,
    email: result.email,
    admin: true,
  })
}
