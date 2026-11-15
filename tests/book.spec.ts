import { expect, test } from "@playwright/test";
import { setEnglish } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

test("open a book from the catalogue", async ({ page }) => {
  await page.goto("/books");
  await page.getByTestId("book-card").filter({ hasText: "Thinking in Algorithms" }).click();
  await expect(page).toHaveURL(/\/book\/A-001$/);
  await expect(page.getByTestId("book-title")).toHaveText("Thinking in Algorithms");
  await expect(page.getByTestId("book-location")).toContainText("Shelf A · Row 1");
  await expect(page.getByText("Available", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("book-qr")).toContainText("/book/A-001");
});

test("borrowed book shows its due date", async ({ page }) => {
  await page.goto("/book/B-002");
  await expect(page.getByText(/Borrowed.*Due back/)).toBeVisible();
});

test("unknown book code shows not found", async ({ page }) => {
  const res = await page.goto("/book/Z-999");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Book not found")).toBeVisible();
});

test("shelf page lists its books by row", async ({ page }) => {
  await page.goto("/shelf/A");
  await expect(page.getByRole("heading", { name: "Information Technology" })).toBeVisible();
  await expect(page.getByTestId("book-card")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Row 1" })).toBeVisible();
});

test.describe("preview viewer", () => {
  test("flip with buttons, keys and thumbnails; end page says where to borrow", async ({ page }) => {
    await page.goto("/book/A-001");
    const position = page.getByTestId("viewer-position");
    // cover + 7 pages + end page
    await expect(position).toHaveText("Page 1 of 9");
    await expect(page.getByTestId("viewer-slide")).toHaveAttribute("data-slide-kind", "cover");

    await page.getByTestId("viewer-next").click();
    await expect(position).toHaveText("Page 2 of 9");
    await expect(page.getByTestId("viewer-slide")).toContainText("Thinking in Algorithms"); // title page

    await page.getByTestId("viewer-next").click();
    await expect(page.getByTestId("viewer-slide")).toContainText("Contents");

    await page.keyboard.press("ArrowRight");
    await expect(position).toHaveText("Page 4 of 9");
    await expect(page.getByTestId("viewer-slide")).toContainText("Preface");

    await page.keyboard.press("ArrowLeft");
    await expect(position).toHaveText("Page 3 of 9");
    await expect(page.getByTestId("viewer-prev")).toBeEnabled();

    // jump to the end with the last thumbnail
    await page.getByRole("button", { name: "Page 9 of 9" }).click();
    await expect(page.getByTestId("viewer-end")).toContainText("End of preview");
    await expect(page.getByTestId("viewer-end")).toContainText("Shelf A · Row 1");
    await expect(page.getByTestId("viewer-next")).toBeDisabled();

    await page.getByRole("button", { name: "Back to cover" }).click();
    await expect(position).toHaveText("Page 1 of 9");
  });

  test("swipe to turn pages on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    await page.goto("/book/C-003");
    const stage = page.getByTestId("viewer-slide");
    await stage.scrollIntoViewIfNeeded();
    const box = (await stage.boundingBox())!;
    const y = box.y + box.height / 2;
    const swipe = async (from: number, to: number) => {
      await stage.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: from, clientY: y }] });
      await stage.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: to, clientY: y }] });
    };
    await swipe(box.x + box.width * 0.8, box.x + box.width * 0.2); // swipe left → next
    await expect(page.getByTestId("viewer-position")).toHaveText("Page 2 of 9");
    await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8); // swipe right → previous
    await expect(page.getByTestId("viewer-position")).toHaveText("Page 1 of 9");
  });
});

test("book page fits a phone screen (no sideways scrolling)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await page.goto("/book/A-001");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
