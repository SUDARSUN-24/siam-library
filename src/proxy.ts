import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request:
 *  1. Content-Security-Policy with a fresh nonce (Next.js adds it to its own scripts).
 *  2. Optimistic admin check: no session cookie → redirect to /admin/login.
 *     This is NOT the security boundary — every admin page, Server Action and route
 *     handler checks the session and role on the server (src/lib/auth-session.ts).
 *  3. Staff pages get X-Robots-Tag: noindex (on top of the robots meta tag) and no-store.
 * Other security headers (X-Frame-Options, nosniff, ...) are set in next.config.ts.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const staffPage = pathname === "/admin" || pathname.startsWith("/admin/");

  if (staffPage && pathname !== "/admin/login") {
    const hasSession =
      request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) return noindex(NextResponse.redirect(new URL("/admin/login", request.url)));
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
    "media-src 'self' blob:",
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

  const response = NextResponse.next({ request: { headers: requestHeaders } });
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
