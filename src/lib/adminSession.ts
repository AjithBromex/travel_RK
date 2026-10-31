import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebaseAdmin";

export const SESSION_COOKIE = "rk_admin_session";

// Firestore collections the admin can browse/delete from
export const COLLECTIONS = [
  "trips",
  "vehicles",
  "payments",
  "expenses",
  "reminders",
  "cashbook",
];

export async function getAdmin() {
  const cookieStore = await cookies();
  const cookie =
    cookieStore.get(SESSION_COOKIE)?.value ||
    cookieStore.get("firebase_admin_session")?.value;

  if (!cookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return decoded.admin === true ? decoded : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

export async function logAudit(
  actor: string,
  action: string,
  target = "",
  meta: object = {}
) {
  try {
    await adminDb.collection("auditLogs").add({
      actor,
      action,
      target,
      meta,
      at: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn("[adminSession] Could not persist audit log:", err);
  }
}
