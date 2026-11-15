import Link from "next/link";
import { Check, X } from "lucide-react";
import { catalogueHref, type CatalogueParams } from "@/lib/catalogue";
import { categoryLabel, type Dict, type Locale } from "@/lib/dict";
import type { CategoryCount } from "@/lib/books";
import { cn } from "@/lib/utils";

export type FilterPanelProps = {
  t: Dict;
  locale: Locale;
  basePath: string;
  params: CatalogueParams;
  fixed: (keyof CatalogueParams)[];
  shelves: { code: string; nameEn: string; nameTh: string; color: string; total: number }[];
  categories: CategoryCount[];
};

/** Number of filters the visitor chose (fixed path filters not counted). */
export function activeFilterCount({ params, fixed }: Pick<FilterPanelProps, "params" | "fixed">) {
  return (["shelf", "category", "lang", "available"] as const).filter((k) => params[k] && !fixed.includes(k)).length;
}

function Option({ href, active, children, testId }: { href: string; active: boolean; children: React.ReactNode; testId?: string }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        data-testid={testId}
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm lg:min-h-9",
          active ? "bg-primary/8 font-medium text-primary" : "text-foreground/85 hover:bg-muted hover:text-primary",
        )}
      >
        {children}
      </Link>
    </li>
  );
}

function Section({ title, children, scroll }: { title: string; children: React.ReactNode; scroll?: boolean }) {
  return (
    <section className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
      <h3 className="eyebrow mb-2 px-2.5 text-xs font-semibold text-muted-foreground">{title}</h3>
      <ul className={cn("flex flex-col gap-0.5", scroll && "max-h-72 overflow-y-auto overscroll-contain lg:max-h-80")}>{children}</ul>
    </section>
  );
}

/** Filters as plain links (no JS needed); used in the sidebar and in the phone bottom sheet. */
export function FilterPanel({ t, locale, basePath, params, fixed, shelves, categories }: FilterPanelProps) {
  const href = (o: Partial<CatalogueParams>) => catalogueHref(basePath, params, o, fixed);
  const count = (n: number) => <span className="ml-auto text-xs tabular-nums text-muted-foreground">{n}</span>;

  return (
    <div className="flex flex-col gap-4" data-testid="filter-panel">
      <Section title={t.filterStatus}>
        <Option href={href({ available: params.available ? undefined : true })} active={Boolean(params.available)} testId="filter-available">
          <span
            className={cn(
              "grid size-4.5 shrink-0 place-items-center rounded border",
              params.available ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
            )}
            aria-hidden="true"
          >
            {params.available && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          {t.filterAvailableOnly}
        </Option>
      </Section>

      <Section title={t.filterLanguage}>
        <Option href={href({ lang: undefined })} active={!params.lang}>
          {t.filterAll}
        </Option>
        <Option href={href({ lang: "th" })} active={params.lang === "th"} testId="filter-lang-th">
          {t.langTh}
        </Option>
        <Option href={href({ lang: "en" })} active={params.lang === "en"} testId="filter-lang-en">
          {t.langEn}
        </Option>
      </Section>

      {!fixed.includes("shelf") && (
        <Section title={t.filterShelf}>
          <Option href={href({ shelf: undefined })} active={!params.shelf}>
            {t.filterAll}
          </Option>
          {shelves.map((s) => (
            <Option key={s.code} href={href({ shelf: s.code })} active={params.shelf === s.code} testId={`filter-shelf-${s.code}`}>
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
              <span className="min-w-0 truncate">
                {s.code} · {locale === "th" ? s.nameTh : s.nameEn}
              </span>
              {count(s.total)}
            </Option>
          ))}
        </Section>
      )}

      {!fixed.includes("category") && (
        <Section title={t.filterCategory} scroll>
          <Option href={href({ category: undefined })} active={!params.category}>
            {t.filterAll}
          </Option>
          {categories.map((c) => (
            <Option key={c.slug} href={href({ category: c.slug })} active={params.category === c.slug} testId={`filter-category-${c.slug}`}>
              <span className="min-w-0 truncate">{categoryLabel(c.name, locale)}</span>
              {count(c.count)}
            </Option>
          ))}
        </Section>
      )}

      {activeFilterCount({ params, fixed }) > 0 && (
        <Link
          href={catalogueHref(basePath, { q: params.q, sort: params.sort }, {}, fixed)}
          className="inline-flex h-10 items-center gap-1 self-start rounded-full px-2.5 text-sm text-muted-foreground hover:text-primary"
        >
          <X className="size-4" aria-hidden="true" />
          {t.clearFilters}
        </Link>
      )}
    </div>
  );
}
