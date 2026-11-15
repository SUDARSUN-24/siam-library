import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookCard } from "./book-card";
import { fmt, type Dict, type Locale } from "@/lib/dict";
import type { BookCardData } from "@/lib/books";

type Props = {
  id: string;
  title: string;
  seeAllHref: string;
  books: BookCardData[];
  t: Dict;
  locale: Locale;
  showPhotos: boolean;
};

/** Home page: one horizontally scrolling row of up to 10 books + "See all →". */
export function BookRow({ id, title, seeAllHref, books, t, locale, showPhotos }: Props) {
  if (!books.length) return null;
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="min-w-0 pt-10" data-testid={`row-${id}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="font-serif text-xl font-semibold">
          {title}
        </h2>
        <Link
          href={seeAllHref}
          aria-label={fmt(t.seeAllAria, { name: title })}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
          data-testid="see-all"
        >
          {t.seeAll}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
      {/* bleeds to the screen edge on phones so the next cover peeks in */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:thin] sm:snap-none">
        {books.map((b) => (
          <li key={b.id} className="w-[38%] max-w-44 min-w-32 shrink-0 snap-start sm:w-40">
            <BookCard book={b} t={t} locale={locale} showPhotos={showPhotos} />
          </li>
        ))}
      </ul>
    </section>
  );
}
