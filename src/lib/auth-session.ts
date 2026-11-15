import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

/** Current visitor's session (null for anonymous students). */
export async function getViewerSession() {
  return auth();
}

export type StaffUser = { id: string; email: string; name: string; role: "ADMIN" | "STAFF" };
type LoadedStaff = StaffUser & { twoFactorEnabled: boolean; needsTwoFactorSetup: boolean };

/** Two-step login is REQUIRED for these roles (optional for everyone else). */
export const TWO_FACTOR_REQUIRED_ROLES: ReadonlyArray<StaffUser["role"]> = ["ADMIN"];

/**
 * Re-reads the signed-in user from the database so a deleted or demoted account loses
 * access immediately, even with a still-valid JWT.
 */
async function loadStaff(): Promise<LoadedStaff | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, totpEnabledAt: true },
  });
  if (!user) return null;
  const { totpEnabledAt, ...rest } = user;
  const twoFactorEnabled = Boolean(totpEnabledAt);
  return { ...rest, twoFactorEnabled, needsTwoFactorSetup: !twoFactorEnabled && TWO_FACTOR_REQUIRED_ROLES.includes(user.role) };
}

/**
 * Server-side guard for actions and route handlers. Returns null (not signed in, or an
 * account that must still set up two-step login) instead of redirecting.
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const user = await loadStaff();
  if (!user || user.needsTwoFactorSetup) return null;
  return strip(user);
}

/** For admin pages: redirect to login when not signed in, to 2FA setup when it is required. */
export async function requireStaff(): Promise<StaffUser> {
  const user = await loadStaff();
  if (!user) redirect("/admin/login");
  if (user.needsTwoFactorSetup) redirect("/admin/security");
  return strip(user);
}

/** For admin-only pages: staff accounts are sent back to the books list. */
export async function requireAdmin(): Promise<StaffUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}

/**
 * For the two-step-login page only: any signed-in staff account, including one that
 * still has to set up 2FA (that is the one page it may open).
 */
export async function requireStaffForSecurity(): Promise<LoadedStaff> {
  const user = await loadStaff();
  if (!user) redirect("/admin/login");
  return user;
}

/** Signed in at all (used by the login page to skip the form). */
export async function hasStaffSession() {
  return Boolean(await loadStaff());
}

export class ForbiddenError extends Error {}

/** For Server Actions: throw instead of redirecting. */
export async function assertStaff(role?: "ADMIN"): Promise<StaffUser> {
  const user = await getStaffUser();
  if (!user || (role && user.role !== role)) throw new ForbiddenError("Forbidden");
  return user;
}

/** For the 2FA Server Actions: like assertStaff, but also allowed before setup is done. */
export async function assertStaffForSecurity(): Promise<LoadedStaff> {
  const user = await loadStaff();
  if (!user) throw new ForbiddenError("Forbidden");
  return user;
}

function strip({ id, email, name, role }: LoadedStaff): StaffUser {
  return { id, email, name, role };
}
