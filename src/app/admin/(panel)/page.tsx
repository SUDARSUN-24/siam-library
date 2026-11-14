import Link from "next/link";
import { Eye, Pencil, Plus, Search } from "lucide-react";
import { toggleBookStatus } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { BookCover } from "@/components/book-cover";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { fmt, formatDate } from "@/lib/dict";
import { getDict } from "@/lib/i18n";

export default async function AdminBooksPage({ searchParams }: PageProps<"/admin">) {
  const { locale, t } = await getDict();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) || "";

  const contains = { contains: q, mode: "insensitive" as const };
  const books = await db.book.findMany({
    where: q ? { OR: [{ title: contains }, { altTitle: contains }, { author: contains }, { code: contains }, { isbn: contains }] } : undefined,
    include: { shelf: true, _count: { select: { pages: true } } },
    orderBy: { code: "asc" },
  });
  const borrowed = books.filter((b) => b.status === "BORROWED").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{t.adminBooks}</h1>
          <p className="text-sm text-muted-foreground">
            {fmt(t.booksCount, { n: books.length })} · {t.statusBorrowed} {borrowed}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/books/new">
            <Plus className="size-4" aria-hidden="true" />
            {t.adminAddBook}
          </Link>
        </Button>
      </div>

      <form method="get" className="flex items-center gap-2 rounded-full border border-input bg-card px-4 focus-within:border-ring">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t.adminSearch}
          aria-label={t.adminSearch}
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
        />
      </form>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" data-testid="admin-book-list">
        {books.map((b) => {
          const borrowedNow = b.status === "BORROWED";
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-4" data-testid={`admin-row-${b.code}`}>
              <div className="w-11 shrink-0">
                <BookCover code={b.code} title={b.title} author={b.author} color={b.shelf.color} className="rounded-[2px]" />
              </div>
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate font-medium">{b.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{b.code}</span> · {b.author}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <StatusBadge status={b.status} t={t} locale={locale} />
                  {borrowedNow && b.dueDate && <span>{fmt(t.dueBack, { date: formatDate(b.dueDate, locale) })}</span>}
                  <span>{fmt(t.shelfRow, { shelf: b.shelf.code, row: b.row })}</span>
                  <span>· {fmt(t.previewPages, { n: b._count.pages })}</span>
                </p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <form action={toggleBookStatus} className="flex-1 sm:flex-none">
                  <input type="hidden" name="bookId" value={b.id} />
                  <SubmitButton
                    variant={borrowedNow ? "outline" : "default"}
                    className="h-10 w-full sm:w-40"
                    data-testid="toggle-status"
                  >
                    {borrowedNow ? t.adminMarkReturned : t.adminMarkBorrowed}
                  </SubmitButton>
                </form>
                <Button asChild variant="ghost" size="icon" className="size-10" aria-label={`${t.adminEdit} ${b.code}`}>
                  <Link href={`/admin/books/${b.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="size-10" aria-label={`${t.adminView} ${b.code}`}>
                  <Link href={`/book/${b.code}`} target="_blank">
                    <Eye className="size-4" />
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
        {!books.length && <li className="p-8 text-center text-sm text-muted-foreground">{t.noResults}</li>}
      </ul>
    </div>
  );
}
