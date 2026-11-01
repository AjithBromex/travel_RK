import { NextResponse } from 'next/server';

export async function POST(req) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303);
  res.cookies.delete('rk_admin');
  return res;
}
