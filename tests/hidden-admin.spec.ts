import { expect, test } from "@playwright/test";
import { ADMIN_PATH, staff } from "./helpers";

/** The staff area lives only at the secret ADMIN_PATH; nothing public may point to it. */

test("/admin and /admin/login are a normal 404", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/login", "/admin/qr", "/admin/security", "/Admin", "/%61dmin/login"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(404);
  }
  const res = await page.goto("/admin/login");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("button", { name: /Sign in|เข้าสู่ระบบ/ })).toHaveCount(0);
});

test("public pages, robots.txt and sitemap never reveal the staff path", async ({ request }) => {
  for (const path of ["/", "/book/A-001", "/shelf/A", "/?q=test", "/no-such-page", "/robots.txt", "/sitemap.xml"]) {
    const res = await request.get(path);
    const body = await res.text();
    expect(body, path).not.toContain(ADMIN_PATH!);
    expect(body, path).not.toMatch(/href="\/admin/);
    expect(JSON.stringify(res.headers()), path).not.toContain(ADMIN_PATH!);
  }
});

test("Auth.js sign-in / error pages do not redirect to the staff path", async ({ request }) => {
  for (const path of ["/api/auth/signin", "/api/auth/error", "/api/auth/signin/credentials"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.headers()["location"] ?? "", path).not.toContain(ADMIN_PATH!);
    expect(await res.text(), path).not.toContain(ADMIN_PATH!);
  }
});

test("staff pages are noindex", async ({ page }) => {
  const res = await page.goto(staff("/login"));
  expect(res?.status()).toBe(200);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // the redirect for signed-out visitors is noindex too
  const redirect = await page.request.get(staff("/qr"), { maxRedirects: 0 });
  expect(redirect.status()).toBeGreaterThanOrEqual(300);
  expect(redirect.headers()["x-robots-tag"]).toContain("noindex");
});
