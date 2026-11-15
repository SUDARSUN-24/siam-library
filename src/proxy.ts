import { NextResponse, type NextRequest } from "next/server";
import { adminBase } from "@/lib/admin-path";

/**
 * Runs before every page request:
 *  1. Staff area: the internal route /admin/* is only reachable through the secret
 *     ADMIN_PATH (src/lib/admin-path.ts) — ADMIN_PATH/* is rewritten to /admin/*, and a
 *     direct request for /admin/* gets the normal 404 page.
 *  2. Optimistic staff check: no session cookie → redirect to ADMIN_PATH/login.
 *     This is NOT the security boundary — every admin page, Server Action and route
 *     handler checks the session and role on the server (src/lib/auth-session.ts).
 *  3. Content-Security-Policy with a fresh nonce (Next.js adds it to its own scripts).
 * Other security headers (X-Frame-Options, nosniff, ...) are set in next.config.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {}

  let rewriteTo: URL | null = null;
  let staffPage = false;
  const base = adminBase();
  if (/^\/admin(\/|$)/i.test(decoded)) {
    // Hide the internal route: same 404 as any unknown URL.
    rewriteTo = new URL("/__404", request.url); // matches no route → root not-found.tsx, status 404
  } else if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    const rest = pathname.slice(base.length).replace(/\/+$/, "");
    const hasSession =
      request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
    if (rest !== "/login" && !hasSession) return noindex(NextResponse.redirect(new URL(`${base}/login`, request.url)));
    rewriteTo = new URL(`/admin${rest}${request.nextUrl.search}`, request.url);
    staffPage = true;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const https = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // inline style attributes (cover colours) and toast styles need 'unsafe-inline' for styles only
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const init = { request: { headers: requestHeaders } };
  const response = rewriteTo ? NextResponse.rewrite(rewriteTo, init) : NextResponse.next(init);
  response.headers.set("Content-Security-Policy", csp);
  return staffPage ? noindex(response) : response;
}

/** Staff pages must never be indexed or followed (on top of the robots meta tag). */
function noindex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
