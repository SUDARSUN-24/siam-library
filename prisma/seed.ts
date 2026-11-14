/**
 * Seed: 3 shelves, 18 books (7 text preview pages each), 1 admin + 1 staff account.
 * Safe to run more than once — it upserts shelves/users and replaces demo books.
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { books, shelves, type SeedBook } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Adds the ISBN-13 check digit to 12 digits. */
function isbn13(twelve: string) {
  const sum = [...twelve].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return twelve + ((10 - (sum % 10)) % 10);
}

/**
 * Text page markup (rendered by src/components/page-text.tsx):
 *   "# "  title      "## " subtitle / chapter heading     "### " small label
 *   "> "  centred muted line     "toc: Title::page"  contents row
 *   blank line = new paragraph; single newlines are kept (poetry).
 */
function previewPages(b: SeedBook): string[] {
  const th = b.language === "th";
  const L = th
    ? { by: "โดย", contents: "สารบัญ", preface: "คำนำ", chapter: "บทที่" }
    : { by: "by", contents: "Contents", preface: "Preface", chapter: "Chapter" };

  const titlePage = [
    `# ${b.title}`,
    b.altTitle ? `## ${b.altTitle}` : "",
    "",
    `> ${L.by} ${b.author}`,
    "",
    `> ${b.publisher} · ${b.year}`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  let page = 1;
  const toc = [
    `### ${L.contents}`,
    "",
    `toc: ${L.preface}::v`,
    ...b.toc.map((t, i) => {
      const row = `toc: ${i + 1}. ${t}::${page}`;
      page += 14 + ((i * 7) % 9);
      return row;
    }),
  ].join("\n");

  const preface = `### ${L.preface}\n\n${b.preface}`;
  const [p1, p2, p3, p4] = b.intro;

  return [titlePage, toc, preface, `## ${b.chapter}\n\n${p1}`, p2, p3, p4];
}

async function main() {
  // Shelves
  const shelfIds: Record<string, string> = {};
  for (const s of shelves) {
    const shelf = await db.shelf.upsert({
      where: { code: s.code },
      update: { nameEn: s.nameEn, nameTh: s.nameTh, color: s.color },
      create: s,
    });
    shelfIds[s.code] = shelf.id;
  }

  // Books (replace demo codes so re-seeding gives a clean state)
  await db.book.deleteMany({ where: { code: { in: books.map((b) => b.code) } } });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (const b of books) {
    const borrowed = b.borrowedDaysAgo !== undefined;
    await db.book.create({
      data: {
        code: b.code,
        title: b.title,
        altTitle: b.altTitle ?? null,
        author: b.author,
        category: b.category,
        language: b.language,
        year: b.year,
        publisher: b.publisher,
        isbn: isbn13(b.isbn12),
        shelfId: shelfIds[b.code[0]],
        row: b.row,
        status: borrowed ? "BORROWED" : "AVAILABLE",
        dueDate: borrowed ? new Date(now + (14 - b.borrowedDaysAgo!) * day) : null,
        pages: {
          create: previewPages(b).map((text, i) => ({ order: i + 1, type: "TEXT" as const, text })),
        },
      },
    });
  }

  // Demo accounts
  const accounts = [
    { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: "Library Admin", role: "ADMIN" as const },
    { email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD, name: "Library Staff", role: "STAFF" as const },
  ];
  for (const a of accounts) {
    if (!a.email || !a.password) {
      throw new Error("Set SEED_ADMIN_EMAIL/PASSWORD and SEED_STAFF_EMAIL/PASSWORD in .env before seeding.");
    }
    const passwordHash = await bcrypt.hash(a.password, 12);
    await db.user.upsert({
      where: { email: a.email.toLowerCase() },
      update: { passwordHash, role: a.role, name: a.name },
      create: { email: a.email.toLowerCase(), passwordHash, role: a.role, name: a.name },
    });
  }

  const [s, bk, p, u] = await Promise.all([db.shelf.count(), db.book.count(), db.previewPage.count(), db.user.count()]);
  console.log(`Seeded: ${s} shelves, ${bk} books, ${p} preview pages, ${u} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
