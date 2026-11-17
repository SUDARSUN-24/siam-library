import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookQr } from "@/components/book-qr";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
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

  return (
    <>
      <section className="relative overflow-hidden border-b-4" style={{ background: tint(shelf.color), borderBottomColor: ink }}>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.12]"
          style={{
            background: `repeating-linear-gradient(90deg,${ink} 0 14px,transparent 14px 20px,${ink} 20px 28px,transparent 28px 38px,${ink} 38px 54px,transparent 54px 61px)`,
            maskImage: "linear-gradient(90deg,transparent,#000 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-7 sm:pb-10">
          <Link href="/books" className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-xl font-serif text-3xl font-bold text-white shadow-(--shadow-card) sm:size-20 sm:text-4xl"
              style={{ background: ink }}
            >
              {shelf.code}
            </span>
            <div className="min-w-0">
              <p className="eyebrow font-semibold" style={{ color: readableOn(shelf.color, tint(shelf.color)) }}>{fmt(t.shelfHeading, { code: shelf.code })}</p>
              <h1 className="font-serif text-[1.75rem] leading-tight font-bold sm:text-4xl">
                {locale === "th" ? shelf.nameTh : shelf.nameEn}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === "th" ? shelf.nameEn : shelf.nameTh} · {fmt(t.booksCount, { n: (counts?.total ?? 0).toLocaleString("en-US") })} ·{" "}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-available shadow-sm">{fmt(t.availableCount, { n: (counts?.available ?? 0).toLocaleString("en-US") })}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-page">
        <CatalogueView {...data} basePath={`/shelf/${shelf.code}`} fixed={data.fixedKeys} groupByRow={data.sort === "shelf"} />

      <div className="mx-auto -mt-4 max-w-6xl px-4 pb-16">
        <div className="max-w-md">
          <BookQr path={`/shelf/${shelf.code}`} label={t.scanToOpen} code={shelf.code} />
        </div>
      </div>
      </div>
    </>
  );
}
