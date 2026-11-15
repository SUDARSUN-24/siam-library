import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
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

  return (
    <>
      <section className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,#fffcf5_0%,transparent_70%)]">
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-8 sm:pt-8">
          <Link href="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.backToBooks}
          </Link>
          <p className="eyebrow mt-5 text-primary">{t.category}</p>
          <h1 className="font-serif text-2xl leading-tight font-semibold sm:text-3xl">{label}</h1>
          <p className="text-sm text-muted-foreground">
            {other !== label && <>{other} · </>}
            {category.count === 1 ? t.bookCount1 : fmt(t.booksCount, { n: category.count.toLocaleString("en-US") })}
          </p>
        </div>
      </section>
      <CatalogueView {...data} basePath={`/category/${encodeURIComponent(category.slug)}`} fixed={data.fixedKeys} />
    </>
  );
}
