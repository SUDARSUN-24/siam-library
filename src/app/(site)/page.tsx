import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BookRow } from "@/components/book-row";
import { CategoryTile } from "@/components/category-tile";
import { SearchBox } from "@/components/search-box";
import { ShelfCard } from "@/components/shelf-card";
import { canViewPreview } from "@/lib/access";
import { getViewerSession } from "@/lib/auth-session";
import { getCategoriesWithCounts, getHomeRows, getShelvesWithCounts } from "@/lib/books";
import { catalogueHref, categorySlug } from "@/lib/catalogue";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { parseCatalogueParams } from "@/lib/validation";

/**
 * Home: a starting point, not the full list. Loads only the shelf/category counts (GROUP BY)
 * and 3 × 10 books, so it stays fast however big the catalogue gets.
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  // Old links (/?q=…&shelf=…&status=…) → the catalogue with the same filters.
  const raw = await searchParams;
  if (["q", "shelf", "category", "status"].some((k) => raw[k] !== undefined)) {
    const p = parseCatalogueParams(raw);
    redirect(catalogueHref("/books", { ...p, category: p.category && categorySlug(p.category) }));
  }

  const [{ locale, t }, shelves, categories, rows, session] = await Promise.all([
    getDict(),
    getShelvesWithCounts(),
    getCategoriesWithCounts(),
    getHomeRows(),
    getViewerSession(),
  ]);
  const showPhotos = canViewPreview(session);
  const total = shelves.reduce((n, s) => n + s.total, 0);
  const byCount = [...categories].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <>
      {/* Hero + search */}
      <section className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,#fffcf5_0%,transparent_70%)]">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
          <p className="eyebrow mb-3 text-primary">{t.siteTagline}</p>
          <h1 className="font-serif text-[2rem] leading-tight font-semibold text-balance sm:text-5xl">{t.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">{t.heroSubtitle}</p>
          <div className="mt-7">
            <SearchBox t={t} action="/books" />
          </div>
          <Link
            href="/books"
            className="group mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
            data-testid="browse-all"
          >
            {fmt(t.browseAll, { n: total.toLocaleString("en-US") })}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] px-4">
        {/* Shelves */}
        <section id="shelves" className="scroll-mt-20 pt-10">
          <h2 className="mb-4 font-serif text-xl font-semibold">{t.shelvesHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shelves.map((s) => (
              <ShelfCard key={s.id} shelf={s} t={t} locale={locale} />
            ))}
          </div>
        </section>

        {/* Categories */}
        {byCount.length > 0 && (
          <section id="categories" className="scroll-mt-20 pt-10">
            <h2 className="mb-4 font-serif text-xl font-semibold">{t.categoriesHeading}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {byCount.map((c) => (
                <li key={c.slug}>
                  <CategoryTile name={c.name} count={c.count} t={t} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Rows */}
        <BookRow id="new" title={t.rowNewArrivals} seeAllHref="/books?sort=newest" books={rows.newArrivals} t={t} locale={locale} showPhotos={showPhotos} />
        <BookRow id="available" title={t.rowAvailableNow} seeAllHref="/books?available=1" books={rows.availableNow} t={t} locale={locale} showPhotos={showPhotos} />
        <BookRow id="thai" title={t.rowThaiBooks} seeAllHref="/books?lang=th" books={rows.thaiBooks} t={t} locale={locale} showPhotos={showPhotos} />
      </div>
    </>
  );
}
