/**
 * Create a staff account or reset a password from the command line.
 *
 *   npm run user:create -- <email> <name> <ADMIN|STAFF>
 *   (in Docker)  docker compose exec app npm run user:create -- <email> <name> <role>
 *
 * The password is asked for interactively (not typed on the command line, so it does
 * not end up in shell history). Running it again for an existing email resets the password.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";

const args = z
  .tuple([z.string().trim().toLowerCase().email(), z.string().trim().min(1).max(100), z.enum(["ADMIN", "STAFF"])])
  .safeParse(process.argv.slice(2));

if (!args.success) {
  console.error("Usage: npm run user:create -- <email> <name> <ADMIN|STAFF>");
  process.exit(1);
}
const [email, name, role] = args.data;

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Password (min 10 characters): ");
  rl.close();
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.user.findUnique({ where: { email } });
  await db.user.upsert({ where: { email }, update: { name, role, passwordHash }, create: { email, name, role, passwordHash } });
  console.log(`${existing ? "Updated" : "Created"} ${role} account for ${email}.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
