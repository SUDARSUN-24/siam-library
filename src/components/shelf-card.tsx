import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { shelfInk } from "@/lib/colors";
import { fmt, type Dict, type Locale } from "@/lib/dict";

type Shelf = { code: string; nameEn: string; nameTh: string; color: string; total: number; available: number };

/** Home: a shelf as a card in its own colour — letter, name, book count, available count. */
export function ShelfCard({ shelf, t, locale }: { shelf: Shelf; t: Dict; locale: Locale }) {
  const name = locale === "th" ? shelf.nameTh : shelf.nameEn;
  const other = locale === "th" ? shelf.nameEn : shelf.nameTh;
  const bg = shelfInk(shelf.color);
  return (
    <Link
      href={`/shelf/${shelf.code}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl text-white shadow-(--shadow-card) transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-lift)"
      style={{ background: bg }}
    >
      {/* faint book spines along the right edge */}
      <span
        className="pointer-events-none absolute inset-y-0 right-0 w-28 opacity-[0.13]"
        style={{
          background:
            "repeating-linear-gradient(90deg,#fff 0 9px,transparent 9px 13px,#fff 13px 19px,transparent 19px 26px,#fff 26px 38px,transparent 38px 43px)",
          maskImage: "linear-gradient(90deg,transparent,#000)",
        }}
        aria-hidden="true"
      />
      <span className="relative flex items-start gap-4 p-4 sm:p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-white/15 font-serif text-3xl font-semibold ring-1 ring-white/25">
          {shelf.code}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-serif text-lg leading-snug font-semibold text-balance">{name}</span>
          <span className="truncate text-[13px] text-white/85">{other}</span>
        </span>
        <ArrowRight className="mt-1 ml-auto size-5 shrink-0 text-white/85 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
      <span className="relative mt-auto flex items-center justify-between gap-3 border-t border-white/20 bg-black/15 px-4 py-2.5 sm:px-5">
        <span className="text-[15px] font-semibold tabular-nums">
          {shelf.total === 1 ? t.bookCount1 : fmt(t.booksCount, { n: shelf.total.toLocaleString("en-US") })}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-available">
          <span className="size-1.5 rounded-full bg-available" aria-hidden="true" />
          {fmt(t.availableCount, { n: shelf.available.toLocaleString("en-US") })}
        </span>
      </span>
    </Link>
  );
}
