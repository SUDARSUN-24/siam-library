import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

/** Current visitor's session (null for anonymous students). */
export async function getViewerSession() {
  return auth();
}

export type StaffUser = { id: string; email: string; name: string; role: "ADMIN" | "STAFF" };

/**
 * Server-side guard for staff pages and actions. Re-reads the user from the database so a
 * deleted or demoted account loses access immediately, even with a still-valid JWT.
 * Returns null instead of redirecting (for actions and route handlers).
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  return user ?? null;
}

/** For admin pages: redirect to login when not signed in. */
export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** For admin-only pages: staff accounts are sent back to the books list. */
export async function requireAdmin(): Promise<StaffUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}

export class ForbiddenError extends Error {}

/** For Server Actions: throw instead of redirecting. */
export async function assertStaff(role?: "ADMIN"): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user || (role && user.role !== role)) throw new ForbiddenError("Forbidden");
  return user;
}
