import Link from "next/link";
import { BookCover } from "./book-cover";
import { StatusBadge } from "./status-badge";
import { fmt, type Dict, type Locale } from "@/lib/dict";
import type { BookCardData } from "@/lib/books";
import { shelfInk } from "@/lib/colors";
import { cn } from "@/lib/utils";

type CardProps = {
  book: BookCardData;
  t: Dict;
  locale: Locale;
  /** from canViewPreview() */
  showPhotos: boolean;
  /** small gold "New" badge on the cover (home: New arrivals row) */
  isNew?: boolean;
};

export function BookCard({ book, t, locale, showPhotos, isNew }: CardProps) {
  const photo = showPhotos ? book.pages[0]?.imagePath : null;
  return (
    <Link
      href={`/book/${book.code}`}
      className="group surface flex h-full flex-col gap-3 rounded-xl p-2.5 transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-(--shadow-lift) sm:p-3"
      data-testid="book-card"
    >
      <div className="relative">
        <BookCover
          code={book.code}
          title={book.title}
          author={book.author}
          color={book.shelf.color}
          imageUrl={photo ? `/api/uploads/${photo}` : null}
        />
        {isNew && (
          <span className="absolute top-2 right-2 rounded-sm bg-gold px-1.5 py-0.5 text-[11px] leading-none font-semibold text-navy shadow-sm">
            {t.badgeNew}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-0.5">
        <h3 lang={book.language} className="line-clamp-2 font-serif text-[15px] leading-snug font-bold break-words hyphens-auto text-foreground group-hover:text-primary">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-[13px] text-muted-foreground">{book.author}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1.5 pt-1.5">
          <ShelfTag color={book.shelf.color} label={fmt(t.shelfRow, { shelf: book.shelf.code, row: book.row })} />
          <StatusBadge status={book.status} t={t} locale={locale} />
        </div>
      </div>
    </Link>
  );
}

/** Small tag in the shelf colour, white text ("Shelf A · Row 1"). */
export function ShelfTag({ color, label, className }: { color: string; label: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-tight font-semibold whitespace-nowrap text-white", className)}
      style={{ background: shelfInk(color) }}
    >
      {label}
    </span>
  );
}

export function BookGrid({
  books,
  withSidebar,
  ...rest
}: Omit<CardProps, "book"> & { books: BookCardData[]; /** next to the catalogue filter sidebar (lg+) */ withSidebar?: boolean }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4",
        withSidebar ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-5 xl:grid-cols-6",
      )}
    >
      {books.map((b) => (
        <li key={b.id}>
          <BookCard book={b} {...rest} />
        </li>
      ))}
    </ul>
  );
}
