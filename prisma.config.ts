import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, db seed's schema checks) needs a DIRECT connection: on Neon/Vercel that is
    // DATABASE_URL_UNPOOLED (Prisma 7 replaced schema `directUrl` with this setting). The app itself
    // connects with the pooled DATABASE_URL in src/lib/db.ts. Locally / in Docker only DATABASE_URL
    // exists, so it is used for both. The last fallback lets `prisma generate` run with no database.
    url:
      process.env["DATABASE_URL_UNPOOLED"] ??
      process.env["DATABASE_URL"] ??
      "postgresql://build:build@localhost:5432/build",
  },
});
