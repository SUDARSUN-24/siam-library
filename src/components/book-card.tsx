import Link from "next/link";
import { BookCover } from "./book-cover";
import { StatusBadge } from "./status-badge";
import { fmt, type Dict, type Locale } from "@/lib/dict";
import type { BookCardData } from "@/lib/books";

export function BookCard({ book, t, locale }: { book: BookCardData; t: Dict; locale: Locale }) {
  const photo = book.pages[0]?.imagePath;
  return (
    <Link
      href={`/book/${book.code}`}
      className="group flex flex-col gap-2.5 rounded-md outline-offset-4 focus-visible:outline-2"
      data-testid="book-card"
    >
      <div className="transition-transform duration-200 group-hover:-translate-y-1">
        <BookCover
          code={book.code}
          title={book.title}
          author={book.author}
          color={book.shelf.color}
          imageUrl={photo ? `/api/uploads/${photo}` : null}
        />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 font-serif text-[15px] leading-snug font-semibold group-hover:text-primary">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-[13px] text-muted-foreground">{book.author}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={book.status} t={t} locale={locale} />
          <span className="text-xs text-muted-foreground">
            {fmt(t.shelfRow, { shelf: book.shelf.code, row: book.row })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BookGrid({ books, t, locale }: { books: BookCardData[]; t: Dict; locale: Locale }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((b) => (
        <li key={b.id}>
          <BookCard book={b} t={t} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
