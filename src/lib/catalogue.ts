/**
 * Catalogue URL state (pure — safe in client components).
 * Filters, sort and page all live in the URL: /books?q=&shelf=&category=&lang=&available=1&sort=&page=
 * Shelf pages (/shelf/A) and category pages (/category/<slug>) use the same parameters with
 * their own filter fixed by the path.
 */

export const PAGE_SIZE = 24;
export const SORTS = ["relevance", "shelf", "title", "newest"] as const;
export type Sort = (typeof SORTS)[number];

export type CatalogueParams = {
  q?: string;
  shelf?: string; // shelf code, e.g. "A"
  category?: string; // category SLUG, e.g. "software-engineering"
  lang?: "th" | "en";
  available?: boolean;
  sort?: Sort; // undefined = default (relevance with q, shelf order without)
  page?: number; // 1-based, undefined = 1
};

export function defaultSort(p: Pick<CatalogueParams, "q">): Sort {
  return p.q ? "relevance" : "shelf";
}

/** "Software Engineering" → "software-engineering". Keeps Thai letters and marks. */
export function categorySlug(category: string) {
  return category
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryPath(category: string) {
  return `/category/${encodeURIComponent(categorySlug(category))}`;
}

/**
 * Build a catalogue link: current params + overrides (undefined removes a key).
 * Changing anything but the page resets to page 1. Keys fixed by the path are left out.
 */
export function catalogueHref(
  basePath: string,
  current: CatalogueParams,
  overrides: Partial<Record<keyof CatalogueParams, CatalogueParams[keyof CatalogueParams] | undefined>> = {},
  fixed: (keyof CatalogueParams)[] = [],
) {
  const next: CatalogueParams = { ...current, ...overrides } as CatalogueParams;
  if (!("page" in overrides)) next.page = undefined;
  if (next.sort && next.sort === defaultSort(next)) next.sort = undefined;
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.shelf && !fixed.includes("shelf")) sp.set("shelf", next.shelf);
  if (next.category && !fixed.includes("category")) sp.set("category", next.category);
  if (next.lang) sp.set("lang", next.lang);
  if (next.available) sp.set("available", "1");
  if (next.sort) sp.set("sort", next.sort);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Page numbers to show: 1 … 4 5 [6] 7 8 … 20  ("gap" = ellipsis). */
export function pageWindow(page: number, pageCount: number, around = 1): (number | "gap")[] {
  const out: (number | "gap")[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= around) out.push(n);
    else if (out[out.length - 1] !== "gap") out.push("gap");
  }
  return out;
}
