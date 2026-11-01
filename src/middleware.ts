import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = '__admin_session'

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req
  const path = nextUrl.pathname

  // 1. Admin API route protection
  if (path.startsWith('/api/admin/')) {
    // Allow admin session login / logout route
    if (path === '/api/admin/session') {
      return NextResponse.next()
    }
    const adminSession = cookies.get(ADMIN_COOKIE)?.value
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 2. Admin dashboard and login routes
  if (path === '/admin/login') {
    const adminSession = cookies.get(ADMIN_COOKIE)?.value
    if (adminSession) {
      return NextResponse.redirect(new URL('/admin', nextUrl))
    }
    return NextResponse.next()
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const adminSession = cookies.get(ADMIN_COOKIE)?.value
    if (!adminSession) {
      const loginUrl = new URL('/admin/login', nextUrl)
      loginUrl.searchParams.set('callbackUrl', path)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 3. User portal auth handling
  const isLoggedIn = !!cookies.get('firebase_auth')?.value
  const isProtected = path.startsWith('/travel')
  const isLoginPage = path === '/login'

  // Root redirect
  if (path === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl))
    }
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // If already logged in and visiting /login -> send to /travel
  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/travel', nextUrl))
    }
    return NextResponse.next()
  }

  // If not logged in and visiting protected /travel route -> send to /login
  if (isProtected && !isLoggedIn) {
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
    '/api/admin/:path*',
  ],
}

