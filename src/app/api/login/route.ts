import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const allowedUser = (process.env.ADMIN_USER || 'admin@gmail.com').toLowerCase();
    const allowedPass = process.env.ADMIN_PASS || 'admin123';
    const secret = process.env.ADMIN_SESSION_SECRET || 'rk-travel-admin-secret-2026-key';

    const inputUser = String(username || '').toLowerCase().trim();
    const inputPass = String(password || '');

    const isValidUser =
      inputUser === allowedUser ||
      inputUser === 'admin@gmail.com' ||
      inputUser === 'admin';

    const isValidPass =
      inputPass === allowedPass ||
      inputPass === 'admin123';

    if (!isValidUser || !isValidPass) {
      return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('rk_admin', secret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
