import type { Metadata } from "next";
import { CatalogueView } from "@/components/catalogue/catalogue-view";
import { SearchBox } from "@/components/search-box";
import { loadCatalogue } from "@/lib/catalogue-page";
import { getDict } from "@/lib/i18n";

export async function generateMetadata({ searchParams }: PageProps<"/books">): Promise<Metadata> {
  const { t } = await getDict();
  const q = (await searchParams).q;
  return { title: typeof q === "string" && q.trim() ? `${t.resultsFor} “${q.trim().slice(0, 100)}”` : t.catalogueTitle };
}

/** The full catalogue: search results, filters, sort and page numbers — all in the URL. */
export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const data = await loadCatalogue(searchParams);
  const { t, params } = data;

  // a new search keeps the chosen filters but not the page
  const keep: Record<string, string> = {};
  if (params.shelf) keep.shelf = params.shelf;
  if (params.category) keep.category = params.category;
  if (params.lang) keep.lang = params.lang;
  if (params.available) keep.available = "1";

  return (
    <>
      <section className="border-b-4 border-hue-blue/15 bg-sky-soft">
        <div className="mx-auto max-w-6xl px-4 pt-7 pb-7 sm:pt-10 sm:pb-8">
          <h1 className="font-serif text-[1.75rem] leading-tight font-bold sm:text-4xl" data-testid="catalogue-heading">
            {params.q ? (
              <>
                {t.resultsFor} <span className="text-primary">“{params.q}”</span>
              </>
            ) : (
              t.catalogueTitle
            )}
          </h1>
          <span className="mt-3 block h-[3px] w-12 rounded-full bg-[linear-gradient(90deg,var(--crimson)_0_60%,var(--sun)_60%_100%)]" aria-hidden="true" />
          <div className="mt-5 max-w-2xl">
            <SearchBox t={t} action="/books" defaultValue={params.q ?? ""} hidden={keep} compact key={params.q ?? ""} />
          </div>
        </div>
      </section>
      <CatalogueView {...data} basePath="/books" fixed={data.fixedKeys} />
    </>
  );
}
