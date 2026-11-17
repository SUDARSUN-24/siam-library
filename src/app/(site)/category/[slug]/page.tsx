import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
import { categoryStyle } from "@/components/category-tile";
import { SpineStrip } from "@/components/hero-illustration";
import { getCategoriesWithCounts } from "@/lib/books";
import { loadCatalogue } from "@/lib/catalogue-page";
import { categoryLabel, fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";

async function findCategory(params: Promise<{ slug: string }>) {
  const raw = (await params).slug;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    /* malformed %-escape: compare as-is (it will simply not match) */
  }
  slug = slug.slice(0, 80);
  return (await getCategoriesWithCounts()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const [category, { locale }] = await Promise.all([findCategory(params), getDict()]);
  return category ? { title: categoryLabel(category.name, locale) } : {};
}

/** All books of one category, with the catalogue filters and page numbers. */
export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const category = await findCategory(params);
  if (!category) notFound();
  const data = await loadCatalogue(searchParams, { category: category.slug });
  const { t, locale } = data;
  const label = categoryLabel(category.name, locale);
  const other = categoryLabel(category.name, locale === "th" ? "en" : "th");
  const { Icon, tone } = categoryStyle(category.name);

  return (
    <>
      <section className={`relative overflow-hidden border-b-4 border-black/5 ${tone.soft}`}>
        <SpineStrip className="pointer-events-none absolute right-4 bottom-0 hidden h-32 md:block lg:right-[max(1rem,calc((100vw-72rem)/2+1rem))]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-8">
          <Link href="/books" className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <div className="mt-5 flex items-center gap-4">
            <span className={`grid size-16 shrink-0 place-items-center rounded-2xl text-white shadow-(--shadow-card) sm:size-20 ${tone.solid}`} aria-hidden="true">
              <Icon className="size-8 sm:size-10" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow font-semibold text-primary">{t.category}</p>
              <h1 className="mt-1 font-serif text-[1.75rem] leading-tight font-bold sm:text-4xl">{label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {other !== label && <>{other} · </>}
                {category.count === 1 ? t.bookCount1 : fmt(t.booksCount, { n: category.count.toLocaleString("en-US") })}
              </p>
            </div>
          </div>
        </div>
      </section>
      <CatalogueView {...data} basePath={`/category/${encodeURIComponent(category.slug)}`} fixed={data.fixedKeys} />
    </>
  );
}
