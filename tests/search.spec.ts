import { expect, test } from "@playwright/test";
import { cardCodes, search, setEnglish } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

test("home shows all 18 books and 3 shelves", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Read before you borrow" })).toBeVisible();
  await expect(page.getByTestId("book-card")).toHaveCount(18);
  await expect(page.locator('a[href^="/shelf/"]')).toHaveCount(3);
});

test("search by title (English)", async ({ page }) => {
  await search(page, "algorithms");
  expect(await cardCodes(page)).toEqual(["A-001"]);
});

test("search by Thai title", async ({ page }) => {
  await search(page, "ฐานข้อมูล");
  expect(await cardCodes(page)).toContain("A-005");
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

test("no results message", async ({ page }) => {
  await search(page, "zzqqxx-nothing");
  await expect(page.getByText("No books match your search.")).toBeVisible();
});

test("filters: shelf and availability", async ({ page }) => {
  await page.goto("/?shelf=C");
  const codes = await cardCodes(page);
  expect(codes).toHaveLength(6);
  expect(codes.every((c) => c.startsWith("C-"))).toBe(true);

  await page.goto("/?status=BORROWED");
  await expect(page.getByTestId("book-card")).not.toHaveCount(0);
  for (const card of await page.getByTestId("book-card").all()) await expect(card).toContainText("Borrowed");
});

test("filter select submits automatically", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Shelf").selectOption("B");
  await expect(page).toHaveURL(/shelf=B/);
  expect((await cardCodes(page)).every((c) => c.startsWith("B-"))).toBe(true);
});

test("Thai is the default language and the toggle switches it", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL }); // no lang cookie
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("อ่านก่อนยืม");
  await page.getByTestId("lang-toggle").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Read before you borrow");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await context.close();
});
