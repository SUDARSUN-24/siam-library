import "server-only";
import { db } from "./db";

/** Shelves, known categories and the next free book code per shelf (for the book form). */
export async function getBookFormData() {
  const [shelves, cats, books] = await Promise.all([
    db.shelf.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, nameEn: true, nameTh: true } }),
    db.book.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    db.book.findMany({ select: { code: true } }),
  ]);
  const used = new Set(books.map((b) => b.code));
  const nextCodes: Record<string, string> = {};
  for (const s of shelves) {
    let n = 1;
    while (used.has(`${s.code}-${String(n).padStart(3, "0")}`)) n++;
    nextCodes[s.id] = `${s.code}-${String(n).padStart(3, "0")}`;
  }
  return { shelves, categories: cats.map((c) => c.category), nextCodes };
}
