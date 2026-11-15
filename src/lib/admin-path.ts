/**
 * The staff area lives at a SECRET path from the ADMIN_PATH env variable
 * (e.g. "/staff-7f3k9q..."), not at /admin. src/proxy.ts rewrites
 * ADMIN_PATH/* → the internal route /admin/*, and answers /admin/* itself with a 404.
 *
 * This is obscurity on top of the real security (requireStaff / assertStaff / getStaffUser
 * re-check the session and role on every request). It keeps bots and curious students away
 * from the login form. If ADMIN_PATH is missing or invalid the staff area is switched off
 * (every staff URL is a 404) — it never falls back to a guessable path.
 *
 * Imported by the proxy, so no "server-only" / Node-only imports here. Never import it from
 * a client component: the value must not end up in a browser bundle.
 */

const RESERVED = ["/admin", "/api", "/book", "/shelf", "/_next"];

/** "/staff-xxxx" or null when ADMIN_PATH is unset / malformed. */
export function adminBase(): string | null {
  const v = process.env.ADMIN_PATH?.trim().replace(/\/+$/, "");
  if (!v || !/^\/[a-z0-9-]{16,100}$/.test(v)) return null;
  if (RESERVED.some((r) => v.startsWith(r))) return null;
  return v;
}

/**
 * Public URL of a staff page: staffHref("/books/new") → "/staff-xxxx/books/new".
 * Only called while rendering a staff page, which is only reachable through the secret path.
 */
export function staffHref(sub = ""): string {
  const base = adminBase();
  if (!base) throw new Error("ADMIN_PATH is not set — the staff area is disabled.");
  return `${base}${sub}`;
}
