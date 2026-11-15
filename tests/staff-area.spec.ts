import { expect, test } from "@playwright/test";
import { setEnglish, staff, staffUrl } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

test("footer has a Staff login link to /admin/login", async ({ page, baseURL }) => {
  await page.goto("/");
  const link = page.getByTestId("staff-login-link");
  await expect(link).toHaveText("Staff login");
  await expect(link).toHaveAttribute("href", "/admin/login");
  await link.click();
  await expect(page).toHaveURL(staffUrl("/login"));
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  await page.context().addCookies([{ name: "lang", value: "th", url: baseURL! }]);
  await page.goto("/");
  await expect(page.getByTestId("staff-login-link")).toHaveText("เข้าสู่ระบบเจ้าหน้าที่");
});

test("staff pages are noindex", async ({ page }) => {
  const res = await page.goto(staff("/login"));
  expect(res?.status()).toBe(200);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // the redirect for signed-out visitors is noindex too
  const redirect = await page.request.get(staff("/qr"), { maxRedirects: 0 });
  expect(redirect.status()).toBeGreaterThanOrEqual(300);
  expect(redirect.headers()["location"]).toContain("/admin/login");
  expect(redirect.headers()["x-robots-tag"]).toContain("noindex");
});
