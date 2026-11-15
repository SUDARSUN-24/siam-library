import "server-only";
import { cache } from "react";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { categorySlug, PAGE_SIZE, type Sort } from "./catalogue";
import { searchBookIds } from "./search";

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

export type CategoryCount = { name: string; slug: string; count: number };

/** Every category with its number of books (one GROUP BY on the indexed column). */
export const getCategoriesWithCounts = cache(async (): Promise<CategoryCount[]> => {
  const rows = await db.book.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { category: "asc" } });
  return rows.map((r) => ({ name: r.category, slug: categorySlug(r.category), count: r._count._all }));
});

/** Shelves with total / available counts (cached per request). */
export const getShelvesWithCounts = cache(async () => {
  const [shelves, counts] = await Promise.all([
    db.shelf.findMany({ orderBy: { code: "asc" } }),
    db.book.groupBy({ by: ["shelfId", "status"], _count: { _all: true } }),
  ]);
  return shelves.map((s) => {
    const mine = counts.filter((c) => c.shelfId === s.id);
    const total = mine.reduce((n, c) => n + c._count._all, 0);
    const available = mine.filter((c) => c.status === "AVAILABLE").reduce((n, c) => n + c._count._all, 0);
    return { ...s, total, available };
  });
});

const ROW_SIZE = 10;

/** The three home-page rows — 10 books each, each served by its own index. */
export async function getHomeRows() {
  const newest = { createdAt: "desc" as const };
  const [newArrivals, availableNow, thaiBooks] = await Promise.all([
    db.book.findMany({ select: cardSelect, orderBy: [newest, { code: "asc" }], take: ROW_SIZE }),
    db.book.findMany({ where: { status: "AVAILABLE" }, select: cardSelect, orderBy: [newest, { code: "asc" }], take: ROW_SIZE }),
    db.book.findMany({ where: { language: "th" }, select: cardSelect, orderBy: [newest, { code: "asc" }], take: ROW_SIZE }),
  ]);
  return { newArrivals, availableNow, thaiBooks };
}

export type CatalogueFilters = {
  q?: string;
  shelf?: string;
  category?: string; // category NAME
  lang?: "th" | "en";
  available?: boolean;
};

export type CataloguePage = { books: BookCardData[]; total: number; page: number; pageCount: number };

/** One page (PAGE_SIZE books) of the catalogue: only those books are loaded. */
export async function findCatalogue(f: CatalogueFilters, sort: Sort, page: number): Promise<CataloguePage> {
  const skip = (page - 1) * PAGE_SIZE;
  let books: BookCardData[];
  let total: number;

  if (f.q) {
    const found = await searchBookIds({ ...f, q: f.q }, { sort, skip, take: PAGE_SIZE });
    books = await cardsInOrder(found.ids);
    total = found.total;
  } else {
    const where: Prisma.BookWhereInput = {
      ...(f.shelf && { shelf: { code: f.shelf } }),
      ...(f.category && { category: f.category }),
      ...(f.lang && { language: f.lang }),
      ...(f.available && { status: "AVAILABLE" as const }),
    };
    const order: Prisma.BookOrderByWithRelationInput[] =
      sort === "title"
        ? [{ title: "asc" }, { code: "asc" }]
        : sort === "newest"
          ? [{ createdAt: "desc" }, { code: "asc" }]
          : f.shelf
            ? [{ row: "asc" }, { code: "asc" }]
            : [{ code: "asc" }];
    [books, total] = await Promise.all([
      db.book.findMany({ where, select: cardSelect, orderBy: order, skip, take: PAGE_SIZE }),
      db.book.count({ where }),
    ]);
  }
  return { books, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Top matches for the live search dropdown (titles, authors, codes, ISBN — not page text). */
export async function suggestBooks(q: string, take = 5) {
  const { ids } = await searchBookIds({ q }, { sort: "relevance", skip: 0, take, withText: false, withCount: false });
  return cardsInOrder(ids);
}

async function cardsInOrder(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.book.findMany({ where: { id: { in: ids } }, select: cardSelect });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((b): b is BookCardData => Boolean(b));
}

export async function getBookByCode(code: string) {
  return db.book.findUnique({
    where: { code },
    include: { shelf: true, pages: { orderBy: { order: "asc" } } },
  });
}

export async function getShelfByCode(code: string) {
  return db.shelf.findUnique({ where: { code } });
}

/** URL the browser uses for an uploaded page photo (served by /api/uploads/[file]). */
export function uploadUrl(fileName: string) {
  return `/api/uploads/${fileName}`;
}
