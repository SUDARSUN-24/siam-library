import Link from "next/link";
import { Search, X } from "lucide-react";
import { AutoSubmitSelect } from "./auto-submit-select";
import { categoryLabel, type Dict, type Locale } from "@/lib/dict";
import type { SearchFilters } from "@/lib/validation";

type Props = {
  t: Dict;
  locale: Locale;
  filters: SearchFilters;
  shelves: { code: string; nameEn: string; nameTh: string }[];
  categories: string[];
};

/** Plain GET form → works without JavaScript; selects auto-submit when JS is on. */
export function SearchForm({ t, locale, filters, shelves, categories }: Props) {
  const hasFilters = Boolean(filters.q || filters.shelf || filters.category || filters.status);
  return (
    <form action="/" method="get" role="search" className="flex flex-col gap-3" id="search">
      <label htmlFor="q" className="sr-only">
        {t.searchLabel}
      </label>
      <div className="flex items-center gap-2 rounded-full border border-input bg-card p-1.5 pl-4 shadow-[0_2px_12px_-4px_rgba(29,36,51,.18)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={t.searchPlaceholder}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/80"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t.searchButton}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <AutoSubmitSelect name="shelf" defaultValue={filters.shelf ?? ""} aria-label={t.filterShelf}>
          <option value="">
            {t.filterShelf}: {t.filterAll}
          </option>
          {shelves.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code} · {locale === "th" ? s.nameTh : s.nameEn}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="status" defaultValue={filters.status ?? ""} aria-label={t.filterStatus}>
          <option value="">
            {t.filterStatus}: {t.filterAll}
          </option>
          <option value="AVAILABLE">{t.filterAvailable}</option>
          <option value="BORROWED">{t.filterBorrowed}</option>
        </AutoSubmitSelect>
        <AutoSubmitSelect
          name="category"
          defaultValue={filters.category ?? ""}
          aria-label={t.filterCategory}
          className="col-span-2 sm:col-span-1"
        >
          <option value="">
            {t.filterCategory}: {t.filterAll}
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c, locale)}
            </option>
          ))}
        </AutoSubmitSelect>
        {hasFilters && (
          <Link
            href="/#search"
            className="col-span-2 inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-sm text-muted-foreground hover:text-primary sm:col-span-1"
          >
            <X className="size-4" aria-hidden="true" />
            {t.clearFilters}
          </Link>
        )}
      </div>
    </form>
  );
}
