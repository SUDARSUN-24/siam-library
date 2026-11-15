import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Two-step login with time-based one-time codes (TOTP, RFC 6238) — works with
 * Google Authenticator, Microsoft Authenticator, 1Password, etc.
 * SHA-1, 6 digits, 30-second steps (what every authenticator app supports).
 *
 * Secrets are stored AES-256-GCM encrypted with a key derived from AUTH_SECRET, so a
 * database dump alone cannot produce codes. Rotating AUTH_SECRET therefore turns 2FA off
 * for everyone (reset it with `npm run user:reset-2fa`).
 *
 * No "server-only" import: scripts/seed.ts and the Playwright tests use these functions
 * too. Never import it from a client component.
 */

export const TOTP_ISSUER = "Siam Library";
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept the previous and next step too (phone clocks drift)

// --- base32 (RFC 4648, what otpauth:// URIs use) -------------------------------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("Invalid base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// --- codes ---------------------------------------------------------------------------
/** New random secret (160 bits, the RFC 4226 recommendation), base32. */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/** The 6-digit code for one 30-second step (RFC 4226 HOTP). */
export function totpCode(secretB32: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secretB32)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(bin).padStart(DIGITS, "0");
}

/**
 * Checks a code against the current step ± WINDOW. Returns the matching step, or null.
 * Steps at or before `lastStep` are refused, so an observed code cannot be replayed.
 */
export function verifyTotp(secretB32: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const step = currentStep(now);
  let match: number | null = null;
  for (let s = step - WINDOW; s <= step + WINDOW; s++) {
    if (lastStep !== null && s <= lastStep) continue;
    // compare every candidate (no early exit) in constant time
    if (timingSafeEqual(Buffer.from(totpCode(secretB32, s)), Buffer.from(code)) && match === null) match = s;
  }
  return match;
}

/** otpauth:// URI that authenticator apps read from the QR code. */
export function otpauthUri(email: string, secretB32: string) {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${email}`);
  const params = new URLSearchParams({ secret: secretB32, issuer: TOTP_ISSUER, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params}`;
}

/** "ABCD EFGH ..." — easier to type by hand. */
export function formatSecret(secretB32: string) {
  return secretB32.replace(/(.{4})/g, "$1 ").trim();
}

// --- encryption at rest -------------------------------------------------------------
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "siam-library", "totp-secret-v1", 32));
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptSecret(stored: string) {
  const [v, iv, tag, data] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

// --- backup codes -------------------------------------------------------------------
export const BACKUP_CODE_COUNT = 8;
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

/** 8 codes like "K7QX2-MP4RT" (50 bits each — too many to guess, so a fast hash is fine). */
export function generateBackupCodes() {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = Array.from({ length: 10 }, () => BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normalizeBackupCode(input: string) {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function looksLikeBackupCode(input: string) {
  return /^[A-Z0-9]{10}$/.test(normalizeBackupCode(input));
}

export function hashBackupCode(code: string) {
  return createHash("sha256").update(`siam-backup:${normalizeBackupCode(code)}`).digest("hex");
}
