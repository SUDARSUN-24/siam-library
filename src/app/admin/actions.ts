"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { staffHref } from "@/lib/admin-path";
import { assertStaff } from "@/lib/auth-session";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { deletePagePhoto } from "@/lib/uploads";
import { getDict } from "@/lib/i18n";
import { bookFormErrors, bookFormSchema } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";

const id = z.string().min(1).max(40);

function revalidateBook(code?: string) {
  revalidatePath("/admin");
  revalidatePath("/");
  if (code) {
    revalidatePath(`/book/${code}`);
    revalidatePath(`/shelf/${code.split("-")[0]}`);
  }
}

/** One-click borrowed ⇄ returned. Borrowing sets the due date to today + 14 days. */
export async function toggleBookStatus(formData: FormData) {
  await assertStaff();
  const bookId = id.parse(formData.get("bookId"));
  const book = await db.book.findUniqueOrThrow({ where: { id: bookId }, select: { status: true, code: true } });
  const borrowing = book.status === "AVAILABLE";
  await db.book.update({
    where: { id: bookId },
    data: borrowing
      ? { status: "BORROWED", dueDate: new Date(Date.now() + config.loanDays * 24 * 60 * 60 * 1000) }
      : { status: "AVAILABLE", dueDate: null },
  });
  revalidateBook(book.code);
}

export type BookFormState = {
  ok?: boolean;
  errors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
};

/** Create (no bookId) or update a book. New books go straight to the edit page to add photos. */
export async function saveBook(_prev: BookFormState, formData: FormData): Promise<BookFormState> {
  await assertStaff();
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]),
  );
  const parsed = bookFormSchema.safeParse(values);
  const { t } = await getDict();
  if (!parsed.success) return { errors: bookFormErrors(parsed.error.issues, values, t), values };
  const data = parsed.data;
  const shelf = await db.shelf.findUnique({ where: { id: data.shelfId }, select: { id: true } });
  if (!shelf) return { errors: { shelfId: t.errUnknownShelf }, values };

  const bookId = values.bookId ? id.parse(values.bookId) : null;
  const record = {
    code: data.code,
    title: data.title,
    altTitle: data.altTitle ?? null,
    author: data.author,
    category: data.category,
    language: data.language,
    year: data.year ?? null,
    publisher: data.publisher ?? null,
    isbn: data.isbn ?? null,
    shelfId: data.shelfId,
    row: data.row,
  };

  let savedId: string;
  try {
    if (bookId) {
      const before = await db.book.findUniqueOrThrow({ where: { id: bookId }, select: { code: true } });
      await db.book.update({ where: { id: bookId }, data: record });
      savedId = bookId;
      revalidateBook(before.code);
    } else {
      savedId = (await db.book.create({ data: record })).id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { code: t.errCodeTaken }, values };
    }
    throw e;
  }
  revalidateBook(data.code);
  revalidatePath(`/admin/books/${savedId}`);
  if (!bookId) redirect(staffHref(`/books/${savedId}?created=1`));
  return { ok: true, values };
}

/** Delete a book and its photo files. Admin only. */
export async function deleteBook(formData: FormData) {
  await assertStaff("ADMIN");
  const bookId = id.parse(formData.get("bookId"));
  const book = await db.book.findUniqueOrThrow({ where: { id: bookId }, include: { pages: true } });
  await db.book.delete({ where: { id: bookId } });
  await Promise.all(book.pages.map((p) => deletePagePhoto(p.imagePath)));
  revalidateBook(book.code);
  redirect(staffHref());
}

/** Delete one preview page (and its photo), then renumber the rest. */
export async function deletePage(formData: FormData) {
  await assertStaff();
  const pageId = id.parse(formData.get("pageId"));
  const page = await db.previewPage.findUniqueOrThrow({ where: { id: pageId }, include: { book: { select: { code: true } } } });
  await db.previewPage.delete({ where: { id: pageId } });
  await deletePagePhoto(page.imagePath);
  await renumber(page.bookId);
  revalidateBook(page.book.code);
  revalidatePath(`/admin/books/${page.bookId}`);
}

/** Move a page one step up or down. */
export async function movePage(formData: FormData) {
  await assertStaff();
  const pageId = id.parse(formData.get("pageId"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  const page = await db.previewPage.findUniqueOrThrow({ where: { id: pageId }, include: { book: { select: { code: true } } } });
  const pages = await db.previewPage.findMany({ where: { bookId: page.bookId }, orderBy: { order: "asc" }, select: { id: true } });
  const i = pages.findIndex((p) => p.id === pageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= pages.length) return;
  [pages[i], pages[j]] = [pages[j], pages[i]];
  await db.$transaction(pages.map((p, k) => db.previewPage.update({ where: { id: p.id }, data: { order: k + 1 } })));
  revalidateBook(page.book.code);
  revalidatePath(`/admin/books/${page.bookId}`);
}

async function renumber(bookId: string) {
  const pages = await db.previewPage.findMany({ where: { bookId }, orderBy: { order: "asc" }, select: { id: true } });
  await db.$transaction(pages.map((p, k) => db.previewPage.update({ where: { id: p.id }, data: { order: k + 1 } })));
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
