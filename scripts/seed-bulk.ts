/**
 * LOCAL LOAD TEST ONLY: adds fake books so you can check the site stays fast with thousands.
 *
 *   npm run seed:bulk                 # +2,000 books (plus the 18 demo books = 2,018)
 *   npm run seed:bulk -- 5000         # any number up to 13,000 (26 test shelves × 500)
 *   npm run seed:bulk -- --remove     # delete all bulk books and their test shelves again
 *
 * Bulk books live on extra test shelves "TA", "TB", … (500 books each, codes TA-001 …),
 * marked with the publisher "Bulk Test Press", so `--remove` and re-runs find exactly them.
 * Re-running replaces the previous bulk books.
 *
 * NEVER run this against production: it refuses unless DATABASE_URL points at localhost and
 * it is not running on Vercel / with NODE_ENV=production.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const MARK = "Bulk Test Press";
const PER_SHELF = 500;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertLocal(url: string | undefined) {
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).hostname;
  const problems = [
    !LOCAL_HOSTS.has(host) && `DATABASE_URL host is "${host}", not localhost`,
    process.env.VERCEL && "running on Vercel",
    process.env.NODE_ENV === "production" && "NODE_ENV=production",
    process.env.DATABASE_URL_UNPOOLED && "DATABASE_URL_UNPOOLED is set (looks like a Neon environment)",
  ].filter(Boolean);
  if (problems.length) {
    console.error(`Refusing to run seed:bulk — it is for the LOCAL database only (${problems.join("; ")}).`);
    process.exit(1);
  }
  return host;
}

// ── fake data ────────────────────────────────────────────────────────────────────────────
let seed = 20261115;
const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];

const categories = [
  "Programming", "Networking", "Software Engineering", "Artificial Intelligence", "Database", "Security",
  "Management", "Accounting", "Entrepreneurship", "Marketing", "Business Analytics",
  "Novel", "Poetry", "Short Stories", "Literary Studies",
] as const;

const enAdj = ["Practical", "Modern", "Essential", "Applied", "Gentle", "Complete", "Hidden", "Quiet", "Rapid", "Patient", "Open", "Careful"];
const enNoun = ["Algorithms", "Networks", "Systems", "Markets", "Ledgers", "Rivers", "Patterns", "Signals", "Gardens", "Cities", "Machines", "Letters", "Harbours", "Models", "Teams"];
const enTail = ["for Beginners", "in Practice", "Explained", "of Tomorrow", "and Their Stories", "Step by Step", "at Work", "in Thailand", "", "", ""];
const thHead = ["หลักการ", "พื้นฐาน", "เทคนิค", "ศาสตร์แห่ง", "คู่มือ", "เรื่องเล่า", "บันทึก", "โลกของ", "เส้นทาง", "ความลับของ"];
const thBody = ["ระบบสารสนเทศ", "การตลาดดิจิทัล", "ฐานข้อมูล", "เครือข่าย", "การบัญชี", "สายน้ำ", "เมืองเก่า", "ปัญญาประดิษฐ์", "การจัดการ", "บทกวี", "ความทรงจำ", "การลงทุน"];
const thTail = ["ฉบับปรับปรุง", "สำหรับผู้เริ่มต้น", "เชิงปฏิบัติ", "ร่วมสมัย", "", "", ""];
const firstEn = ["Anna", "Chris", "Dana", "Ellis", "Jordan", "Kim", "Lee", "Morgan", "Noor", "Robin", "Sam", "Taylor"];
const lastEn = ["Carter", "Hughes", "Moreau", "Nakamura", "Okafor", "Patel", "Reyes", "Silva", "Walsh", "Young"];
const firstTh = ["สมชาย", "สุดา", "ประภา", "วิชัย", "นภา", "อรุณ", "กมล", "ปิยะ", "ศิริ", "ธนา"];
const lastTh = ["ใจดี", "ศรีสุข", "แสงทอง", "วงศ์ไทย", "บุญมา", "รักษ์ศิลป์", "มั่นคง", "เพชรงาม"];

function fakeBook(i: number) {
  const th = rand() < 0.4;
  const title = th
    ? `${pick(thHead)}${pick(thBody)}${(() => { const tl = pick(thTail); return tl ? ` ${tl}` : ""; })()}`
    : `${pick(enAdj)} ${pick(enNoun)} ${pick(enTail)}`.trim();
  const author = th ? `${pick(firstTh)} ${pick(lastTh)}` : `${pick(firstEn)} ${pick(lastEn)}`;
  const intro = th
    ? `บทนำของ${title} เล่มนี้อธิบายแนวคิดสำคัญด้วยตัวอย่างจากชีวิตประจำวัน เหมาะสำหรับนักศึกษา`
    : `This introduction to ${title} walks through the key ideas with everyday examples, written for students.`;
  return { th, title, author, intro, n: i };
}

async function main() {
  const host = assertLocal(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const remove = process.argv.includes("--remove");
  const countArg = process.argv.slice(2).find((a) => /^\d+$/.test(a));
  const count = Math.min(Number(countArg ?? 2000), 26 * PER_SHELF); // shelves TA … TZ

  // remove previous bulk data (books cascade their preview pages)
  const removed = await db.book.deleteMany({ where: { publisher: MARK } });
  await db.shelf.deleteMany({ where: { nameEn: { startsWith: "Bulk test shelf" }, books: { none: {} } } });
  console.log(`Removed ${removed.count} previous bulk books from ${host}.`);
  if (remove) return db.$disconnect();

  const shelfCount = Math.ceil(count / PER_SHELF);
  const colors = ["#5b6b8c", "#6b5b8c", "#5b8c7a", "#8c6b5b", "#7a8c5b", "#8c5b6b"];
  const shelves = [];
  for (let s = 0; s < shelfCount; s++) {
    const code = `T${String.fromCharCode(65 + (s % 26))}`;
    shelves.push(
      await db.shelf.upsert({
        where: { code },
        update: {},
        create: { code, nameEn: `Bulk test shelf ${code}`, nameTh: `ชั้นทดสอบ ${code}`, color: colors[s % colors.length] },
      }),
    );
  }

  const now = Date.now();
  const BATCH = 500;
  for (let start = 0; start < count; start += BATCH) {
    const rows = [];
    const pages = [];
    for (let i = start; i < Math.min(start + BATCH, count); i++) {
      const f = fakeBook(i);
      const shelf = shelves[Math.floor(i / PER_SHELF)];
      const id = `bulk${String(i).padStart(6, "0")}`;
      const borrowed = rand() < 0.3;
      rows.push({
        id,
        code: `${shelf.code}-${String((i % PER_SHELF) + 1).padStart(3, "0")}`,
        title: f.title,
        author: f.author,
        category: pick(categories),
        language: f.th ? "th" : "en",
        year: 1990 + Math.floor(rand() * 36),
        publisher: MARK,
        isbn: `9798${String(900000000 + i).slice(0, 9)}`,
        shelfId: shelf.id,
        row: 1 + Math.floor((i % PER_SHELF) / 50),
        status: borrowed ? ("BORROWED" as const) : ("AVAILABLE" as const),
        dueDate: borrowed ? new Date(now + Math.floor(rand() * 14) * 86_400_000) : null,
        createdAt: new Date(now - Math.floor(rand() * 365) * 86_400_000),
      });
      pages.push(
        { bookId: id, order: 1, type: "TEXT" as const, text: `# ${f.title}\n\n> ${f.author}` },
        { bookId: id, order: 2, type: "TEXT" as const, text: f.intro },
      );
    }
    await db.book.createMany({ data: rows });
    await db.previewPage.createMany({ data: pages });
    process.stdout.write(`\rAdded ${Math.min(start + BATCH, count)} / ${count} books`);
  }
  console.log(`\nDone: ${count} bulk books on shelves ${shelves.map((s) => s.code).join(", ")} (${host}).`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
