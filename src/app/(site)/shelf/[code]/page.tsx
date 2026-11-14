import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookGrid } from "@/components/book-card";
import { canViewPreview } from "@/lib/access";
import { getViewerSession } from "@/lib/auth-session";
import { BookQr } from "@/components/book-qr";
import { getShelfByCode } from "@/lib/books";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { shelfCodeSchema } from "@/lib/validation";

async function load(params: Promise<{ code: string }>) {
  const parsed = shelfCodeSchema.safeParse((await params).code);
  return parsed.success ? getShelfByCode(parsed.data) : null;
}

export async function generateMetadata({ params }: PageProps<"/shelf/[code]">): Promise<Metadata> {
  const shelf = await load(params);
  return shelf ? { title: `${shelf.code} · ${shelf.nameEn}` } : {};
}

export default async function ShelfPage({ params }: PageProps<"/shelf/[code]">) {
  const shelf = await load(params);
  if (!shelf) notFound();
  const [{ locale, t }, session] = await Promise.all([getDict(), getViewerSession()]);
  const showPhotos = canViewPreview(session);

  const rows = [...new Set(shelf.books.map((b) => b.row))].sort((a, b) => a - b);
  const available = shelf.books.filter((b) => b.status === "AVAILABLE").length;

  return (
    <>
      <section className="border-b border-border/70" style={{ background: `linear-gradient(180deg, ${shelf.color}14, transparent)` }}>
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-xl font-serif text-3xl font-semibold text-[#fdf8ee] sm:size-20 sm:text-4xl"
              style={{ background: shelf.color }}
            >
              {shelf.code}
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-muted-foreground">
                {fmt(t.shelfHeading, { code: shelf.code })}
              </p>
              <h1 className="font-serif text-2xl leading-tight font-semibold sm:text-3xl">
                {locale === "th" ? shelf.nameTh : shelf.nameEn}
              </h1>
              <p className="text-sm text-muted-foreground">
                {locale === "th" ? shelf.nameEn : shelf.nameTh} ·{" "}
                {fmt(t.booksCount, { n: shelf.books.length })} ·{" "}
                <span className="text-available">{fmt(t.availableCount, { n: available })}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {rows.map((row) => (
          <section key={row} className="pt-9">
            <h2 className="mb-4 flex items-center gap-3 font-serif text-lg font-semibold">
              {fmt(t.shelfRowHeading, { row })}
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </h2>
            <BookGrid books={shelf.books.filter((b) => b.row === row)} t={t} locale={locale} showPhotos={showPhotos} />
          </section>
        ))}
        <div className="mt-12 max-w-md">
          <BookQr path={`/shelf/${shelf.code}`} label={t.scanToOpen} code={shelf.code} />
        </div>
      </div>
    </>
  );
}
