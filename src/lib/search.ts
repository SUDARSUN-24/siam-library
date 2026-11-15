import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { categoryTh } from "./dict";
import type { Sort } from "./catalogue";

/**
 * Full-text-ish book search in Postgres, the ONLY place that uses raw SQL (Prisma has no
 * trigram operators). Every value is a bound parameter via Prisma.sql — never string concat.
 *
 * Each word of the query must match one of: title, other-language title, author, publisher,
 * category (English or its Thai label), book code, ISBN (hyphens ignored) or preview text.
 * Typo tolerance: words of 4+ characters also match titles/authors by trigram word similarity
 * (pg_trgm `<%`, threshold below). The GIN trigram indexes (migration *_catalogue_search)
 * serve both ILIKE '%word%' and `<%`.
 *
 * Note: the Windows build of Postgres used by `npm run db:start` only makes trigrams from ASCII,
 * so locally Thai words match by substring only; Neon (Linux) is typo-tolerant for Thai too.
 */

/** pg_trgm word_similarity threshold for fuzzy matches (default 0.6 is too strict for typos). */
const FUZZY_THRESHOLD = 0.45;
const MIN_FUZZY_LENGTH = 4;
const MAX_WORDS = 6;

export type SearchFilters = {
  q: string;
  shelf?: string;
  category?: string; // category NAME (as stored)
  lang?: "th" | "en";
  available?: boolean;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** English category names whose Thai label contains the word ("การตลาด" → Marketing). */
function categoriesForThai(word: string) {
  return Object.entries(categoryTh)
    .filter(([, th]) => th.includes(word))
    .map(([en]) => en);
}

function wordCondition(word: string, withText: boolean) {
  const like = `%${escapeLike(word)}%`;
  const parts: Prisma.Sql[] = [
    Prisma.sql`b.title ILIKE ${like}`,
    Prisma.sql`b."altTitle" ILIKE ${like}`,
    Prisma.sql`b.author ILIKE ${like}`,
    Prisma.sql`b.publisher ILIKE ${like}`,
    Prisma.sql`b.category ILIKE ${like}`,
    Prisma.sql`b.code ILIKE ${like}`,
  ];
  const digits = word.replace(/[\s-]/g, "");
  if (/^\d{3,13}[xX]?$/.test(digits)) parts.push(Prisma.sql`b.isbn LIKE ${`%${digits.toUpperCase()}%`}`);
  const thaiCategories = categoriesForThai(word);
  if (thaiCategories.length) parts.push(Prisma.sql`b.category IN (${Prisma.join(thaiCategories)})`);
  if (word.length >= MIN_FUZZY_LENGTH) {
    parts.push(Prisma.sql`${word} <% b.title`, Prisma.sql`${word} <% b."altTitle"`, Prisma.sql`${word} <% b.author`);
  }
  if (withText && word.length >= 2) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "PreviewPage" p WHERE p."bookId" = b.id AND p.text ILIKE ${like})`,
    );
  }
  return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
}

function whereClause(f: SearchFilters, withText: boolean) {
  const words = f.q.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);
  const conds: Prisma.Sql[] = words.map((w) => wordCondition(w, withText));
  if (f.shelf) conds.push(Prisma.sql`s.code = ${f.shelf}`);
  if (f.category) conds.push(Prisma.sql`b.category = ${f.category}`);
  if (f.lang) conds.push(Prisma.sql`b.language = ${f.lang}`);
  if (f.available) conds.push(Prisma.sql`b.status = 'AVAILABLE'`);
  return conds.length ? Prisma.join(conds, " AND ") : Prisma.sql`TRUE`;
}

/** Relevance: title starts with / contains the whole query, then trigram similarity. */
function relevance(q: string) {
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  return Prisma.sql`(
    CASE WHEN b.title ILIKE ${prefix} THEN 3
         WHEN b.title ILIKE ${like} OR b."altTitle" ILIKE ${like} THEN 2
         WHEN b.author ILIKE ${like} THEN 1.5
         ELSE 0 END
    + GREATEST(word_similarity(${q}, b.title), word_similarity(${q}, coalesce(b."altTitle", '')), 0.8 * word_similarity(${q}, b.author))
  )`;
}

function orderBy(sort: Sort, q: string, byRow: boolean) {
  switch (sort) {
    case "title":
      return Prisma.sql`b.title ASC, b.code ASC`;
    case "newest":
      return Prisma.sql`b."createdAt" DESC, b.code ASC`;
    case "shelf":
      return byRow ? Prisma.sql`b.row ASC, b.code ASC` : Prisma.sql`b.code ASC`;
    default:
      return Prisma.sql`${relevance(q)} DESC, b.code ASC`;
  }
}

/**
 * Ids of the matching books for one page, in order, plus the total number of matches.
 * One transaction: set the fuzzy threshold for this transaction only, count, fetch ids.
 */
export async function searchBookIds(
  f: SearchFilters,
  { sort, skip, take, withText = true, withCount = true }: { sort: Sort; skip: number; take: number; withText?: boolean; withCount?: boolean },
) {
  const where = whereClause(f, withText);
  const from = Prisma.sql`FROM "Book" b JOIN "Shelf" s ON s.id = b."shelfId" WHERE ${where}`;
  const [, rows, count] = await db.$transaction([
    db.$queryRaw`SELECT set_config('pg_trgm.word_similarity_threshold', ${String(FUZZY_THRESHOLD)}, true)`,
    db.$queryRaw<{ id: string }[]>`SELECT b.id ${from} ORDER BY ${orderBy(sort, f.q, Boolean(f.shelf))} LIMIT ${take} OFFSET ${skip}`,
    withCount ? db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n ${from}` : db.$queryRaw<{ n: number }[]>`SELECT 0 AS n`,
  ]);
  return { ids: rows.map((r) => r.id), total: withCount ? (count[0]?.n ?? 0) : rows.length };
}
