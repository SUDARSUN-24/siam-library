import { NextResponse, type NextRequest } from "next/server";
import { canViewPreview } from "@/lib/access";
import { getViewerSession } from "@/lib/auth-session";
import { suggestBooks, uploadUrl } from "@/lib/books";
import { suggestQuerySchema } from "@/lib/validation";
import type { Suggestion } from "@/components/search-box";

/** Live search suggestions: GET /api/suggest?q=… → top 5 books (title, author, shelf, cover). */
export async function GET(request: NextRequest) {
  const parsed = suggestQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ books: [] });

  const [books, session] = await Promise.all([suggestBooks(parsed.data), getViewerSession()]);
  const showPhotos = canViewPreview(session); // cover photos are preview content
  const body: { books: Suggestion[] } = {
    books: books.map((b) => {
      const photo = showPhotos ? b.pages[0]?.imagePath : null;
      return {
        code: b.code,
        title: b.title,
        author: b.author,
        lang: b.language,
        shelf: { code: b.shelf.code, color: b.shelf.color },
        row: b.row,
        cover: photo ? uploadUrl(photo) : null,
      };
    }),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=30" } });
}
