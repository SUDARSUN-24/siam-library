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
      {/* Hero: navy band with faint book spines; the search card overlaps its lower edge */}
      <section className="hero-navy on-dark relative overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 pt-10 pb-24 sm:pt-16 sm:pb-28">
          <p className="eyebrow mb-3 text-gold">{t.siteTagline}</p>
          <h1 className="font-serif text-[2rem] leading-tight font-semibold text-balance text-on-navy sm:text-5xl">{t.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-on-navy-muted sm:text-base">{t.heroSubtitle}</p>
        </div>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,var(--crimson)_0_70%,var(--gold)_70%_100%)]" aria-hidden="true" />
      </section>
      <div className="relative z-10 mx-auto -mt-16 max-w-3xl px-4 sm:-mt-20">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_24px_48px_-20px_rgba(29,36,51,.45),0_4px_12px_-4px_rgba(29,36,51,.12)] sm:p-5">
          <SearchBox t={t} action="/books" />
          <Link
            href="/books"
            className="group mt-3 ml-2 inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary hover:text-primary-hover"
            data-testid="browse-all"
          >
            {fmt(t.browseAll, { n: total.toLocaleString("en-US") })}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Shelves (white) */}
      <section id="shelves" className="scroll-mt-20 bg-background">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-14 sm:pb-12">
          <h2 className="section-title mb-5">{t.shelvesHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {shelves.map((s) => (
              <ShelfCard key={s.id} shelf={s} t={t} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories (light navy tint) */}
      {byCount.length > 0 && (
        <section id="categories" className="scroll-mt-20 bg-tint">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
            <h2 className="section-title mb-5">{t.categoriesHeading}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {byCount.map((c) => (
                <li key={c.slug}>
                  <CategoryTile name={c.name} count={c.count} t={t} locale={locale} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Rows: white / off-white / white */}
      <BookRow id="new" title={t.rowNewArrivals} seeAllHref="/books?sort=newest" books={rows.newArrivals} t={t} locale={locale} showPhotos={showPhotos} markNew />
      <BookRow id="available" title={t.rowAvailableNow} seeAllHref="/books?available=1" books={rows.availableNow} t={t} locale={locale} showPhotos={showPhotos} tone="cream" />
      <BookRow id="thai" title={t.rowThaiBooks} seeAllHref="/books?lang=th" books={rows.thaiBooks} t={t} locale={locale} showPhotos={showPhotos} />
    </>
  );
}
