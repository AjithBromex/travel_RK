import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req
  const isLoggedIn = !!cookies.get('firebase_auth')?.value
  const path = nextUrl.pathname

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
  ],
}
