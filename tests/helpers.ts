import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { currentStep, totpCode } from "../src/lib/totp";

/** URL of a staff page: staff("/qr") → "/admin/qr". */
export const staff = (sub = "") => `/admin${sub}`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Regex for toHaveURL: whole staff path, optional query. */
export const staffUrl = (sub = "") => new RegExp(`${esc(staff(sub))}(\\?.*)?$`);

export type Account = { email: string; password: string; totpSecret?: string };
export const STAFF: Account = {
  email: process.env.SEED_STAFF_EMAIL ?? "staff@library.siam.edu",
  password: process.env.SEED_STAFF_PASSWORD ?? "SiamStaff2026!",
};
export const ADMIN: Account = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@library.siam.edu",
  password: process.env.SEED_ADMIN_PASSWORD ?? "SiamAdmin2026!",
  totpSecret: process.env.SEED_ADMIN_TOTP_SECRET,
};

/** Use English UI so assertions read naturally (Thai is tested separately). */
export async function setEnglish(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: "lang", value: "en", url: baseURL }]);
}

// --- authenticator codes -------------------------------------------------------------
// The server accepts each 30-second step only once (and the step after the current one,
// for clock drift). So consecutive logins use step+1, or wait for the next step.
const lastStep = new Map<string, number>();
export async function freshCode(secret: string) {
  for (;;) {
    const now = currentStep();
    const step = Math.max(now, (lastStep.get(secret) ?? -1) + 1);
    if (step <= now + 1) {
      lastStep.set(secret, step);
      return totpCode(secret, step);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** The code box of the LOGIN form (the 2FA setup page has its own "6-digit code" box). */
export const codeField = (page: Page) => page.locator("input#code");

/** Email + password on the staff login page (step 1 only). */
export async function submitPassword(page: Page, who: Account) {
  await page.goto(staff("/login"));
  await page.getByLabel(/^(Email|อีเมล)$/).fill(who.email);
  await page.getByLabel(/^(Password|รหัสผ่าน)$/).fill(who.password);
  await page.getByRole("button", { name: /^(Sign in|เข้าสู่ระบบ)$/ }).click();
}

/**
 * Full login. Returns "ok" on the books list, or "needs-setup" when the account (an ADMIN
 * without 2FA yet, e.g. on the live site before the owner set it up) was sent to the 2FA page.
 */
export async function signIn(page: Page, who: Account): Promise<"ok" | "needs-setup"> {
  await submitPassword(page, who);
  const books = page.getByTestId("staff-nav"); // visible at every screen width
  const setup = page.getByTestId("twofa-status");
  await expect(books.or(codeField(page)).or(setup)).toBeVisible();
  if (await codeField(page).isVisible()) {
    if (!who.totpSecret) throw new Error(`${who.email} has two-step login on — set its TOTP secret for the tests.`);
    await codeField(page).fill(await freshCode(who.totpSecret));
    await page.getByRole("button", { name: /^(Verify|ยืนยัน)$/ }).click();
  }
  await expect(books.or(setup)).toBeVisible();
  return (await books.isVisible()) ? "ok" : "needs-setup";
}

/** Login that must reach the books list; skips the test if 2FA setup is still pending. */
export async function login(page: Page, who: Account) {
  const result = await signIn(page, who);
  test.skip(result === "needs-setup", `${who.email} has not set up two-step login yet (needs a phone) — test skipped.`);
  await expect(page).toHaveURL(staffUrl());
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
