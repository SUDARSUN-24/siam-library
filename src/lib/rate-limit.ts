import "server-only";
import { db } from "./db";

/**
 * Fixed-window counter used to rate-limit FAILED logins, stored in the database
 * (table LoginThrottle). On Vercel every request may run in a different serverless
 * instance, so an in-memory Map would not hold the limit — the database does.
 */

/** True when `key` already has `limit` or more failures in the current window. */
export async function isLimited(key: string, limit: number) {
  const row = await db.loginThrottle.findUnique({ where: { key } });
  return Boolean(row && row.resetAt > new Date() && row.count >= limit);
}

/** Record one failure for `key`. */
export async function recordFailure(key: string, windowMs: number) {
  const now = new Date();
  // Inside a live window: atomic increment.
  const bumped = await db.loginThrottle.updateMany({
    where: { key, resetAt: { gt: now } },
    data: { count: { increment: 1 } },
  });
  if (bumped.count > 0) return;
  // No row, or its window expired: start a new window.
  const fresh = { count: 1, resetAt: new Date(now.getTime() + windowMs) };
  await db.loginThrottle.upsert({ where: { key }, update: fresh, create: { key, ...fresh } });
  // Occasional cleanup of expired rows so the table stays small.
  if (Math.random() < 0.05) await db.loginThrottle.deleteMany({ where: { resetAt: { lte: now } } });
}

export async function resetLimit(key: string) {
  await db.loginThrottle.deleteMany({ where: { key } });
}

/**
 * Best-effort client IP. On Vercel, X-Forwarded-For is set by Vercel's edge (a client
 * cannot forge the first entry there); behind our own nginx/Docker it depends on the proxy.
 * IP limits are a convenience — the per-EMAIL limit below is the real brute-force protection.
 */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_PER_IP_ACCOUNT = 5; // failures for one email from one IP → friendly early stop
export const LOGIN_MAX_PER_ACCOUNT = 10; // failures for one email from ANY IP → cannot be bypassed
export const LOGIN_MAX_PER_IP = 50; // failures from one IP, any email (shared campus NAT → keep high)
