import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.delete('rk_admin');
  res.cookies.delete('firebase_auth');
  return res;
}

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.delete('rk_admin');
  res.cookies.delete('firebase_auth');
  return res;
}
