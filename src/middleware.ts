import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Lightweight JWT payload decoder compatible with Edge Runtime.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = atob(base64)
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Validates whether the admin session cookie is syntactically valid,
 * unexpired, and contains the required `admin: true` claim.
 */
function isValidAdminSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false

  const payload = decodeJwtPayload(cookieValue)
  if (!payload) return false

  const exp = typeof payload.exp === 'number' ? payload.exp : 0
  const nowInSeconds = Math.floor(Date.now() / 1000)

  // Token must not be expired
  if (exp && exp <= nowInSeconds) {
    return false
  }

  // Must contain custom claim admin: true
  return payload.admin === true
}

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req
  const path = nextUrl.pathname

  // Check for admin session cookie
  const adminCookie =
    cookies.get('rk_admin_session')?.value ||
    cookies.get('firebase_admin_session')?.value
  const hasValidAdminSession = isValidAdminSession(adminCookie)

  // Check for standard user session cookie
  const isUserLoggedIn = !!cookies.get('firebase_auth')?.value

  // ─────────────────────────────────────────────────────────────
  // 1. ADMIN ROUTE PROTECTION (Requirements a, b, e)
  // ─────────────────────────────────────────────────────────────
  const isAdminPath = path === '/admin' || path.startsWith('/admin/')
  const isAdminLoginPage = path === '/admin/login'

  if (isAdminPath) {
    // If accessing the admin login page:
    if (isAdminLoginPage) {
      if (hasValidAdminSession) {
        // Already authenticated as admin -> go to /admin
        return NextResponse.redirect(new URL('/admin', nextUrl))
      }
      return NextResponse.next()
    }

    // Unauthenticated visit to any /admin/* route:
    // Requirement b: Must NEVER redirect to normal /login, ONLY to /admin/login
    if (!hasValidAdminSession) {
      const adminLoginUrl = new URL('/admin/login', nextUrl)
      return NextResponse.redirect(adminLoginUrl)
    }

    return NextResponse.next()
  }

  // ─────────────────────────────────────────────────────────────
  // 2. NORMAL USER ROUTE PROTECTION
  // ─────────────────────────────────────────────────────────────
  const isProtectedUserRoute = path.startsWith('/travel')
  const isUserLoginPage = path === '/login'

  // Root redirect
  if (path === '/') {
    if (isUserLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl))
    }
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // If already logged in as normal user and visiting /login -> send to /travel
  // Requirement b: Normal user login must never redirect into /admin
  if (isUserLoginPage) {
    if (isUserLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl))
    }
    return NextResponse.next()
  }

  // If not logged in and visiting protected /travel route -> send to /login
  if (isProtectedUserRoute && !isUserLoggedIn) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/travel',
    '/travel/:path*',
    '/admin',
    '/admin/:path*',
  ],
}
