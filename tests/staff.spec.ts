import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { ADMIN, login, STAFF, useEnglish } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => useEnglish(context, baseURL!));

/** Failed-login tests get their own client IP so their failures never block other tests' logins. */
const isolatedIp = () => ({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}` });

test("admin pages require login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/qr");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong password is rejected", async ({ page }) => {
  await page.context().setExtraHTTPHeaders(isolatedIp());
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(`wrong-pw-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("Incorrect email or password.");
});

test("login is rate-limited after 5 failed attempts", async ({ page }) => {
  const email = `nobody-${Date.now()}@example.com`; // own bucket, does not lock real accounts
  await page.context().setExtraHTTPHeaders(isolatedIp());
  await page.goto("/admin/login");
  for (let i = 0; i < 6; i++) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong");
    // wait for the server's answer before the next attempt
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/admin/login")),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);
    await expect(page.getByTestId("login-error")).toBeVisible();
  }
  await expect(page.getByTestId("login-error")).toContainText("Too many attempts");
});

test("staff can mark a book borrowed and returned", async ({ page }) => {
  await login(page, STAFF);
  const row = page.getByTestId("admin-row-A-002");
  const button = row.getByTestId("toggle-status");
  await expect(button).toHaveText("Mark borrowed");

  await button.click();
  await expect(button).toHaveText("Mark returned");
  await expect(row).toContainText("Due back");

  // the public page shows it straight away
  const pub = await page.context().newPage();
  await pub.goto("/book/A-002");
  await expect(pub.getByText(/Borrowed.*Due back/)).toBeVisible();

  await button.click();
  await expect(button).toHaveText("Mark borrowed");
  await pub.reload();
  await expect(pub.getByText("Available", { exact: true }).first()).toBeVisible();
});

test("staff cannot see the delete-book button; admin can", async ({ page }) => {
  await login(page, STAFF);
  await page.getByTestId("admin-row-A-001").getByRole("link", { name: /Edit/ }).click();
  await expect(page.getByRole("button", { name: "Delete book" })).toHaveCount(0);
});

test("add a book with photo pages, see it publicly, then delete it", async ({ page, isMobile }) => {
  test.skip(isMobile, "runs once (desktop) — it creates and deletes data");
  await login(page, ADMIN);
  await page.getByRole("link", { name: "Add book" }).first().click();
  await expect(page).toHaveURL(/\/admin\/books\/new$/);

  await page.getByLabel("Shelf").selectOption({ label: "C · Literature" });
  const code = await page.getByLabel("Book code").inputValue();
  expect(code).toMatch(/^C-\d{3}$/);
  await page.getByLabel("Title", { exact: true }).fill("Playwright Test Novel");
  await page.getByLabel("Author", { exact: true }).fill("E2E Tester");
  await page.getByLabel("Category", { exact: true }).fill("Novel");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByLabel("Row", { exact: true }).fill("2");
  await page.getByTestId("save-book").click();
  await expect(page.getByTestId("book-created")).toContainText(code);

  // two real photos, one huge phone-camera photo, one fake "image"
  const photo = (bg: string) =>
    sharp({ create: { width: 1200, height: 1700, channels: 3, background: bg } }).jpeg().toBuffer();
  // Random noise barely compresses: a 3000×4000 JPEG of it is far over Vercel's 4.5 MB
  // request limit, so it only uploads if the browser compresses it first.
  const noise = Buffer.alloc(3000 * 4000 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() * 256) | 0;
  const big = await sharp(noise, { raw: { width: 3000, height: 4000, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
  expect(big.length).toBeGreaterThan(4.5 * 1024 * 1024);
  await page.getByTestId("page-upload").setInputFiles([
    { name: "cover.jpg", mimeType: "image/jpeg", buffer: await photo("#7a3b5e") },
    { name: "contents.jpg", mimeType: "image/jpeg", buffer: await photo("#f3ecdf") },
    { name: "phone-photo.jpg", mimeType: "image/jpeg", buffer: big },
    { name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("definitely not a jpeg") },
  ]);
  await expect(page.getByTestId("managed-page")).toHaveCount(3, { timeout: 40_000 });
  await expect(page.getByText("fake.jpg: Only image files can be uploaded.")).toBeVisible();

  // public page: photo cover + 3 pages + end page
  const pub = await page.context().newPage();
  await pub.goto(`/book/${code}`);
  await expect(pub.getByTestId("book-title")).toHaveText("Playwright Test Novel");
  await expect(pub.getByTestId("viewer-position")).toHaveText("Page 1 of 4");
  const img = pub.getByTestId("viewer-slide").locator("img");
  await expect(img).toHaveAttribute("src", /^\/api\/uploads\/[0-9a-f-]{36}\.webp$/);
  const imgRes = await pub.request.get((await img.getAttribute("src"))!);
  expect(imgRes.status()).toBe(200);
  expect(imgRes.headers()["content-type"]).toBe("image/webp");
  await pub.close();

  // reorder: move first page down
  const firstSrc = await page.getByTestId("managed-page").first().locator("img").getAttribute("src");
  await page.getByRole("button", { name: "Move down" }).first().click();
  await expect(page.getByTestId("managed-page").nth(1).locator("img")).toHaveAttribute("src", firstSrc!);

  // delete the book (admin only, confirm dialog)
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete book" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId(`admin-row-${code}`)).toHaveCount(0);
  const gone = await page.request.get(`/book/${code}`);
  expect(gone.status()).toBe(404);
});

test("QR sticker sheet lists every book and shelf", async ({ page }) => {
  await login(page, STAFF);
  await page.goto("/admin/qr");
  await expect(page.getByTestId("qr-shelf")).toHaveCount(3);
  await expect(page.getByTestId("qr-book")).toHaveCount(18);
  await expect(page.getByTestId("qr-book").first().locator("svg")).toBeVisible();
});
