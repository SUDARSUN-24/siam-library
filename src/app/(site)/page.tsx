import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, LibraryBig, MapPin } from "lucide-react";
import { BookRow } from "@/components/book-row";
import { CategoryTile } from "@/components/category-tile";
import { HeroIllustration } from "@/components/hero-illustration";
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

  const steps = [
    { icon: BookOpen, title: t.step1Title, body: t.step1Body, color: "text-hue-blue", bg: "bg-sky-soft" },
    { icon: MapPin, title: t.step2Title, body: t.step2Body, color: "text-hue-teal", bg: "bg-mint-soft" },
    { icon: LibraryBig, title: t.step3Title, body: t.step3Body, color: "text-hue-raspberry", bg: "bg-rose-soft" },
  ];

  return (
    <>
      {/* Hero: sunny and light, an illustrated bookshelf, the search card as the clear focus */}
      <section className="relative overflow-hidden bg-sun-soft">
        <span className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-white/60" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full bg-rose-soft/70 lg:hidden" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-6 px-4 pt-9 pb-8 sm:pt-14 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="min-w-0">
            <p className="eyebrow mb-3 inline-flex items-center gap-2 font-semibold text-primary">
              <span className="size-2 rounded-full bg-sun" aria-hidden="true" />
              {t.siteTagline}
            </p>
            <h1 className="font-serif text-[2.1rem] leading-tight font-bold text-balance sm:text-5xl">{t.heroTitle}</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">{t.heroSubtitle}</p>
            <div className="mt-6 rounded-2xl border border-border bg-card p-3 shadow-[0_20px_44px_-18px_rgba(196,30,58,.35),0_4px_12px_-4px_rgba(29,36,51,.1)] sm:p-4">
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
          <HeroIllustration className="hidden w-full lg:block" />
        </div>

        {/* How it works */}
        <div className="relative mx-auto max-w-6xl px-4 pb-10 sm:pb-12">
          <h2 className="sr-only">{t.stepsHeading}</h2>
          <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {steps.map(({ icon: Icon, title, body, color, bg }, i) => (
              <li key={i} className="surface flex items-start gap-3 rounded-xl p-3.5 sm:p-4">
                <span className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${bg} ${color}`}>
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-sun text-[11px] font-bold text-foreground" aria-hidden="true">
                    {i + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-serif text-[15px] font-bold">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <span className="absolute inset-x-0 bottom-0 flex h-1.5" aria-hidden="true">
          <span className="flex-1 bg-hue-blue" />
          <span className="flex-1 bg-sun" />
          <span className="flex-1 bg-hue-raspberry" />
          <span className="flex-1 bg-hue-teal" />
          <span className="flex-1 bg-primary" />
        </span>
      </section>

      {/* Shelves (white, cards in the bright shelf colours) */}
      <section id="shelves" className="scroll-mt-20 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <h2 className="section-title mb-5">{t.shelvesHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {shelves.map((s) => (
              <ShelfCard key={s.id} shelf={s} t={t} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories (sky) */}
      {byCount.length > 0 && (
        <section id="categories" className="scroll-mt-20 bg-sky-soft">
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

      {/* Rows, each on its own bright tint */}
      <BookRow id="new" title={t.rowNewArrivals} seeAllHref="/books?sort=newest" books={rows.newArrivals} t={t} locale={locale} showPhotos={showPhotos} tone="rose" markNew />
      <BookRow id="available" title={t.rowAvailableNow} seeAllHref="/books?available=1" books={rows.availableNow} t={t} locale={locale} showPhotos={showPhotos} tone="mint" />
      <BookRow id="thai" title={t.rowThaiBooks} seeAllHref="/books?lang=th" books={rows.thaiBooks} t={t} locale={locale} showPhotos={showPhotos} tone="lilac" />
    </>
  );
}
