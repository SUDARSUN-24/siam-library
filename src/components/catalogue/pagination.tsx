import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogueHref, pageWindow, type CatalogueParams } from "@/lib/catalogue";
import { fmt, type Dict } from "@/lib/dict";
import { cn } from "@/lib/utils";

type Props = {
  t: Dict;
  basePath: string;
  params: CatalogueParams;
  fixed: (keyof CatalogueParams)[];
  page: number;
  pageCount: number;
};

const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm";

/** Page links (plain <a>, works without JS): ‹ 1 … 4 [5] 6 … 20 › */
export function Pagination({ t, basePath, params, fixed, page, pageCount }: Props) {
  if (pageCount <= 1) return null;
  const href = (n: number) => catalogueHref(basePath, params, { page: n }, fixed);
  return (
    <nav aria-label={t.paginationLabel} className="mt-12 flex justify-center" data-testid="pagination">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" className={cn(item, "gap-1 hover:text-primary")}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t.pagePrev}</span>
            </Link>
          ) : (
            <span className={cn(item, "gap-1 text-muted-foreground/50")} aria-hidden="true">
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">{t.pagePrev}</span>
            </span>
          )}
        </li>
        {pageWindow(page, pageCount).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={fmt(t.pageN, { n })}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  item,
                  "tabular-nums",
                  n === page ? "bg-primary font-medium text-primary-foreground" : "hover:bg-muted hover:text-primary",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link href={href(page + 1)} rel="next" className={cn(item, "gap-1 hover:text-primary")}>
              <span className="sr-only sm:not-sr-only">{t.pageNext}</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={cn(item, "gap-1 text-muted-foreground/50")} aria-hidden="true">
              <span className="hidden sm:inline">{t.pageNext}</span>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
