import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { SESSION_COOKIE, logAudit } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

// In-memory brute force protection: 5 attempts per 15 minutes
const hits = new Map<string, { n: number; t: number }>();

function limited(key: string) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > 15 * 60_000) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  return ++h.n > 5;
}

const fail = (status = 401) =>
  NextResponse.json({ error: "Invalid admin credentials." }, { status });

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const { email, password } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || typeof password !== "string") {
    return fail(400);
  }

  if (limited(`${ip}:${email.toLowerCase()}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  // Sign in server-side with Google Identity Toolkit REST API
  // Ensures admin credentials never leak or turn the admin into a normal web app user
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  if (!r.ok) {
    await logAudit(email, "admin_login_failed", ip);
    return fail();
  }

  const { idToken } = await r.json();

  try {
    const d = await adminAuth.verifyIdToken(idToken);
    if (d.admin !== true) {
      await logAudit(email, "admin_login_denied", ip);
      return fail();
    }

    const cookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 1000,
    });
    const res = NextResponse.json({ ok: true, success: true });

    // Set strict HttpOnly session cookie
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });

    // Also set firebase_admin_session for compatibility
    res.cookies.set("firebase_admin_session", cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });

    await logAudit(email, "admin_login", ip);
    return res;
  } catch (err) {
    console.error("[api/admin/session] Verification error:", err);
    return fail();
  }
}
