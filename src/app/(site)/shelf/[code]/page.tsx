import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookQr } from "@/components/book-qr";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
import { getShelfByCode } from "@/lib/books";
import { loadCatalogue } from "@/lib/catalogue-page";
import { fmt } from "@/lib/dict";
import { shelfCodeSchema } from "@/lib/validation";

async function load(params: Promise<{ code: string }>) {
  const parsed = shelfCodeSchema.safeParse((await params).code);
  return parsed.success ? getShelfByCode(parsed.data) : null;
}

export async function generateMetadata({ params }: PageProps<"/shelf/[code]">): Promise<Metadata> {
  const shelf = await load(params);
  return shelf ? { title: `${shelf.code} · ${shelf.nameEn}` } : {};
}

/** A shelf (QR sticker target): its books in shelf order, 24 per page, with the catalogue filters. */
export default async function ShelfPage({ params, searchParams }: PageProps<"/shelf/[code]">) {
  const shelf = await load(params);
  if (!shelf) notFound();
  const data = await loadCatalogue(searchParams, { shelf: shelf.code });
  const { t, locale } = data;
  const counts = data.shelves.find((s) => s.code === shelf.code);

  return (
    <>
      <section className="border-b border-border/70" style={{ background: `linear-gradient(180deg, ${shelf.color}14, transparent)` }}>
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-8">
          <Link href="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
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
              <p className="eyebrow text-muted-foreground">{fmt(t.shelfHeading, { code: shelf.code })}</p>
              <h1 className="font-serif text-2xl leading-tight font-semibold sm:text-3xl">
                {locale === "th" ? shelf.nameTh : shelf.nameEn}
              </h1>
              <p className="text-sm text-muted-foreground">
                {locale === "th" ? shelf.nameEn : shelf.nameTh} · {fmt(t.booksCount, { n: (counts?.total ?? 0).toLocaleString("en-US") })} ·{" "}
                <span className="text-available">{fmt(t.availableCount, { n: (counts?.available ?? 0).toLocaleString("en-US") })}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <CatalogueView {...data} basePath={`/shelf/${shelf.code}`} fixed={data.fixedKeys} groupByRow={data.sort === "shelf"} />

      <div className="mx-auto mt-12 max-w-6xl px-4">
        <div className="max-w-md">
          <BookQr path={`/shelf/${shelf.code}`} label={t.scanToOpen} code={shelf.code} />
        </div>
      </div>
    </>
  );
}
