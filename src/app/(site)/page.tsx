import { BookGrid } from "@/components/book-card";
import { SearchForm } from "@/components/search-form";
import { ShelfCard } from "@/components/shelf-card";
import { getCategories, getShelvesWithCounts, searchBooks } from "@/lib/books";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { searchParamsSchema } from "@/lib/validation";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filters = searchParamsSchema.parse({
    q: one(raw.q),
    shelf: one(raw.shelf),
    category: one(raw.category),
    status: one(raw.status),
  });

  const [{ locale, t }, shelves, categories, books] = await Promise.all([
    getDict(),
    getShelvesWithCounts(),
    getCategories(),
    searchBooks(filters),
  ]);
  const filtered = Boolean(filters.q || filters.shelf || filters.category || filters.status);

  return (
    <>
      {/* Hero + search */}
      <section className="border-b border-border/70 bg-[radial-gradient(ellipse_at_top,#fffcf5_0%,transparent_70%)]">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
          <p className="eyebrow mb-3 text-primary">{t.siteTagline}</p>
          <h1 className="font-serif text-[2rem] leading-tight font-semibold text-balance sm:text-5xl">{t.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">{t.heroSubtitle}</p>
          <div className="mt-7">
            <SearchForm t={t} locale={locale} filters={filters} shelves={shelves} categories={categories} />
          </div>
        </div>
      </section>

      {/* Shelves */}
      {!filtered && (
        <section id="shelves" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10">
          <h2 className="mb-4 font-serif text-xl font-semibold">{t.shelvesHeading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shelves.map((s) => (
              <ShelfCard key={s.id} shelf={s} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Books */}
      <section className="mx-auto max-w-6xl px-4 pt-10" aria-live="polite">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold">
            {filters.q ? (
              <>
                {t.resultsFor} <span className="text-primary">“{filters.q}”</span>
              </>
            ) : (
              t.booksHeading
            )}
          </h2>
          <span className="shrink-0 text-sm text-muted-foreground" data-testid="result-count">
            {books.length === 1 ? t.bookCount1 : fmt(t.booksCount, { n: books.length })}
          </span>
        </div>
        {books.length ? (
          <BookGrid books={books} t={t} locale={locale} />
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-serif text-lg font-semibold">{t.noResults}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.noResultsHint}</p>
          </div>
        )}
      </section>
    </>
  );
}
