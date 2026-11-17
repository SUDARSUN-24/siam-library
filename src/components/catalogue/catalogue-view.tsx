import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { AutoSubmitSelect } from "../auto-submit-select";
import { BookGrid } from "../book-card";
import { FilterPanel, activeFilterCount, type FilterPanelProps } from "./filter-panel";
import { FilterSheet } from "./filter-sheet";
import { Pagination } from "./pagination";
import { catalogueHref, defaultSort, PAGE_SIZE, type Sort } from "@/lib/catalogue";
import { categoryLabel, fmt } from "@/lib/dict";
import type { CataloguePage } from "@/lib/books";
import { shelfInk, tint } from "@/lib/colors";

type Props = FilterPanelProps & {
  result: CataloguePage;
  showPhotos: boolean;
  /** Shelf pages in shelf order: put "Row n" headings between the books. */
  groupByRow?: boolean;
  /** Shelf pages: the shelf colour — each row is drawn as a tinted bookshelf with a wooden plank. */
  accent?: string;
};

/**
 * The catalogue layout shared by /books, /shelf/[code] and /category/[slug]:
 * filter sidebar (bottom sheet on phones) · result count + sort · grid · page numbers.
 */
export function CatalogueView(props: Props) {
  const { t, locale, basePath, params, fixed, categories, result, showPhotos, groupByRow, accent } = props;
  const { books, total, page, pageCount } = result;
  const sort: Sort = params.sort ?? defaultSort(params);
  const activeCount = activeFilterCount(props);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = from + books.length - 1;

  const sortOptions: [Sort, string][] = [
    ...(params.q ? ([["relevance", t.sortRelevance]] as [Sort, string][]) : []),
    ["shelf", t.sortShelf],
    ["title", t.sortTitle],
    ["newest", t.sortNewest],
  ];
  // hidden fields so changing the sort keeps the other filters (page resets to 1)
  const keep: Record<string, string> = {};
  if (params.q) keep.q = params.q;
  if (params.shelf && !fixed.includes("shelf")) keep.shelf = params.shelf;
  if (params.category && !fixed.includes("category")) keep.category = params.category;
  if (params.lang) keep.lang = params.lang;
  if (params.available) keep.available = "1";

  const chips: { label: string; href: string }[] = [];
  const remove = (o: Parameters<typeof catalogueHref>[2]) => catalogueHref(basePath, params, o, fixed);
  if (params.available) chips.push({ label: t.filterAvailableOnly, href: remove({ available: undefined }) });
  if (params.lang) chips.push({ label: params.lang === "th" ? t.langTh : t.langEn, href: remove({ lang: undefined }) });
  if (params.shelf && !fixed.includes("shelf")) chips.push({ label: fmt(t.shelfHeading, { code: params.shelf }), href: remove({ shelf: undefined }) });
  const cat = categories.find((c) => c.slug === params.category);
  if (cat && !fixed.includes("category")) chips.push({ label: categoryLabel(cat.name, locale), href: remove({ category: undefined }) });

  const rows = groupByRow ? [...new Set(books.map((b) => b.row))] : [];
  const panel = <FilterPanel {...props} />;

  return (
    <div className="bg-page">
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-6 pb-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:pt-8">
      <aside className="hidden lg:block" aria-label={t.filtersHeading}>
        <div className="sticky top-22 overflow-hidden rounded-xl border border-input border-t-4 border-t-primary bg-card p-4 shadow-(--shadow-card)">
          <h2 className="mb-4 flex items-center gap-2 border-b border-border pb-3 font-sans text-sm font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
              <SlidersHorizontal className="size-4" />
            </span>
            {t.filtersHeading}
          </h2>
          {panel}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            <span data-testid="result-count" className="inline-flex items-center rounded-full bg-sky-soft px-3 py-1 font-semibold text-hue-blue">
              {total === 1 ? t.bookCount1 : fmt(t.booksCount, { n: total.toLocaleString("en-US") })}
            </span>
            {pageCount > 1 && books.length > 0 && (
              <span className="hidden sm:inline">
                {" "}
                · {fmt(t.showingRange, { from, to, n: total.toLocaleString("en-US") })}
              </span>
            )}
          </p>
          <FilterSheet
            label={t.filtersHeading}
            closeLabel={t.filtersClose}
            showLabel={fmt(t.filtersShow, { n: total.toLocaleString("en-US") })}
            activeCount={activeCount}
          >
            {panel}
          </FilterSheet>
          <form action={basePath} method="get" className="flex items-center gap-2">
            {Object.entries(keep).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <label htmlFor="sort" className="sr-only">
              {t.sortLabel}
            </label>
            <AutoSubmitSelect id="sort" name="sort" defaultValue={sort} key={sort} data-testid="sort-select">
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {t.sortLabel}: {label}
                </option>
              ))}
            </AutoSubmitSelect>
            <noscript>
              <button type="submit" className="h-10 rounded-full border border-input px-4 text-sm">
                {t.sortApply}
              </button>
            </noscript>
          </form>
        </div>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" data-testid="filter-chips">
            {chips.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  aria-label={fmt(t.removeFilter, { name: c.label })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary pr-2 pl-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
                >
                  {c.label}
                  <span className="grid size-4.5 place-items-center rounded-full bg-white/20">
                    <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-6">
          {books.length > 0 ? (
            groupByRow ? (
              rows.map((row) => {
                const inRow = books.filter((b) => b.row === row);
                return accent ? (
                  <section key={row} className="mb-6 rounded-2xl border border-black/5 p-3 pb-0 sm:p-4 sm:pb-0" style={{ background: tint(accent, 0.92) }}>
                    <div className="mb-3 flex items-center gap-3">
                      <h2 className="rounded-lg px-3 py-1 font-serif text-base font-bold text-white shadow-sm" style={{ background: shelfInk(accent) }}>
                        {fmt(t.shelfRowHeading, { row })}
                      </h2>
                      <span className="text-sm font-medium text-muted-foreground">
                        {inRow.length === 1 ? t.bookCount1 : fmt(t.booksCount, { n: inRow.length })}
                      </span>
                    </div>
                    <BookGrid books={inRow} t={t} locale={locale} showPhotos={showPhotos} withSidebar />
                    {/* the wooden plank the books stand on */}
                    <div className="-mx-3 mt-4 h-3 rounded-b-2xl bg-wood shadow-[inset_0_-3px_0_var(--wood-dark)] sm:-mx-4" aria-hidden="true" />
                  </section>
                ) : (
                  <section key={row} className="pb-9">
                    <h2 className="mb-4 flex items-center gap-3 font-serif text-lg font-semibold">
                      <span className="h-5 w-1.5 rounded-full bg-sun" aria-hidden="true" />
                      {fmt(t.shelfRowHeading, { row })}
                      <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    </h2>
                    <BookGrid books={inRow} t={t} locale={locale} showPhotos={showPhotos} withSidebar />
                  </section>
                );
              })
            ) : (
              <BookGrid books={books} t={t} locale={locale} showPhotos={showPhotos} withSidebar />
            )
          ) : (
            <div className="rounded-xl border border-dashed border-input bg-card px-6 py-14 text-center">
              {total > 0 ? (
                <>
                  <p className="font-serif text-lg font-semibold">{t.pageEmpty}</p>
                  <Link href={catalogueHref(basePath, params, { page: undefined }, fixed)} className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
                    {t.pageFirst}
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-serif text-lg font-semibold">{t.noResults}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.noResultsHint}</p>
                </>
              )}
            </div>
          )}
        </div>

        <Pagination t={t} basePath={basePath} params={params} fixed={fixed} page={page} pageCount={pageCount} />
      </div>
    </div>
    </div>
  );
}
