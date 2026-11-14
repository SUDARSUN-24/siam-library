import { expect, type BrowserContext, type Page } from "@playwright/test";

export const STAFF = {
  email: process.env.SEED_STAFF_EMAIL ?? "staff@library.siam.edu",
  password: process.env.SEED_STAFF_PASSWORD ?? "SiamStaff2026!",
};
export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@library.siam.edu",
  password: process.env.SEED_ADMIN_PASSWORD ?? "SiamAdmin2026!",
};

/** Use English UI so assertions read naturally (Thai is tested separately). */
export async function useEnglish(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL }]);
}

export async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/admin/login");
  await page.getByLabel(/^(Email|อีเมล)$/).fill(who.email);
  await page.getByLabel(/^(Password|รหัสผ่าน)$/).fill(who.password);
  await page.getByRole("button", { name: /^(Sign in|เข้าสู่ระบบ)$/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Search from the home page using the big search bar. */
export async function search(page: Page, q: string) {
  await page.goto("/");
  await page.locator("#q").fill(q);
  await page.locator("#q").press("Enter");
  await expect(page).toHaveURL(/[?&]q=/);
}

export function cardCodes(page: Page) {
  return page.getByTestId("book-card").evaluateAll((els) => els.map((e) => e.getAttribute("href")!.split("/").pop()!));
}
