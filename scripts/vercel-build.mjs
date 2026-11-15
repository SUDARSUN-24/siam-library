/**
 * Vercel build command (vercel.json "buildCommand"):
 *   Production → `prisma migrate deploy`, then `next build`.
 *   Preview / anything else → `next build` only (migrate the preview branch by hand).
 *
 * If the migration fails the build fails, so new code never goes live without its schema.
 * Migrations must stay backward-compatible: they run before the new code is live, and if
 * `next build` then fails, the OLD code keeps serving the migrated database.
 */
import { spawnSync } from "node:child_process";

function run(cmd) {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
    console.error("Production build without DATABASE_URL(_UNPOOLED) — cannot apply migrations.");
    process.exit(1);
  }
  run("npx prisma migrate deploy");
} else {
  console.log(`VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"} → skipping prisma migrate deploy`);
}
run("npx next build");
