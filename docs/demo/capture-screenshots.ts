/**
 * Screenshots for DEMO_GUIDE.md (Playwright, Chromium).
 *
 *   npx tsx docs/demo/capture-screenshots.ts public      # LIVE site, student pages
 *   npx tsx docs/demo/capture-screenshots.ts pagination  # LOCAL, needs `npm run seed:bulk` first
 *   npx tsx docs/demo/capture-screenshots.ts staff       # LOCAL, demo accounts from the local seed
 *
 * Local runs need `npm run db:start` + `npm run dev`. Never captures the 2FA setup page,
 * secrets or passwords (the login form is photographed empty).
 */
import "dotenv/config";
import path from "node:path";
import { chromium, devices, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { currentStep, totpCode } from "../../src/lib/totp";

const LIVE = "https://siam-library.vercel.app";
const LOCAL = "http://localhost:3000";
const OUT = path.resolve("docs/demo/screenshots");

const DESKTOP: BrowserContextOptions = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
// iPhone 14 size (390×844) in Chromium; 2× pixels keep the files a sensible size
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 14"];
const PHONE: BrowserContextOptions = { ...iphone, deviceScaleFactor: 2 };

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }),
      ),
    );
  });
  // hide the Next.js dev-mode badge on local screenshots
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.waitForTimeout(300);
}

async function shot(page: Page, name: string, opts: { scrollTo?: string; offset?: number; fullPage?: boolean } = {}) {
  await settle(page); // first: let the page finish its own (smooth) scrolling
  if (opts.scrollTo) {
    await page.locator(opts.scrollTo).first().evaluate((el, off) => {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "instant" });
    }, opts.offset ?? 90);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUT, name), fullPage: opts.fullPage });
  console.log("saved", name);
}

async function context(browser: Browser, base: string, opts: BrowserContextOptions, lang: "en" | "th" = "en") {
  const ctx = await browser.newContext({ ...opts, baseURL: base });
  await ctx.addCookies([{ name: "lang", value: lang, url: base }]);
  return ctx;
}

// ── student pages (LIVE) ────────────────────────────────────────────────────────────────
async function publicShots(browser: Browser) {
  const d = await (await context(browser, LIVE, DESKTOP)).newPage();
  const m = await (await context(browser, LIVE, PHONE)).newPage();
  const mTh = await (await context(browser, LIVE, PHONE, "th")).newPage();

  // 1 home
  await d.goto("/");
  await shot(d, "01-home-desktop.png");
  await m.goto("/");
  await shot(m, "02-home-mobile.png");

  // 2 language
  await shot(m, "03-language-english-mobile.png");
  await mTh.goto("/");
  await shot(mTh, "04-language-thai-mobile.png");

  // 3 suggestions
  await d.goto("/");
  await d.locator("#q").pressSequentially("data", { delay: 60 });
  await d.getByTestId("suggestion").first().waitFor();
  await d.locator("#q").press("ArrowDown");
  await shot(d, "05-suggestions-desktop.png");
  await m.goto("/");
  await m.locator("#q").pressSequentially("algo", { delay: 60 });
  await m.getByTestId("suggestion").first().waitFor();
  await shot(m, "06-suggestions-mobile.png", { scrollTo: "#search", offset: 70 });

  // 4 typo search
  await d.goto("/");
  await d.locator("#q").fill("algoritms");
  await d.locator("#q").press("Enter");
  await d.waitForURL(/\/books\?q=algoritms/);
  await shot(d, "07-typo-search-desktop.png");

  // 5 shelves
  await d.goto("/");
  await shot(d, "08-browse-shelves-desktop.png", { scrollTo: "#shelves" });
  await d.goto("/shelf/A");
  await shot(d, "09-shelf-page-desktop.png");
  await m.goto("/shelf/A");
  await shot(m, "10-shelf-page-mobile.png");

  // 6 categories
  await d.goto("/");
  await shot(d, "11-browse-categories-desktop.png", { scrollTo: "#categories" });
  await d.goto("/category/novel");
  await shot(d, "12-category-page-desktop.png");

  // 7 home rows + See all
  await d.goto("/");
  await shot(d, "13-home-rows-desktop.png", { scrollTo: "[data-testid=row-new]", offset: 70 });
  await m.goto("/");
  await shot(m, "14-home-rows-mobile.png", { scrollTo: "[data-testid=row-new]", offset: 70 });
  await d.getByTestId("row-thai").getByTestId("see-all").click();
  await d.waitForURL(/lang=th/);
  await shot(d, "15-see-all-thai-books-desktop.png");

  // 8 catalogue: sidebar filters + sort, phone bottom sheet
  await d.goto("/books?available=1&sort=title");
  await shot(d, "16-catalogue-filters-desktop.png");
  await m.goto("/books?shelf=A");
  await m.getByTestId("filters-button").click();
  await m.getByTestId("filter-sheet").waitFor();
  await shot(m, "17-catalogue-bottom-sheet-mobile.png");

  // 9 book page
  await d.goto("/book/A-001");
  await shot(d, "19-book-page-desktop.png");
  await shot(d, "20-book-details-qr-desktop.png", { scrollTo: "[data-testid=book-qr]", offset: 420 });
  // the viewer currently scrolls its thumbnail strip into view on load (scrolls the page on
  // phones) — photograph the top of the page, which is what the screenshot is about
  await m.goto("/book/A-001");
  await shot(m, "21-book-page-mobile.png", { scrollTo: "body", offset: 0 });

  // 10 preview viewer (phone)
  const goToPage = async (n: number) => {
    await m.getByRole("button", { name: new RegExp(`^Page ${n} of \\d+$`) }).click();
    await m.getByTestId("viewer-position").filter({ hasText: `Page ${n} of` }).waitFor();
  };
  await goToPage(3);
  await shot(m, "22-viewer-contents-mobile.png", { scrollTo: "[data-testid=viewer-slide]", offset: 60 });
  await goToPage(6);
  await shot(m, "23-viewer-middle-page-mobile.png", { scrollTo: "[data-testid=viewer-slide]", offset: 60 });
  const last = Number((await m.getByTestId("viewer-position").innerText()).match(/of (\d+)/)![1]);
  await goToPage(last);
  await m.getByTestId("viewer-end").waitFor();
  await shot(m, "24-viewer-end-page-mobile.png", { scrollTo: "[data-testid=viewer-slide]", offset: 60 });

  // 11 borrowed book
  await d.goto("/book/B-002");
  await shot(d, "25-borrowed-book-desktop.png");
  await m.goto("/book/B-002");
  await shot(m, "26-borrowed-book-mobile.png", { scrollTo: "body", offset: 0 });
}

// ── page numbers (LOCAL, with bulk test books — the live site has only 18 books) ─────────
async function paginationShot(browser: Browser) {
  const d = await (await context(browser, LOCAL, DESKTOP)).newPage();
  await d.goto("/books?page=3");
  await shot(d, "18-catalogue-page-numbers-desktop.png", { scrollTo: "[data-testid=pagination]", offset: 560 });
}

// ── staff pages (LOCAL demo accounts) ───────────────────────────────────────────────────
const STAFF = { email: process.env.SEED_STAFF_EMAIL ?? "staff@library.siam.edu", password: process.env.SEED_STAFF_PASSWORD ?? "SiamStaff2026!" };
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@library.siam.edu", password: process.env.SEED_ADMIN_PASSWORD ?? "SiamAdmin2026!" };

async function login(page: Page, who: { email: string; password: string }, totpSecret?: string) {
  await page.goto("/admin/login");
  await page.getByLabel(/^(Email|อีเมล)$/).fill(who.email);
  await page.getByLabel(/^(Password|รหัสผ่าน)$/).fill(who.password);
  await page.getByRole("button", { name: /^(Sign in|เข้าสู่ระบบ)$/ }).click();
  const nav = page.getByTestId("staff-nav");
  await nav.or(page.locator("input#code")).waitFor();
  if (await page.locator("input#code").isVisible()) {
    if (!totpSecret) throw new Error("this account needs a 2FA code");
    await page.locator("input#code").fill(totpCode(totpSecret, currentStep()));
    await page.getByRole("button", { name: /^(Verify|ยืนยัน)$/ }).click();
  }
  await nav.waitFor();
}

/** Realistic photos of book pages, rendered from HTML. */
async function pagePhotos(browser: Browser) {
  const p = await browser.newPage({ viewport: { width: 600, height: 850 }, deviceScaleFactor: 2 });
  const sheet = (body: string, bg = "#fbf7ef") =>
    `<html><body style="margin:0;height:850px;background:${bg};font-family:Georgia,serif;color:#1d2433;display:flex;flex-direction:column;padding:70px 60px;box-sizing:border-box">${body}</body></html>`;
  const pages = [
    sheet(`<div style="font:600 14px Arial;letter-spacing:.2em;opacity:.7">C-0XX</div>
      <h1 style="font-size:54px;line-height:1.1;margin:40px 0 0">The River<br>Library</h1>
      <p style="margin-top:auto;font-size:22px">Narin Phromsri</p>`, "#7a3b5e;color:#fdf8ee"),
    sheet(`<h2 style="text-align:center;font-size:26px">Contents</h2>
      ${["Preface", "1. Morning on the Chao Phraya", "2. The Lantern Shop", "3. Letters by Boat", "4. Monsoon Evenings"]
        .map((t, i) => `<p style="display:flex;font-size:19px;border-bottom:1px dotted #999;padding:10px 0"><span>${t}</span><span style="margin-left:auto">${i ? i * 18 - 7 : "v"}</span></p>`).join("")}`),
    sheet(`<h2 style="font-size:24px">1. Morning on the Chao Phraya</h2>
      <p style="font-size:18px;line-height:1.7;text-align:justify">The ferry horns began before the sun. Mali counted them from her window above the
      library: three short, one long, the signal that the first boat had left Tha Tien. By the time the fourth horn
      sounded she was already downstairs, unlocking the reading room and opening the shutters to the river…</p>`),
  ];
  const buffers: { name: string; mimeType: string; buffer: Buffer }[] = [];
  for (const [i, html] of pages.entries()) {
    await p.setContent(html);
    buffers.push({ name: `page-${i + 1}.jpg`, mimeType: "image/jpeg", buffer: await p.screenshot({ type: "jpeg", quality: 90 }) });
  }
  await p.close();
  return buffers;
}

async function staffShots(browser: Browser) {
  const ctx = await context(browser, LOCAL, DESKTOP);
  const d = await ctx.newPage();

  // 12 login (empty form)
  await d.goto("/admin/login");
  await shot(d, "27-staff-login-desktop.png");
  const mctx = await context(browser, LOCAL, PHONE);
  const m = await mctx.newPage();
  await m.goto("/admin/login");
  await shot(m, "28-staff-login-mobile.png");

  // 13 dashboard
  await login(d, STAFF);
  await shot(d, "29-dashboard-desktop.png");

  // 14 mark borrowed / returned (A-002 is put back afterwards)
  const row = d.getByTestId("admin-row-A-002");
  await row.getByTestId("toggle-status").click();
  await row.getByText("Mark returned").waitFor();
  await shot(d, "30-books-list-borrowed-desktop.png", { scrollTo: "[data-testid=admin-row-A-001]", offset: 160 });
  await login(m, STAFF);
  await shot(m, "31-books-list-mobile.png", { scrollTo: "[data-testid=admin-row-A-001]", offset: 120 });
  await row.getByTestId("toggle-status").click();
  await row.getByText("Mark borrowed").waitFor();

  // 15 add book + photos (deleted again at the end by the admin)
  await d.goto("/admin/books/new");
  await d.getByLabel("Shelf").selectOption({ label: "C · Literature" });
  const code = await d.getByLabel("Book code").inputValue();
  await d.getByLabel("Title", { exact: true }).fill("The River Library");
  await d.getByLabel("Author", { exact: true }).fill("Narin Phromsri");
  await d.getByLabel("Category", { exact: true }).fill("Novel");
  await d.getByLabel("Language", { exact: true }).selectOption("en");
  await d.getByLabel("Row", { exact: true }).fill("2");
  await d.locator("#year").fill("2025");
  await shot(d, "32-add-book-form-desktop.png");
  await d.getByTestId("save-book").click();
  await d.getByTestId("book-created").waitFor();
  await d.getByTestId("page-upload").setInputFiles(await pagePhotos(browser));
  await d.getByTestId("managed-page").nth(2).waitFor({ timeout: 40_000 });
  await shot(d, "33-add-book-photos-desktop.png", { scrollTo: "[data-testid=page-list]", offset: 200 });
  await m.goto(`/book/${code}`);
  await shot(m, "34-uploaded-photos-public-mobile.png", { scrollTo: "[data-testid=viewer-slide]", offset: 60 });

  // 16 form errors in Thai
  const th = await (await context(browser, LOCAL, DESKTOP, "th")).newPage();
  await login(th, STAFF);
  await th.goto("/admin/books/new");
  await th.locator("#code").fill("bad code");
  await th.locator("#title").fill("ทดสอบ");
  await th.locator("#author").fill("");
  await th.locator("#category").fill("Novel");
  await th.locator("#year").fill("2569");
  await th.locator("#isbn").fill("123");
  await th.getByTestId("save-book").click();
  await th.getByText("กรุณากรอกข้อมูลช่องนี้").first().waitFor();
  await shot(th, "35-form-errors-thai-desktop.png", { scrollTo: "#code", offset: 160 });

  // 17 QR sheet
  await d.goto("/admin/qr");
  await shot(d, "36-qr-sticker-sheet-desktop.png");

  // clean up: the admin deletes the demo book
  const a = await (await context(browser, LOCAL, DESKTOP)).newPage();
  await login(a, ADMIN, process.env.SEED_ADMIN_TOTP_SECRET);
  await a.getByTestId(`admin-row-${code}`).getByRole("link", { name: /Edit/ }).click();
  a.once("dialog", (dlg) => dlg.accept());
  await a.getByRole("button", { name: "Delete book" }).click();
  await a.waitForURL(/\/admin$/);
  console.log("deleted demo book", code);
}

async function main() {
  const phase = process.argv[2];
  const browser = await chromium.launch();
  try {
    if (phase === "public") await publicShots(browser);
    else if (phase === "pagination") await paginationShot(browser);
    else if (phase === "staff") await staffShots(browser);
    else throw new Error("usage: capture-screenshots.ts public|pagination|staff");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
