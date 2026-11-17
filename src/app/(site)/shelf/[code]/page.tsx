import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookCopy } from "lucide-react";
import { BookQr } from "@/components/book-qr";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
import { ShelfArt } from "@/components/hero-illustration";
import { getShelfByCode } from "@/lib/books";
import { loadCatalogue } from "@/lib/catalogue-page";
import { readableOn, shelfInk, tint } from "@/lib/colors";
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
  const ink = shelfInk(shelf.color);

  const soft = tint(shelf.color);
  const total = (counts?.total ?? 0).toLocaleString("en-US");
  const available = (counts?.available ?? 0).toLocaleString("en-US");

  return (
    <>
      <section className="relative overflow-hidden border-b-4" style={{ background: soft, borderBottomColor: ink }}>
        <span className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-white/50" aria-hidden="true" />
        <ShelfArt color={ink} className="pointer-events-none absolute right-4 bottom-0 hidden h-40 md:block lg:right-[max(1rem,calc((100vw-72rem)/2+1rem))]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-7 sm:pb-10">
          <Link href="/books" className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <div className="mt-5 flex items-center gap-4 md:pr-64">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-2xl font-serif text-3xl font-bold text-white shadow-(--shadow-lift) ring-4 ring-white sm:size-20 sm:text-4xl"
              style={{ background: ink }}
            >
              {shelf.code}
            </span>
            <div className="min-w-0">
              <p className="eyebrow font-semibold" style={{ color: readableOn(shelf.color, soft) }}>
                {fmt(t.shelfHeading, { code: shelf.code })}
              </p>
              <h1 className="font-serif text-[1.75rem] leading-tight font-bold sm:text-4xl">{locale === "th" ? shelf.nameTh : shelf.nameEn}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{locale === "th" ? shelf.nameEn : shelf.nameTh}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-sm" style={{ color: ink }}>
              <BookCopy className="size-4" aria-hidden="true" />
              {fmt(t.booksCount, { n: total })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-available shadow-sm">
              <span className="size-2 rounded-full bg-available" aria-hidden="true" />
              {fmt(t.availableCount, { n: available })}
            </span>
          </div>
        </div>
      </section>

      <div className="bg-page">
        <CatalogueView
          {...data}
          basePath={`/shelf/${shelf.code}`}
          fixed={data.fixedKeys}
          groupByRow={data.sort === "shelf"}
          accent={shelf.color}
        />
        <div className="mx-auto -mt-4 max-w-6xl px-4 pb-16">
          <div className="max-w-md">
            <BookQr path={`/shelf/${shelf.code}`} label={t.scanToOpen} code={shelf.code} accent={shelf.color} />
          </div>
        </div>
      </div>
    </>
  );
}
