import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffUser } from "@/lib/auth-session";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { deletePagePhoto, savePagePhoto, UploadError } from "@/lib/uploads";

/**
 * Upload ONE preview page photo (multipart field "file").
 * The client sends files one at a time so each request stays under 10 MB.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/books/[id]/pages">) {
  // Same-origin only (defence in depth on top of SameSite session cookies).
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "bad_origin" }, 403);

  const user = await getStaffUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const bookId = z.string().min(1).max(40).safeParse((await ctx.params).id);
  if (!bookId.success) return json({ error: "not_found" }, 404);
  const book = await db.book.findUnique({ where: { id: bookId.data }, select: { id: true, code: true } });
  if (!book) return json({ error: "not_found" }, 404);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > config.maxUploadBytes + 64 * 1024) return json({ error: "too_large" }, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!(file instanceof File)) return json({ error: "bad_request" }, 400);

  const count = await db.previewPage.count({ where: { bookId: book.id } });
  if (count >= config.maxPagesPerBook) return json({ error: "full" }, 409);

  let name: string;
  try {
    name = await savePagePhoto(file);
  } catch (e) {
    if (e instanceof UploadError) return json({ error: e.code }, e.code === "too_large" ? 413 : 415);
    throw e;
  }

  // Re-check the limit atomically-enough for a single library desk: if another upload
  // filled the book meanwhile, discard this photo.
  const page = await db.$transaction(async (tx) => {
    const n = await tx.previewPage.count({ where: { bookId: book.id } });
    if (n >= config.maxPagesPerBook) return null;
    return tx.previewPage.create({ data: { bookId: book.id, order: n + 1, type: "IMAGE", imagePath: name } });
  });
  if (!page) {
    await deletePagePhoto(name);
    return json({ error: "full" }, 409);
  }

  revalidatePath(`/book/${book.code}`);
  revalidatePath(`/admin/books/${book.id}`);
  return json({ id: page.id, order: page.order }, 201);
}

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
