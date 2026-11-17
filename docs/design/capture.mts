/**
 * Before/after screenshots of the public site for the visual redesign (Playwright, Chromium).
 *
 *   npx tsx docs/design/capture.mts before      # → docs/design/before/
 *   npx tsx docs/design/capture.mts after       # → docs/design/after/
 *   E2E_BASE_URL=https://siam-library.vercel.app npx tsx docs/design/capture.mts after
 *
 * Local runs need `npm run db:start` + `npm run dev` and the demo seed (`npm run db:seed`).
 * Full-page shots at phone (375), tablet (768) and desktop (1280) widths, English UI.
 */
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const which = process.argv[2];
if (which !== "before" && which !== "after") throw new Error("usage: capture.mts before|after");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/design", which);

const sizes = [
  { name: "phone", width: 375, height: 812, scale: 2, mobile: true },
  { name: "tablet", width: 768, height: 1024, scale: 1, mobile: true },
  { name: "desktop", width: 1280, height: 860, scale: 1, mobile: false },
] as const;

const pages = [
  { name: "home", url: "/" },
  { name: "catalogue", url: "/books?available=1&lang=en" },
  { name: "shelf", url: "/shelf/A" },
  { name: "book", url: "/book/A-001" },
  { name: "search", url: "/books?q=data" },
];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))),
    );
  });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
for (const s of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: s.scale,
    isMobile: s.mobile,
    hasTouch: s.mobile,
    baseURL: BASE,
  });
  await ctx.addCookies([{ name: "lang", value: "en", url: BASE }]);
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(p.url);
    await settle(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.warn(`  ! ${p.name} @${s.width}: page is ${overflow}px wider than the screen`);
    const file = `${p.name}-${s.name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log("saved", which + "/" + file);
  }
  // Thai home on the phone: check Thai typography
  await ctx.addCookies([{ name: "lang", value: "th", url: BASE }]);
  if (s.name === "phone") {
    await page.goto("/");
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `home-thai-${s.name}.png`), fullPage: true });
    console.log("saved", which + `/home-thai-${s.name}.png`);
  }
  await ctx.close();
}
await browser.close();
