import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { uid, email, idToken } = body;

    // Validate that the session payload contains legitimate user identifier
    if (!uid && !email && !idToken) {
      return NextResponse.json(
        { error: "Authentication credentials or user identification required to initialize session." },
        { status: 400 }
      );
    }

    const res = NextResponse.json({ ok: true });
    // 7 days expiration
    const maxAge = 60 * 60 * 24 * 7;
    res.cookies.set("firebase_auth", "true", {
      path: "/",
      maxAge,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false, // Allows both client and server to verify session
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to set session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("firebase_auth", "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to clear session" }, { status: 500 });
  }
}
