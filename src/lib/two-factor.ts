import "server-only";
import { db } from "./db";
import { isLimited, recordFailure, resetLimit } from "./rate-limit";
import {
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  looksLikeBackupCode,
  verifyTotp,
} from "./totp";

/** Wrong 2FA codes, counted like failed passwords (src/lib/rate-limit.ts), 15-minute window. */
export const CODE_WINDOW_MS = 15 * 60 * 1000;
export const CODE_MAX_PER_ACCOUNT = 5; // 1 in 200 000 per try → a stolen password is not enough
export const CODE_MAX_PER_IP = 20;

/**
 * "login" = the code step of signing in; "manage" = the 2FA settings page (already signed in).
 * Separate buckets, so wrong codes at the login form cannot lock the owner out of their settings.
 */
export type CodeScope = "login" | "manage";
const acctKey = (userId: string, scope: CodeScope = "login") => (scope === "login" ? `2fa:acct:${userId}` : `2fa:manage:${userId}`);
const ipKey = (ip: string) => `2fa:ip:${ip}`;

export type CodeResult = "ok" | "invalid" | "rate_limited";

/**
 * Checks a 6-digit authenticator code OR an unused backup code for a user with 2FA on.
 * A TOTP code is accepted once (totpLastStep); a backup code is used up.
 */
export async function verifySecondFactor(userId: string, input: string, ip: string, scope: CodeScope = "login"): Promise<CodeResult> {
  const key = acctKey(userId, scope);
  const limited = await Promise.all([isLimited(key, CODE_MAX_PER_ACCOUNT), isLimited(ipKey(ip), CODE_MAX_PER_IP)]);
  if (limited.some(Boolean)) return "rate_limited";

  const ok = await checkCode(userId, input.trim());
  if (!ok) {
    await Promise.all([recordFailure(key, CODE_WINDOW_MS), recordFailure(ipKey(ip), CODE_WINDOW_MS)]);
    return "invalid";
  }
  await resetLimit(key);
  return "ok";
}

async function checkCode(userId: string, code: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpLastStep: true, totpEnabledAt: true } });
  if (!user?.totpSecret || !user.totpEnabledAt) return false;

  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decryptSecret(user.totpSecret), code, user.totpLastStep);
    if (step === null) return false;
    // Atomic: two parallel logins with the same code → only one wins.
    const won = await db.user.updateMany({
      where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return won.count === 1;
  }

  if (looksLikeBackupCode(code)) {
    const used = await db.backupCode.updateMany({
      where: { userId, codeHash: hashBackupCode(code), usedAt: null },
      data: { usedAt: new Date() },
    });
    return used.count === 1;
  }
  return false;
}

/** Secret for the setup page: reuses the pending one so a page reload keeps the same QR code. */
export async function getOrCreatePendingSecret(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpPendingSecret: true } });
  if (user.totpPendingSecret) return decryptSecret(user.totpPendingSecret);
  const secret = generateTotpSecret();
  await db.user.update({ where: { id: userId }, data: { totpPendingSecret: encryptSecret(secret) } });
  return secret;
}

/** New QR code (e.g. the first scan failed). */
export async function discardPendingSecret(userId: string) {
  await db.user.update({ where: { id: userId }, data: { totpPendingSecret: null } });
}

/**
 * Turns 2FA on once the first code from the app matches the pending secret.
 * Returns the backup codes (shown once), or null when the code is wrong / rate-limited.
 */
export async function enableTwoFactor(userId: string, code: string, ip: string): Promise<{ codes: string[] } | CodeResult> {
  const key = acctKey(userId, "manage");
  const limited = await Promise.all([isLimited(key, CODE_MAX_PER_ACCOUNT), isLimited(ipKey(ip), CODE_MAX_PER_IP)]);
  if (limited.some(Boolean)) return "rate_limited";

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpPendingSecret: true, totpEnabledAt: true } });
  if (user.totpEnabledAt || !user.totpPendingSecret) return "invalid";
  const secret = decryptSecret(user.totpPendingSecret);
  const step = verifyTotp(secret, code.trim(), null);
  if (step === null) {
    await Promise.all([recordFailure(key, CODE_WINDOW_MS), recordFailure(ipKey(ip), CODE_WINDOW_MS)]);
    return "invalid";
  }

  const codes = generateBackupCodes();
  await db.$transaction([
    db.backupCode.deleteMany({ where: { userId } }),
    db.backupCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashBackupCode(c) })) }),
    db.user.update({
      where: { id: userId },
      data: { totpSecret: encryptSecret(secret), totpPendingSecret: null, totpEnabledAt: new Date(), totpLastStep: step },
    }),
  ]);
  await Promise.all([resetLimit(key), resetLimit(acctKey(userId))]);
  return { codes };
}

/** New set of backup codes (old ones stop working). Caller must have checked a current code. */
export async function regenerateBackupCodes(userId: string) {
  const codes = generateBackupCodes();
  await db.$transaction([
    db.backupCode.deleteMany({ where: { userId } }),
    db.backupCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashBackupCode(c) })) }),
  ]);
  return codes;
}

/** Turn 2FA off (also used by `npm run user:reset-2fa` when a phone is lost). */
export async function disableTwoFactor(userId: string) {
  await db.$transaction([
    db.backupCode.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null } }),
  ]);
  await Promise.all([resetLimit(acctKey(userId)), resetLimit(acctKey(userId, "manage"))]);
}

export async function unusedBackupCodeCount(userId: string) {
  return db.backupCode.count({ where: { userId, usedAt: null } });
}
