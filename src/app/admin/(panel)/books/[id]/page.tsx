import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { deleteBook, toggleBookStatus } from "@/app/admin/actions";
import { BookForm } from "@/components/admin/book-form";
import { PagesManager, type ManagedPage } from "@/components/admin/pages-manager";
import { ConfirmSubmitButton, SubmitButton } from "@/components/admin/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { getBookFormData } from "@/lib/admin-data";
import { requireStaff } from "@/lib/auth-session";
import { uploadUrl } from "@/lib/books";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n";

export default async function EditBookPage({ params, searchParams }: PageProps<"/admin/books/[id]">) {
  const user = await requireStaff();
  const { id } = await params;
  const created = (await searchParams).created === "1";
  if (id.length > 40) notFound();

  const [{ locale, t }, data, book] = await Promise.all([
    getDict(),
    getBookFormData(),
    db.book.findUnique({ where: { id }, include: { pages: { orderBy: { order: "asc" } } } }),
  ]);
  if (!book) notFound();

  const pages: ManagedPage[] = book.pages.map((p) => ({
    id: p.id,
    order: p.order,
    type: p.type,
    imageUrl: p.imagePath ? uploadUrl(p.imagePath) : null,
    snippet: p.text ? p.text.replace(/^(#{1,3} |> |toc: )/gm, "").slice(0, 160) : null,
  }));
  const borrowed = book.status === "BORROWED";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.adminBooks}
      </Link>

      {created && (
        <p className="flex items-center gap-2 rounded-lg bg-available/10 px-4 py-3 text-sm text-available" role="status" data-testid="book-created">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {t.adminSaved} — {book.code}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted-foreground">{book.code}</p>
          <h1 className="font-serif text-2xl font-semibold text-balance">{book.title}</h1>
          <div className="mt-2">
            <StatusBadge status={book.status} dueDate={book.dueDate} t={t} locale={locale} size="lg" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleBookStatus}>
            <input type="hidden" name="bookId" value={book.id} />
            <SubmitButton variant={borrowed ? "outline" : "default"} className="h-10">
              {borrowed ? t.adminMarkReturned : t.adminMarkBorrowed}
            </SubmitButton>
          </form>
          <Link
            href={`/book/${book.code}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm hover:border-primary/40"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t.adminView}
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-6" aria-labelledby="pages-h">
        <h2 id="pages-h" className="mb-3 font-serif text-lg font-semibold">
          {t.adminPages}
        </h2>
        <PagesManager t={t} bookId={book.id} pages={pages} maxPages={config.maxPagesPerBook} maxBytes={config.clientUploadBytes} />
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-6" aria-labelledby="details-h">
        <h2 id="details-h" className="mb-4 font-serif text-lg font-semibold">
          {t.adminEditBook}
        </h2>
        <BookForm t={t} locale={locale} {...data} book={book} />
      </section>

      {user.role === "ADMIN" && (
        <form action={deleteBook} className="flex justify-end">
          <input type="hidden" name="bookId" value={book.id} />
          <ConfirmSubmitButton variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" confirmText={t.adminDeleteConfirm}>
            <Trash2 className="size-4" aria-hidden="true" />
            {t.adminDelete}
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
