import "server-only";
import { canViewPreview } from "./access";
import { getViewerSession } from "./auth-session";
import { findCatalogue, getCategoriesWithCounts, getShelvesWithCounts } from "./books";
import { defaultSort, type CatalogueParams } from "./catalogue";
import { getDict } from "./i18n";
import { parseCatalogueParams } from "./validation";

/**
 * Everything a catalogue page (/books, /shelf/[code], /category/[slug]) needs.
 * `fixed` = filters set by the path (they override the query string).
 */
export async function loadCatalogue(
  rawSearchParams: Promise<Record<string, string | string[] | undefined>>,
  fixed: Partial<Pick<CatalogueParams, "shelf" | "category">> = {},
) {
  const params: CatalogueParams = { ...parseCatalogueParams(await rawSearchParams), ...fixed };
  const [dict, shelves, categories, session] = await Promise.all([
    getDict(),
    getShelvesWithCounts(),
    getCategoriesWithCounts(),
    getViewerSession(),
  ]);

  // ?category= is a slug; an unknown slug is dropped (like any other bad parameter)
  const category = categories.find((c) => c.slug === params.category);
  if (!category) params.category = undefined;
  if (params.shelf && !shelves.some((s) => s.code === params.shelf)) params.shelf = undefined;
  if (params.sort === "relevance" && !params.q) params.sort = undefined;

  const sort = params.sort ?? defaultSort(params);
  const result = await findCatalogue(
    { q: params.q, shelf: params.shelf, category: category?.name, lang: params.lang, available: params.available },
    sort,
    params.page ?? 1,
  );

  return {
    ...dict,
    params,
    fixedKeys: Object.keys(fixed) as (keyof CatalogueParams)[],
    shelves,
    categories,
    category,
    result,
    sort,
    showPhotos: canViewPreview(session),
  };
}
