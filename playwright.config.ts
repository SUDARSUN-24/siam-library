import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. Needs the database running and seeded:
 *   npm run db:start   (separate window)
 *   npm run db:seed
 *   npm run test:e2e
 * Uses an already-running server on :3000 if there is one, otherwise starts `npm run dev`.
 * Live site:  E2E_BASE_URL=https://... (+ SEED_*_EMAIL/PASSWORD for the real accounts) — see DEPLOYMENT.md.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1, // staff tests change shared data (status, new books)
  retries: 0,
  timeout: 45_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Testing a deployed site (E2E_BASE_URL=https://...) → no local server.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
