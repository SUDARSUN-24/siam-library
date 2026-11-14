import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, MapPin } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { PreviewViewer, type ViewerPage } from "@/components/preview-viewer";
import { StatusBadge } from "@/components/status-badge";
import { canViewPreview } from "@/lib/access";
import { getViewerSession } from "@/lib/auth-session";
import { getBookByCode, uploadUrl } from "@/lib/books";
import { config } from "@/lib/config";
import { categoryLabel, fmt, formatDate } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { bookCodeSchema } from "@/lib/validation";
import { BookQr } from "@/components/book-qr";

async function load(params: Promise<{ code: string }>) {
  const parsed = bookCodeSchema.safeParse(decodeURIComponent((await params).code));
  if (!parsed.success) return null;
  return getBookByCode(parsed.data);
}

export async function generateMetadata({ params }: PageProps<"/book/[code]">): Promise<Metadata> {
  const book = await load(params);
  return book ? { title: book.title, description: `${book.title} — ${book.author}` } : {};
}

export default async function BookPage({ params }: PageProps<"/book/[code]">) {
  const book = await load(params);
  if (!book) notFound();

  const [{ locale, t }, session] = await Promise.all([getDict(), getViewerSession()]);
  const allowed = canViewPreview(session);
  const location = fmt(t.shelfRow, { shelf: book.shelf.code, row: book.row });
  const shelfName = locale === "th" ? book.shelf.nameTh : book.shelf.nameEn;
  const firstPhoto = book.pages[0]?.type === "IMAGE" ? book.pages[0].imagePath : null;

  const pages: ViewerPage[] = allowed
    ? book.pages.map((p) => ({
        id: p.id,
        type: p.type,
        text: p.type === "TEXT" ? p.text : null,
        imageUrl: p.type === "IMAGE" && p.imagePath ? uploadUrl(p.imagePath) : null,
      }))
    : [];

  const details: [string, string | number | null | undefined][] = [
    [t.author, book.author],
    [t.category, categoryLabel(book.category, locale)],
    [t.language, book.language === "th" ? t.langTh : t.langEn],
    [t.year, book.year ? (locale === "th" ? `${book.year + 543} (${book.year})` : book.year) : null],
    [t.publisher, book.publisher],
    [t.isbn, book.isbn],
    [t.bookCode, book.code],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-4 sm:pt-8">
      <Link href="/" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.backToBooks}
      </Link>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-x-14">
        {/* Summary */}
        <section className="flex gap-4 sm:gap-6 lg:col-start-1 lg:row-start-1">
          <div className="w-28 shrink-0 sm:w-36">
            <BookCover
              code={book.code}
              title={book.title}
              author={book.author}
              color={book.shelf.color}
              imageUrl={firstPhoto && allowed ? uploadUrl(firstPhoto) : null}
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-2xl leading-tight font-semibold text-balance sm:text-3xl" data-testid="book-title">
              {book.title}
            </h1>
            {book.altTitle && <p className="font-serif text-base text-muted-foreground italic">{book.altTitle}</p>}
            <p className="text-[15px]">{book.author}</p>
            <div className="mt-1">
              <StatusBadge status={book.status} dueDate={book.dueDate} t={t} locale={locale} size="lg" />
            </div>
            <Link
              href={`/shelf/${book.shelf.code}`}
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/40"
              data-testid="book-location"
            >
              <MapPin className="size-4 text-crimson" aria-hidden="true" />
              <span className="font-semibold">{location}</span>
              <span className="hidden text-muted-foreground sm:inline">· {shelfName}</span>
            </Link>
          </div>
        </section>

        {/* Viewer */}
        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="sr-only">
            {t.previewHeading}
          </h2>
          {!allowed ? (
            <div className="flex aspect-[5/7] max-w-[460px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-paper p-8 text-center">
              <Lock className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t.previewLocked}</p>
            </div>
          ) : (
            <PreviewViewer
              locale={locale}
              pages={pages}
              book={{ code: book.code, title: book.title, author: book.author, color: book.shelf.color }}
              bookLanguage={book.language}
              location={location}
              available={book.status === "AVAILABLE"}
              dueDateLabel={book.dueDate ? formatDate(book.dueDate, locale) : null}
              loanDays={config.loanDays}
            />
          )}
        </section>

        {/* Details + QR */}
        <section className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <div>
            <h2 className="mb-3 font-serif text-lg font-semibold">{t.details}</h2>
            <dl className="divide-y divide-border rounded-xl border border-border bg-card">
              {details
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <BookQr path={`/book/${book.code}`} label={t.scanToOpen} code={book.code} />
        </section>
      </div>
    </div>
  );
}
