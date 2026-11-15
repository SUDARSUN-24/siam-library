import { expect, test } from "@playwright/test";
import { cardCodes, filters, search, setEnglish } from "./helpers";
import { categorySlug, pageWindow } from "../src/lib/catalogue";

test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

// ── home ────────────────────────────────────────────────────────────────────────────────

test("home is a starting point: shelves, categories and three book rows", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read before you borrow" })).toBeVisible();
  await expect(page.locator('main a[href^="/shelf/"]')).toHaveCount(3);
  await expect(page.getByTestId("category-tile")).toHaveCount(15);
  await expect(page.getByTestId("category-tile").filter({ hasText: "Programming" })).toContainText("1 book");

  for (const [row, href] of [
    ["new", "/books?sort=newest"],
    ["available", "/books?available=1"],
    ["thai", "/books?lang=th"],
  ]) {
    const section = page.getByTestId(`row-${row}`);
    const n = await section.getByTestId("book-card").count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(10);
    await expect(section.getByTestId("see-all")).toHaveAttribute("href", href);
  }
  for (const card of await page.getByTestId("row-available").getByTestId("book-card").all()) {
    await expect(card).toContainText("Available");
  }
  await expect(page.getByTestId("browse-all")).toContainText("Browse all 18 books");
});

test("home rows scroll sideways without making the page wider", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("See all → opens the catalogue with that filter", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("row-thai").getByTestId("see-all").click();
  await expect(page).toHaveURL(/\/books\?lang=th$/);
  const codes = await cardCodes(page);
  expect(codes.length).toBeGreaterThan(0);
  await expect(page.getByTestId("filter-chips")).toContainText("Thai");
});

test("category tile → category page", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("category-tile").filter({ hasText: "Novel" }).click();
  await expect(page).toHaveURL(/\/category\/novel$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Novel");
  await expect(page.getByTestId("book-card")).toHaveCount(3);
});

test("unknown category is a 404", async ({ page }) => {
  const res = await page.goto("/category/no-such-category");
  expect(res?.status()).toBe(404);
});

// ── catalogue ───────────────────────────────────────────────────────────────────────────

test("catalogue lists all books in shelf order", async ({ page }) => {
  await page.goto("/books");
  await expect(page.getByTestId("result-count")).toHaveText("18 books");
  const codes = await cardCodes(page);
  expect(codes).toHaveLength(18);
  expect(codes).toEqual([...codes].sort());
  await expect(page.getByTestId("pagination")).toHaveCount(0); // 18 < 24 per page
});

test("filters: shelf, language and available only (sidebar / bottom sheet)", async ({ page, isMobile }) => {
  await page.goto("/books");
  await (await filters(page, isMobile)).getByTestId("filter-shelf-C").click();
  await expect(page).toHaveURL(/\/books\?shelf=C$/);
  await expect(page.getByTestId("filter-sheet")).toHaveCount(0); // sheet closed after choosing
  let codes = await cardCodes(page);
  expect(codes).toHaveLength(6);
  expect(codes.every((c) => c.startsWith("C-"))).toBe(true);

  await (await filters(page, isMobile)).getByTestId("filter-available").click();
  await expect(page).toHaveURL(/shelf=C&available=1/);
  for (const card of await page.getByTestId("book-card").all()) await expect(card).toContainText("Available");

  await (await filters(page, isMobile)).getByTestId("filter-lang-en").click();
  await expect(page).toHaveURL(/lang=en/);
  codes = await cardCodes(page);
  expect(codes.every((c) => c.startsWith("C-"))).toBe(true);

  // remove one filter with its chip
  await page.getByRole("link", { name: "Remove filter: Shelf C" }).click();
  await expect(page).not.toHaveURL(/shelf=/);
  await expect(page).toHaveURL(/available=1/);
});

test("sorting is kept in the URL", async ({ page }) => {
  await page.goto("/books?shelf=A");
  await page.getByTestId("sort-select").selectOption("title");
  await expect(page).toHaveURL(/shelf=A&sort=title/);
  const titles = await page.getByTestId("book-card").locator("h3[lang]").allInnerTexts();
  expect(titles).toHaveLength(6);
  expect(titles[0]).toBe("Clean Code for Student Projects");
});

test("page numbers in the URL; a page past the end says so", async ({ page }) => {
  await page.goto("/books?page=2");
  await expect(page.getByText("There are no books on this page.")).toBeVisible();
  await page.getByRole("link", { name: "Go to page 1" }).click();
  await expect(page.getByTestId("book-card")).toHaveCount(18);
});

test("page-number window", () => {
  expect(pageWindow(1, 1)).toEqual([1]);
  expect(pageWindow(1, 5)).toEqual([1, 2, "gap", 5]);
  expect(pageWindow(6, 20)).toEqual([1, "gap", 5, 6, 7, "gap", 20]);
  expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  expect(categorySlug("Software Engineering")).toBe("software-engineering");
});

test("old home-page filter links redirect to the catalogue", async ({ page }) => {
  await page.goto("/?shelf=C&status=AVAILABLE");
  await expect(page).toHaveURL(/\/books\?shelf=C&available=1$/);
  await page.goto("/?category=Novel");
  await expect(page).toHaveURL(/\/books\?category=novel$/);
  await expect(page.getByTestId("book-card")).toHaveCount(3);
});

test("shelf page uses the catalogue filters", async ({ page, isMobile }) => {
  await page.goto("/shelf/B");
  await expect(page.getByTestId("book-card")).toHaveCount(6);
  await (await filters(page, isMobile)).getByTestId("filter-available").click();
  await expect(page).toHaveURL(/\/shelf\/B\?available=1$/);
  for (const card of await page.getByTestId("book-card").all()) await expect(card).toContainText("Available");
});

// ── search ──────────────────────────────────────────────────────────────────────────────

test("search by title (English)", async ({ page }) => {
  await search(page, "algorithms");
  expect(await cardCodes(page)).toEqual(["A-001"]);
  await expect(page.getByTestId("catalogue-heading")).toContainText("Results for “algorithms”");
});

test("search tolerates typos", async ({ page }) => {
  await search(page, "algoritms");
  expect((await cardCodes(page))[0]).toBe("A-001");
});

test("search by Thai title", async ({ page }) => {
  await search(page, "ฐานข้อมูล");
  expect(await cardCodes(page)).toContain("A-005");
});

test("Thai typo tolerance (Neon only — local Windows Postgres makes no Thai trigrams)", async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, "needs the Linux Postgres of the deployed site");
  await search(page, "ฐานข้อมุล"); // ู → ุ
  expect(await cardCodes(page)).toContain("A-005");
});

test("search by Thai category name", async ({ page }) => {
  await search(page, "นวนิยาย"); // = Novel
  expect(await cardCodes(page)).toHaveLength(3);
});

test("search by author", async ({ page }) => {
  await search(page, "Saelee");
  expect(await cardCodes(page)).toEqual(["A-002"]);
});

test("search by ISBN, with or without hyphens", async ({ page }) => {
  await search(page, "979-8001001010");
  expect(await cardCodes(page)).toEqual(["A-001"]);
});

test("search inside preview contents", async ({ page }) => {
  // "Careful Clerk" only appears in the introduction text of A-001
  await search(page, "Careful Clerk");
  expect(await cardCodes(page)).toEqual(["A-001"]);
});

test("search keeps the chosen filters", async ({ page }) => {
  await page.goto("/books?shelf=A");
  await page.locator("#q").fill("the");
  await page.locator("#q").press("Enter");
  await expect(page).toHaveURL(/shelf=A/);
  expect((await cardCodes(page)).every((c) => c.startsWith("A-"))).toBe(true);
});

test("no results message", async ({ page }) => {
  await search(page, "zzqqxx-nothing");
  await expect(page.getByText("No books match your search.")).toBeVisible();
});

test("SQL-ish and wildcard input is just text", async ({ page }) => {
  for (const q of ["%", "_", "' OR 1=1 --", "\\"]) {
    const res = await page.goto(`/books?q=${encodeURIComponent(q)}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("book-card")).toHaveCount(0);
  }
});

// ── live suggestions ────────────────────────────────────────────────────────────────────

test("live suggestions: shown after 2 characters, keyboard opens a book", async ({ page }) => {
  await page.goto("/");
  const box = page.locator("#q");
  await box.fill("a");
  await page.waitForTimeout(400);
  await expect(page.getByTestId("suggestions")).toBeHidden();

  await box.fill("algorith");
  const first = page.getByTestId("suggestion").first();
  await expect(first).toHaveAttribute("data-code", "A-001");
  await expect(first).toContainText("Shelf A · Row 1");
  expect(await page.getByTestId("suggestion").count()).toBeLessThanOrEqual(5);
  await expect(box).toHaveAttribute("aria-expanded", "true");

  await box.press("ArrowDown");
  await expect(box).toHaveAttribute("aria-activedescendant", /.+/);
  await expect(first).toHaveAttribute("aria-selected", "true");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/book\/A-001$/);
});

test("live suggestions: Esc closes, Enter without a choice searches", async ({ page }) => {
  await page.goto("/");
  const box = page.locator("#q");
  await box.fill("Saelee");
  await expect(page.getByTestId("suggestion").first()).toHaveAttribute("data-code", "A-002");
  await box.press("Escape");
  await expect(page.getByTestId("suggestions")).toBeHidden();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/books\?q=Saelee$/);
});

test("suggest API: short or empty queries return nothing", async ({ request }) => {
  expect(await (await request.get("/api/suggest?q=a")).json()).toEqual({ books: [] });
  expect(await (await request.get("/api/suggest")).json()).toEqual({ books: [] });
  const res = await request.get("/api/suggest?q=" + "x".repeat(500));
  expect(await res.json()).toEqual({ books: [] });
});

// ── language ────────────────────────────────────────────────────────────────────────────

test("Thai is the default language and the toggle switches it", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL }); // no lang cookie
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("อ่านก่อนยืม");
  await expect(page.getByRole("heading", { name: "หนังสือมาใหม่" })).toBeVisible();
  await page.getByTestId("lang-toggle").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Read before you borrow");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await context.close();
});
