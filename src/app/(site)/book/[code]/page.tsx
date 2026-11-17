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
import { categoryPath } from "@/lib/catalogue";
import { shelfInk } from "@/lib/colors";
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

  const details: [string, React.ReactNode][] = [
    [t.author, book.author],
    [
      t.category,
      <Link key="c" href={categoryPath(book.category)} className="text-primary underline-offset-4 hover:text-primary-hover hover:underline">
        {categoryLabel(book.category, locale)}
      </Link>,
    ],
    [t.language, book.language === "th" ? t.langTh : t.langEn],
    [t.year, book.year ? (locale === "th" ? `${book.year + 543} (${book.year})` : book.year) : null],
    [t.publisher, book.publisher],
    [t.isbn, book.isbn],
    [t.bookCode, book.code],
  ];

  const ink = shelfInk(book.shelf.color);

  return (
    <>
      {/* Header strip in the shelf colour */}
      <section className="on-dark relative overflow-hidden text-white" style={{ background: ink }}>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.07]"
          style={{
            background:
              "repeating-linear-gradient(90deg,#fff 0 14px,transparent 14px 20px,#fff 20px 28px,transparent 28px 38px,#fff 38px 54px,transparent 54px 61px)",
            maskImage: "linear-gradient(90deg,transparent,#000 60%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-7 lg:pb-10">
          <Link href="/books" className="no-print inline-flex items-center gap-1 rounded-sm text-sm text-white/85 underline-offset-4 hover:text-white hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_508px] lg:gap-x-12">
            {/* Summary */}
            <div className="flex gap-4 sm:gap-6">
              <div className="w-28 shrink-0 sm:w-36">
                <BookCover
                  code={book.code}
                  title={book.title}
                  author={book.author}
                  color={book.shelf.color}
                  imageUrl={firstPhoto && allowed ? uploadUrl(firstPhoto) : null}
                  priority
                  className="ring-1 ring-white/25"
                />
              </div>
              <div className="flex min-w-0 flex-col items-start gap-2">
                <h1 lang={book.language} className="font-serif text-2xl leading-tight font-semibold text-balance text-white sm:text-3xl" data-testid="book-title">
                  {book.title}
                </h1>
                {book.altTitle && <p className="font-serif text-base text-white/85 italic">{book.altTitle}</p>}
                <p className="text-[15px] text-white/95">{book.author}</p>
                <div className="mt-1">
                  <StatusBadge status={book.status} dueDate={book.dueDate} t={t} locale={locale} size="lg" solid />
                </div>
                <Link
                  href={`/shelf/${book.shelf.code}`}
                  className="mt-1 inline-flex w-fit items-center gap-2.5 rounded-lg bg-white py-1.5 pr-3.5 pl-1.5 text-sm text-foreground shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
                  data-testid="book-location"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md text-white" style={{ background: ink }} aria-hidden="true">
                    <MapPin className="size-4" />
                  </span>
                  <span className="font-semibold">{location}</span>
                  <span className="hidden text-muted-foreground sm:inline">· {shelfName}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-x-12 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_508px]">
        {/* Viewer: on a darker panel so the paper page stands out; overlaps the strip on desktop */}
        <section className="relative lg:col-start-2 lg:row-start-1 lg:-mt-64" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="sr-only">
            {t.previewHeading}
          </h2>
          <div className="-mx-4 bg-viewer px-4 pt-6 pb-4 sm:mx-0 sm:mt-6 sm:rounded-2xl sm:p-6 sm:pb-4 lg:mt-0 lg:shadow-(--shadow-lift)">
            {!allowed ? (
              <div className="mx-auto flex aspect-[5/7] max-w-[460px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-input bg-paper p-8 text-center">
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
          </div>
        </section>

        {/* Details + QR */}
        <section className="flex flex-col gap-6 pt-8 lg:col-start-1 lg:row-start-1 lg:pt-10">
          <div>
            <h2 className="section-title mb-4">{t.details}</h2>
            <dl className="surface divide-y divide-border overflow-hidden rounded-xl">
              {details
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 font-medium break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <BookQr path={`/book/${book.code}`} label={t.scanToOpen} code={book.code} />
        </section>
      </div>
    </>
  );
}
