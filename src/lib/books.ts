import "server-only";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import type { SearchFilters } from "./validation";

const cardSelect = {
  id: true,
  code: true,
  title: true,
  altTitle: true,
  author: true,
  category: true,
  language: true,
  status: true,
  dueDate: true,
  row: true,
  shelf: { select: { code: true, color: true, nameEn: true, nameTh: true } },
  // first page — if staff uploaded a cover photo it is shown on the card
  pages: {
    where: { order: 1, type: "IMAGE" },
    select: { imagePath: true },
    take: 1,
  },
} satisfies Prisma.BookSelect;

export type BookCardData = Prisma.BookGetPayload<{ select: typeof cardSelect }>;

/** Search across title, alternative title, author, ISBN, category and preview text (Thai + English). */
export async function searchBooks(f: SearchFilters) {
  const and: Prisma.BookWhereInput[] = [];

  if (f.q) {
    const words = f.q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const w of words) {
      const contains = { contains: w, mode: "insensitive" as const };
      const isbnLike = w.replace(/-/g, "");
      and.push({
        OR: [
          { title: contains },
          { altTitle: contains },
          { author: contains },
          { category: contains },
          { code: contains },
          { publisher: contains },
          ...(isbnLike ? [{ isbn: { contains: isbnLike } }] : []),
          { pages: { some: { text: contains } } },
        ],
      });
    }
  }
  if (f.shelf) and.push({ shelf: { code: f.shelf } });
  if (f.category) and.push({ category: f.category });
  if (f.status) and.push({ status: f.status });

  return db.book.findMany({
    where: and.length ? { AND: and } : undefined,
    select: cardSelect,
    orderBy: { code: "asc" },
    take: 120,
  });
}

export async function getShelvesWithCounts() {
  const shelves = await db.shelf.findMany({ orderBy: { code: "asc" } });
  const counts = await db.book.groupBy({ by: ["shelfId", "status"], _count: { _all: true } });
  return shelves.map((s) => {
    const mine = counts.filter((c) => c.shelfId === s.id);
    const total = mine.reduce((n, c) => n + c._count._all, 0);
    const available = mine.filter((c) => c.status === "AVAILABLE").reduce((n, c) => n + c._count._all, 0);
    return { ...s, total, available };
  });
}

export async function getCategories() {
  const rows = await db.book.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  return rows.map((r) => r.category);
}

export async function getBookByCode(code: string) {
  return db.book.findUnique({
    where: { code },
    include: { shelf: true, pages: { orderBy: { order: "asc" } } },
  });
}

export async function getShelfByCode(code: string) {
  return db.shelf.findUnique({
    where: { code },
    include: { books: { select: cardSelect, orderBy: [{ row: "asc" }, { code: "asc" }] } },
  });
}

/** URL the browser uses for an uploaded page photo (served by /api/uploads/[file]). */
export function uploadUrl(fileName: string) {
  return `/api/uploads/${fileName}`;
}
