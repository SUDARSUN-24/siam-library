import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { cornersMoved, detectDocument, documentGuide, type DocumentQuad } from "../src/lib/document-scanner";
import { login, setEnglish, STAFF } from "./helpers";

const pageCorners: DocumentQuad = [
  { x: 0.12, y: 0.09 }, { x: 0.88, y: 0.12 },
  { x: 0.84, y: 0.91 }, { x: 0.14, y: 0.89 },
];

async function image(quad: DocumentQuad | null, color = "#f7f1dd", text = true, background = "#393936", blur = 0) {
  const points = quad?.map((p) => `${p.x * 240},${p.y * 320}`).join(" ");
  const lines = text ? Array.from({ length: 16 }, (_, i) => `<path d="M55 ${80 + i * 10}h125" stroke="#555" stroke-width="2"/>`).join("") : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="${background}"/>${quad ? `<polygon points="${points}" fill="${color}"/>${lines}` : ""}</svg>`;
  let pipeline = sharp(Buffer.from(svg));
  if (blur) pipeline = pipeline.blur(blur);
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

test("detector finds four page borders, including a colored cover with perspective", async () => {
  for (const color of ["#f7f1dd", "#419cc9"]) {
    const found = detectDocument(await image(pageCorners, color));
    expect(found).not.toBeNull();
    for (const [i, p] of found!.entries()) {
      expect(Math.hypot(p.x - pageCorners[i].x, p.y - pageCorners[i].y)).toBeLessThan(0.035);
    }
  }
  expect(cornersMoved(pageCorners, pageCorners.map((p) => ({ x: p.x + 0.04, y: p.y })) as DocumentQuad)).toBe(true);
});

test("detects soft low-contrast page edges and adapts the guide to the page", async () => {
  for (const [color, background] of [["#f7f1dd", "#d6d6cf"], ["#53534e", "#393936"]]) {
    const found = detectDocument(await image(pageCorners, color, true, background, 0.6));
    expect(found).not.toBeNull();
    for (const [i, p] of found!.entries()) expect(Math.hypot(p.x - pageCorners[i].x, p.y - pageCorners[i].y)).toBeLessThan(0.04);
  }
  const widePage: DocumentQuad = [{ x: 0.1, y: 0.18 }, { x: 0.9, y: 0.18 }, { x: 0.9, y: 0.82 }, { x: 0.1, y: 0.82 }];
  const guide = documentGuide(widePage);
  expect((guide[1].x - guide[0].x) * 0.75 / (guide[3].y - guide[0].y)).toBeCloseTo(0.9375);
  expect(guide[0].y).toBeGreaterThan(0.06);
});

test("detector rejects empty, clipped, small and landscape scenes", async () => {
  const rectangle = (x: number, y: number, w: number, h: number): DocumentQuad => [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ];
  for (const quad of [null, rectangle(0, 0.05, 0.95, 0.9), rectangle(0.35, 0.35, 0.3, 0.3), rectangle(0.06, 0.3, 0.88, 0.4)]) {
    expect(detectDocument(await image(quad, undefined, false))).toBeNull();
  }
});

declare global {
  interface Window {
    scannerTest: { stops: number; scene: "blank" | "page" | "moving" };
  }
}

async function mockCamera(page: Page, denied = false) {
  await page.addInitScript((denied) => {
    window.scannerTest = { stops: 0, scene: "blank" };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: async () => {
      if (denied) throw new DOMException("Permission denied", "NotAllowedError");
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 320;
      const ctx = canvas.getContext("2d")!;
      let tick = 0;
      const draw = () => {
        ctx.fillStyle = "#393936";
        ctx.fillRect(0, 0, 240, 320);
        if (window.scannerTest.scene === "blank") return;
        const dx = window.scannerTest.scene === "moving" ? (tick++ % 2 ? 9 : -9) : 0;
        ctx.fillStyle = "#f7f1dd";
        ctx.beginPath();
        ctx.moveTo(29 + dx, 29); ctx.lineTo(211 + dx, 38);
        ctx.lineTo(202 + dx, 291); ctx.lineTo(34 + dx, 285);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#555";
        for (let i = 0; i < 16; i++) ctx.fillRect(55 + dx, 80 + i * 10, 125, 2);
      };
      draw();
      const timer = setInterval(draw, 100);
      const stream = canvas.captureStream(10);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(timer); window.scannerTest.stops++; stop(); };
      }
      return stream;
    } });
  }, denied);
}

async function openScanner(page: Page) {
  await login(page, STAFF);
  await page.getByTestId("admin-row-A-001").getByRole("link", { name: /Edit/ }).click();
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("scanner camera flow", () => {
  test.beforeEach(async ({ context, baseURL }) => setEnglish(context, baseURL!));

  test("fitting a steady page automatically captures, fits and saves it with no shutter or confirmation tap", async ({ page }, testInfo) => {
    const uploads: Buffer[] = [];
    await page.route("**/api/admin/books/*/pages", async (route) => {
      const request = route.request();
      const form = await new Request(request.url(), { method: "POST", headers: { "content-type": request.headers()["content-type"] }, body: new Uint8Array(request.postDataBuffer()!) }).formData();
      uploads.push(Buffer.from(await (form.get("file") as File).arrayBuffer()));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await mockCamera(page);
    await openScanner(page);
    await expect(page.getByRole("button", { name: "Capture now" })).toBeEnabled();
    // A stationary blank frame must not trigger capture, nor may a moving document.
    await page.waitForTimeout(1900);
    expect(uploads).toHaveLength(0);
    await page.evaluate(() => { window.scannerTest.scene = "moving"; });
    await page.waitForTimeout(2100);
    expect(uploads).toHaveLength(0);
    await page.screenshot({ path: testInfo.outputPath("scan-auto-camera.png") });
    await page.evaluate(() => { window.scannerTest.scene = "page"; });
    await expect.poll(() => uploads.length).toBe(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => window.scannerTest.stops)).toBeGreaterThan(0);
    const saved = await sharp(uploads[0]).metadata();
    expect(saved.format).toBe("jpeg");
    expect(saved.height).toBeGreaterThan(saved.width!);
    expect(saved.height).toBeLessThan(300);
    // The image itself is a fitted page, with paper at every corner rather than desk background.
    const { data, info } = await sharp(uploads[0]).raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of [[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]]) {
      const offset = (Math.floor(y * info.height) * info.width + Math.floor(x * info.width)) * info.channels;
      expect(Math.min(...data.subarray(offset, offset + 3))).toBeGreaterThan(200);
    }
    await expect(page.getByText("Upload complete", { exact: true })).toBeVisible();
    expect(uploads).toHaveLength(1);
  });

  test("manual capture crops the guide and cancellation releases the camera", async ({ page }, testInfo) => {
    await mockCamera(page);
    await openScanner(page);
    await page.getByRole("button", { name: "Capture now" }).click();
    await expect(page.getByTestId("scan-preview")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("scan-manual-preview.png") });
    await page.getByRole("button", { name: "Retake", exact: true }).click();
    await expect(page.getByRole("button", { name: "Capture now" })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath("scan-camera.png") });
    const before = await page.evaluate(() => window.scannerTest.stops);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => window.scannerTest.stops)).toBeGreaterThan(before);
  });

  test("camera denial offers the phone camera fallback", async ({ page }) => {
    await mockCamera(page, true);
    await openScanner(page);
    await expect(page.getByRole("status")).toContainText("Cannot access the camera");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Use phone camera", exact: true }).click();
    const chooser = await chooserPromise;
    expect(await chooser.element().getAttribute("capture")).toBe("environment");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
