import { NextResponse } from 'next/server';

export async function POST(req) {
  const { username, password } = await req.json();
  if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS)
    return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('rk_admin', process.env.ADMIN_SESSION_SECRET, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12,
  });
  return res;
}
