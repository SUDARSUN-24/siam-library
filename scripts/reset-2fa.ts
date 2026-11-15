/**
 * Turn two-step login OFF for one account (lost or replaced phone).
 *
 *   npm run user:reset-2fa -- <email>
 *   (in Docker)  docker compose exec app npm run user:reset-2fa -- <email>
 *
 * Deletes the TOTP secret and all backup codes. An ADMIN is then asked to set up 2FA
 * again on the next login; a STAFF account simply signs in with the password.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";

const email = z.string().trim().toLowerCase().email().safeParse(process.argv[2]);
if (!email.success) {
  console.error("Usage: npm run user:reset-2fa -- <email>");
  process.exit(1);
}

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const user = await db.user.findUnique({ where: { email: email.data! } });
  if (!user) throw new Error(`No account for ${email.data}.`);
  await db.$transaction([
    db.backupCode.deleteMany({ where: { userId: user.id } }),
    db.user.update({ where: { id: user.id }, data: { totpSecret: null, totpPendingSecret: null, totpEnabledAt: null, totpLastStep: null } }),
    db.loginThrottle.deleteMany({ where: { key: { in: [`2fa:acct:${user.id}`, `2fa:manage:${user.id}`] } } }),
  ]);
  console.log(`Two-step login turned off for ${user.email} (${user.role}).`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
