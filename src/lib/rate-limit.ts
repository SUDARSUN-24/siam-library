import "server-only";

/**
 * Small in-memory fixed-window rate limiter.
 * Good for a single app container (our Docker setup). If the app is ever scaled to
 * several instances, move this to Redis or the database.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  // occasional cleanup so the map cannot grow forever
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), retryAfterMs: b.resetAt - now };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP (behind Docker/reverse proxy the first X-Forwarded-For entry). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_PER_ACCOUNT = 5; // per IP + email
export const LOGIN_MAX_PER_IP = 20; // all emails from one IP
