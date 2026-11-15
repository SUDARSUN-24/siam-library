import { expect, test } from "@playwright/test";

test("security headers and CSP nonce are sent", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("upload API refuses anonymous users", async ({ request }) => {
  const res = await request.post("/api/admin/books/anything/pages", {
    multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } },
  });
  expect(res.status()).toBe(401);
});

test("image route only serves <uuid>.webp names", async ({ request }) => {
  for (const name of ["..%2F.env", "..%2F..%2Fpackage.json", "x.webp", "00000000-0000-0000-0000-000000000000.png"]) {
    expect((await request.get(`/api/uploads/${name}`)).status()).toBe(404);
  }
});

test("bad search parameters are ignored, not errors", async ({ page }) => {
  const res = await page.goto("/?status=DROP%20TABLE&shelf=%3Cscript%3E&q=" + "a".repeat(500));
  expect(res?.status()).toBe(200);
  const res2 = await page.goto("/books?page=-1&sort=evil&lang=xx&available=maybe&category=%3Cscript%3E&shelf=1");
  expect(res2?.status()).toBe(200);
  await expect(page.getByTestId("result-count")).toHaveText(/[0-9]+/);
});
