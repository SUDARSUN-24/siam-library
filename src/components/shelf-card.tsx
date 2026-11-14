import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fmt, type Dict, type Locale } from "@/lib/dict";

type Shelf = { code: string; nameEn: string; nameTh: string; color: string; total: number; available: number };

export function ShelfCard({ shelf, t, locale }: { shelf: Shelf; t: Dict; locale: Locale }) {
  const name = locale === "th" ? shelf.nameTh : shelf.nameEn;
  const other = locale === "th" ? shelf.nameEn : shelf.nameTh;
  return (
    <Link
      href={`/shelf/${shelf.code}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-transparent hover:shadow-[0_8px_24px_-12px_rgba(29,36,51,.35)]"
    >
      <span
        className="grid size-14 shrink-0 place-items-center rounded-lg font-serif text-2xl font-semibold text-[#fdf8ee]"
        style={{ background: shelf.color }}
      >
        {shelf.code}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-serif text-base font-semibold">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{other}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          {shelf.total === 1 ? t.bookCount1 : fmt(t.booksCount, { n: shelf.total })} ·{" "}
          <span className="text-available">{fmt(t.availableCount, { n: shelf.available })}</span>
        </span>
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
