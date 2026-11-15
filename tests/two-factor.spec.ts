import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN, codeField, freshCode, signIn, staff, STAFF, staffUrl, submitPassword, setEnglish } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

const verify = (page: Page) => page.getByRole("button", { name: "Verify" });

/**
 * Fresh browser (no session). Locally it also gets its own client IP so these wrong codes
 * do not fill the per-IP code limit for later runs (Vercel ignores the header: real IP there).
 */
async function newPage(browser: Browser, baseURL: string) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });
  await setEnglish(ctx, baseURL);
  return ctx.newPage();
}

test("admin cannot use the staff area without two-step login", async ({ page }) => {
  await submitPassword(page, ADMIN);
  const books = page.getByTestId("staff-nav");
  const setup = page.getByTestId("twofa-status");
  await expect(books.or(codeField(page)).or(setup)).toBeVisible();
  // Must never land on the books list with only a password.
  await expect(books).toHaveCount(0);

  if (await codeField(page).isVisible()) {
    // 2FA is on: a wrong code is refused, the right one lets the admin in.
    await codeField(page).fill("000000");
    await verify(page).click();
    await expect(page.getByTestId("login-error")).toContainText("not correct");
    test.skip(!ADMIN.totpSecret, "admin 2FA is on; set SEED_ADMIN_TOTP_SECRET to test the full login");
    await codeField(page).fill(await freshCode(ADMIN.totpSecret!));
    await verify(page).click();
    await expect(books).toBeVisible();
  } else {
    // 2FA not set up yet: the ONLY page the session can open is the setup page.
    await expect(page).toHaveURL(staffUrl("/security"));
    await expect(setup).toContainText("Required for admin accounts");
    await expect(page.getByTestId("totp-qr").locator("svg")).toBeVisible();
    for (const sub of ["", "/qr", "/books/new"]) {
      await page.goto(staff(sub));
      await expect(page).toHaveURL(staffUrl("/security"));
    }
    const upload = await page.request.post("/api/admin/books/anything/pages", {
      multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } },
    });
    expect(upload.status()).toBe(401);
  }
});

test("staff: turn on 2FA, sign in with a code and a backup code, rate limit, turn off", async ({ page, browser, baseURL, isMobile }) => {
  test.skip(isMobile, "runs once (desktop) — it changes the shared staff account");
  test.setTimeout(150_000);

  // A: signed in with the password only (2FA is optional for STAFF and off at the start).
  expect(await signIn(page, STAFF)).toBe("ok");
  await page.goto(staff("/security"));
  await expect(page.getByTestId("twofa-status")).toContainText("Off");
  const secret = (await page.getByTestId("totp-secret").innerText()).replace(/\s/g, "");
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  await expect(page.getByTestId("totp-qr").locator("svg")).toBeVisible();

  let enabled = false;
  try {
    // wrong first code → refused; right code → on, 8 backup codes shown once
    await page.locator("#setup-code").fill("123456");
    await page.getByTestId("twofa-confirm").click();
    await expect(page.getByTestId("twofa-error")).toBeVisible();
    await page.locator("#setup-code").fill(await freshCode(secret));
    await page.getByTestId("twofa-confirm").click();
    await expect(page.getByTestId("backup-code")).toHaveCount(8);
    enabled = true;
    const backup = await page.getByTestId("backup-code").allInnerTexts();
    expect(backup[0]).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    await page.getByTestId("twofa-continue").click();
    await expect(page).toHaveURL(staffUrl());

    // B: password alone is no longer enough; wrong code refused; correct code works.
    const b = await newPage(browser, baseURL!);
    await submitPassword(b, STAFF);
    await expect(codeField(b)).toBeVisible();
    await expect(b.getByTestId("staff-nav")).toHaveCount(0);
    await codeField(b).fill("000000");
    await verify(b).click();
    await expect(b.getByTestId("login-error")).toContainText("not correct");
    await codeField(b).fill(await freshCode(secret));
    await verify(b).click();
    await expect(b.getByTestId("staff-nav")).toBeVisible();
    await b.context().close();

    // C: a backup code works once.
    const c = await newPage(browser, baseURL!);
    await submitPassword(c, STAFF);
    await codeField(c).fill(backup[0].toLowerCase()); // case and dash do not matter
    await verify(c).click();
    await expect(c.getByTestId("staff-nav")).toBeVisible();
    await c.context().close();
    const c2 = await newPage(browser, baseURL!);
    await submitPassword(c2, STAFF);
    await codeField(c2).fill(backup[0]);
    await verify(c2).click();
    await expect(c2.getByTestId("login-error")).toContainText("already used");

    // D: wrong codes are rate-limited (5 per account / 15 min) — then even a right code is refused.
    for (let i = 0; i < 8; i++) {
      await expect(verify(c2)).toBeEnabled(); // previous answer (and React's form reset) done
      await codeField(c2).fill(String(100000 + i));
      await verify(c2).click();
      await expect(c2.getByTestId("login-error")).toBeVisible();
      if ((await c2.getByTestId("login-error").innerText()).includes("Too many attempts")) break;
    }
    await expect(c2.getByTestId("login-error")).toContainText("Too many attempts");
    await codeField(c2).fill(backup[1]);
    await verify(c2).click();
    await expect(c2.getByTestId("login-error")).toContainText("Too many attempts");
    await expect(c2.getByTestId("staff-nav")).toHaveCount(0);
    await c2.context().close();
  } finally {
    // A (still signed in): turn it off again so the account is as before.
    if (enabled) {
      await page.goto(staff("/security"));
      await expect(page.getByTestId("twofa-status")).toContainText("On.");
      await page.locator("#off-code").fill(await freshCode(secret));
      await page.getByTestId("twofa-disable").click();
      await expect(page.getByTestId("twofa-status")).toContainText("Off.");
    }
  }

  // Password-only login works again (turning 2FA off also cleared the code rate limit).
  const e = await newPage(browser, baseURL!);
  expect(await signIn(e, STAFF)).toBe("ok");
  await e.context().close();
});
