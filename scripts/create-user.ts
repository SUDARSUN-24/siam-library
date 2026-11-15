/**
 * Create a staff account or reset a password from the command line.
 *
 *   npm run user:create -- <email> <name> <ADMIN|STAFF>
 *   (in Docker)  docker compose exec app npm run user:create -- <email> <name> <role>
 *
 * The password is typed in the terminal with HIDDEN input (nothing is echoed) and asked
 * twice. It is never accepted from the command line, a pipe or an environment variable,
 * and never printed — so it cannot end up in shell history, logs or command output.
 * Running it again for an existing email resets the password (2FA settings are kept).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";

const MIN_LENGTH = 12;

const args = z
  .tuple([z.string().trim().toLowerCase().email(), z.string().trim().min(1).max(100), z.enum(["ADMIN", "STAFF"])])
  .safeParse(process.argv.slice(2));

if (!args.success) {
  console.error("Usage: npm run user:create -- <email> <name> <ADMIN|STAFF>");
  process.exit(1);
}
const [email, name, role] = args.data;

/** Reads one line from the terminal without echoing it. Ctrl+C aborts. */
function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const done = (err?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done();
        if (ch === "\u0003") return done(new Error("Cancelled.")); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1); // Backspace
        else if (ch >= " ") value += ch; // ignore other control keys
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error("Run this in an interactive terminal: the password must be typed (hidden), not piped.");
  }
  console.log(`Setting the password for ${email} (${role}). Typing is hidden.`);
  const password = await askHidden(`New password (min ${MIN_LENGTH} characters): `);
  if (password.length < MIN_LENGTH) throw new Error(`Password must be at least ${MIN_LENGTH} characters.`);
  if (password.length > 200) throw new Error("Password must be at most 200 characters.");
  const again = await askHidden("Type it again: ");
  if (again !== password) throw new Error("The two passwords do not match. Nothing was changed.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await db.user.findUnique({ where: { email } });
    await db.user.upsert({ where: { email }, update: { name, role, passwordHash }, create: { email, name, role, passwordHash } });
    // Only the outcome is printed — never the password or its hash.
    console.log(`${existing ? "Password changed" : "Account created"}: ${email} (${role}).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
