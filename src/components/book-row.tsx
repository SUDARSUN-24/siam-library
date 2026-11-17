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
  /** section background */
  tone?: "white" | "cream" | "tint";
  /** gold "New" badge on every card */
  markNew?: boolean;
};

const tones = { white: "bg-background", cream: "bg-cream", tint: "bg-tint" };

/** Home page: one horizontally scrolling row of up to 10 books + "See all →". */
export function BookRow({ id, title, seeAllHref, books, t, locale, showPhotos, tone = "white", markNew }: Props) {
  if (!books.length) return null;
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={tones[tone]} data-testid={`row-${id}`}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] px-4 py-10 sm:py-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id={headingId} className="section-title">
            {title}
          </h2>
          <Link
            href={seeAllHref}
            aria-label={fmt(t.seeAllAria, { name: title })}
            className="group inline-flex shrink-0 items-center gap-1 rounded-md pb-1 text-sm font-semibold text-primary hover:text-primary-hover"
            data-testid="see-all"
          >
            {t.seeAll}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        {/* bleeds to the screen edge on phones so the next cover peeks in */}
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:thin] sm:snap-none sm:gap-4">
          {books.map((b) => (
            <li key={b.id} className="w-[42%] max-w-48 min-w-36 shrink-0 snap-start sm:w-44">
              <BookCard book={b} t={t} locale={locale} showPhotos={showPhotos} isNew={markNew} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
