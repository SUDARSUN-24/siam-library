"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { assertStaffForSecurity, TWO_FACTOR_REQUIRED_ROLES } from "@/lib/auth-session";
import { clientIp } from "@/lib/rate-limit";
import { disableTwoFactor, discardPendingSecret, enableTwoFactor, regenerateBackupCodes, verifySecondFactor } from "@/lib/two-factor";
import { totpCodeSchema } from "@/lib/validation";

export type SecurityState = { error?: "invalid" | "rate_limited" | "not_allowed"; codes?: string[]; done?: "enabled" | "regenerated" | "disabled" };

async function ip() {
  return clientIp(await headers());
}

/** Step 2 of setup: the first code from the app proves the QR code was scanned. */
export async function confirmSetupAction(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const user = await assertStaffForSecurity();
  const code = totpCodeSchema.safeParse(formData.get("code"));
  if (!code.success) return { error: "invalid" };
  const result = await enableTwoFactor(user.id, code.data, await ip());
  if (typeof result === "string") return { error: result === "rate_limited" ? "rate_limited" : "invalid" };
  // No revalidatePath here: re-rendering would swap the form for the "manage" view and
  // the backup codes (shown only once) would disappear before they could be written down.
  return { codes: result.codes, done: "enabled" };
}

/** Show a fresh QR code (when the first scan went wrong). */
export async function newQrAction() {
  const user = await assertStaffForSecurity();
  if (!user.twoFactorEnabled) await discardPendingSecret(user.id);
  revalidatePath("/admin/security");
}

/** New backup codes — needs a current code from the app (or a backup code). */
export async function regenerateCodesAction(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const user = await assertStaffForSecurity();
  if (!user.twoFactorEnabled) return { error: "not_allowed" };
  const result = await verifySecondFactor(user.id, String(formData.get("code") ?? "").slice(0, 20), await ip(), "manage");
  if (result !== "ok") return { error: result };
  return { codes: await regenerateBackupCodes(user.id), done: "regenerated" };
}

/** Turn 2FA off — only for roles where it is optional, and only with a current code. */
export async function disableAction(_prev: SecurityState, formData: FormData): Promise<SecurityState> {
  const user = await assertStaffForSecurity();
  if (!user.twoFactorEnabled || TWO_FACTOR_REQUIRED_ROLES.includes(user.role)) return { error: "not_allowed" };
  const result = await verifySecondFactor(user.id, String(formData.get("code") ?? "").slice(0, 20), await ip(), "manage");
  if (result !== "ok") return { error: result };
  await disableTwoFactor(user.id);
  revalidatePath("/admin/security"); // page switches to "Off" + a fresh setup QR code
  return { done: "disabled" };
}
