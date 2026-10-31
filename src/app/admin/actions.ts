"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  COLLECTIONS,
  SESSION_COOKIE,
  logAudit,
  requireAdmin,
} from "@/lib/adminSession";

async function target(uid: string) {
  const u = await adminAuth.getUser(uid);
  if (u.customClaims?.admin) {
    throw new Error("Admin accounts cannot be changed here.");
  }
  return u;
}

export async function setUserDisabled(fd: FormData) {
  const a = await requireAdmin();
  const uid = String(fd.get("uid"));
  const disabled = fd.get("disabled") === "true";
  const u = await target(uid);
  await adminAuth.updateUser(uid, { disabled });
  if (disabled) await adminAuth.revokeRefreshTokens(uid);
  await logAudit(
    a.email ?? "",
    disabled ? "disable_user" : "enable_user",
    u.email ?? uid
  );
  revalidatePath("/admin/users");
}

export async function forceSignOut(fd: FormData) {
  const a = await requireAdmin();
  const u = await target(String(fd.get("uid")));
  await adminAuth.revokeRefreshTokens(u.uid);
  await logAudit(a.email ?? "", "force_signout", u.email ?? u.uid);
  revalidatePath("/admin/users");
}

export async function deleteUser(fd: FormData) {
  const a = await requireAdmin();
  const u = await target(String(fd.get("uid")));
  if (
    String(fd.get("confirm")).trim().toLowerCase() !==
    (u.email ?? "").toLowerCase()
  ) {
    return; // user must type exact email to confirm deletion
  }
  await adminAuth.deleteUser(u.uid);
  await logAudit(a.email ?? "", "delete_user", u.email ?? u.uid);
  revalidatePath("/admin/users");
}

export async function deleteDocument(fd: FormData) {
  const a = await requireAdmin();
  const col = String(fd.get("col"));
  const id = String(fd.get("id"));
  if (!COLLECTIONS.includes(col)) {
    throw new Error("Collection not allowed.");
  }
  const ref = adminDb.collection(col).doc(id);
  const before = (await ref.get()).data() ?? {};
  await ref.delete();
  await logAudit(
    a.email ?? "",
    "delete_document",
    `${col}/${id}`,
    { before: JSON.parse(JSON.stringify(before)) }
  );
  revalidatePath("/admin/data");
}

export async function logoutAction() {
  const a = await requireAdmin();
  await adminAuth.revokeRefreshTokens(a.uid);
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("firebase_admin_session");
  redirect("/admin/login");
}
