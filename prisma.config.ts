import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Fallback lets `prisma generate` run during `docker build` with no database.
    url: process.env["DATABASE_URL"] ?? "postgresql://build:build@localhost:5432/build",
  },
});
