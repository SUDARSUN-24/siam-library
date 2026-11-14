import "server-only";

/**
 * Small in-memory fixed-window counter used to rate-limit FAILED logins.
 * Good for a single app container (our Docker setup). If the app is ever scaled to
 * several instances, move this to Redis or the database.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function live(key: string, now = Date.now()) {
  const b = buckets.get(key);
  if (b && b.resetAt <= now) {
    buckets.delete(key);
    return undefined;
  }
  return b;
}

/** True when `key` already has `limit` or more failures in the current window. */
export function isLimited(key: string, limit: number) {
  return (live(key)?.count ?? 0) >= limit;
}

/** Record one failure for `key`. */
export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const k of [...buckets.keys()]) live(k, now); // cleanup
  const b = live(key, now);
  if (b) b.count += 1;
  else buckets.set(key, { count: 1, resetAt: now + windowMs });
}

export function resetLimit(key: string) {
  buckets.delete(key);
}

/**
 * Best-effort client IP from X-Forwarded-For. This header can be forged unless a reverse
 * proxy (nginx) in front of the app overwrites it — so IP limits are a convenience only,
 * and the per-EMAIL limit below is the real brute-force protection.
 */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_PER_IP_ACCOUNT = 5; // failures for one email from one IP → friendly early stop
export const LOGIN_MAX_PER_ACCOUNT = 10; // failures for one email from ANY IP → cannot be bypassed
export const LOGIN_MAX_PER_IP = 50; // failures from one IP, any email (shared campus NAT → keep high)
