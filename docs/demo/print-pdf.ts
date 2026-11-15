/** DEMO_GUIDE.print.html → DEMO_GUIDE.pdf (A4, Chromium). Run build_guide.py first. */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

async function main() {
  const dir = path.resolve("docs/demo");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(dir, "DEMO_GUIDE.print.html")).href, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const broken = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
    if (broken.length) throw new Error("images not loaded: " + broken.join(", "));
  });
  await page.pdf({
    path: path.join(dir, "DEMO_GUIDE.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#5b6373;text-align:center;font-family:Segoe UI,sans-serif">Siam University Library — Book Preview · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await browser.close();
  console.log("DEMO_GUIDE.pdf written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
