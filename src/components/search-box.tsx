"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { BookCover } from "./book-cover";
import { fmt, type Dict } from "@/lib/dict";
import { cn } from "@/lib/utils";

export type Suggestion = {
  code: string;
  title: string;
  author: string;
  lang: string;
  shelf: { code: string; color: string };
  row: number;
  cover: string | null;
};

type Props = {
  t: Dict;
  /** Where the form goes on Enter (the full results page). */
  action: string;
  defaultValue?: string;
  /** Filters to keep when searching again from a catalogue page. */
  hidden?: Record<string, string>;
  compact?: boolean;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

/**
 * Search bar with a live suggestions dropdown (WAI-ARIA combobox + listbox).
 * Without JavaScript it is a plain GET form to `action`.
 * Keys: ↓/↑ choose, Enter opens the chosen book (or searches), Esc closes.
 */
export function SearchBox({ t, action, defaultValue = "", hidden = {}, compact }: Props) {
  const router = useRouter();
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [fetchedFor, setFetchedFor] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  const ready = query.length >= MIN_CHARS;

  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { books: Suggestion[] };
        setItems(data.books);
        setFetchedFor(query);
        setActive(-1);
      } catch {
        /* aborted or offline — keep the plain form working */
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, ready]);

  const shown = open && ready && fetchedFor !== "";
  // options: the books, then "See all results"
  const optionCount = items.length + 1;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  function choose(i: number) {
    setOpen(false);
    if (i < items.length) router.push(`/book/${items[i].code}`);
    else formRef.current?.requestSubmit();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!ready || fetchedFor === "") return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      // -1 = back in the text box; wraps around through all options
      setActive((a) => (!shown ? (step === 1 ? 0 : optionCount - 1) : ((a + 1 + step + optionCount + 1) % (optionCount + 1)) - 1));
    } else if (e.key === "Enter" && shown && active >= 0 && active < optionCount) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" && shown) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      role="search"
      id="search"
      className="relative"
      onSubmit={() => setOpen(false)}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="q" className="sr-only">
        {t.searchLabel}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-input bg-card p-1.5 pl-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
          compact ? "shadow-none" : "shadow-[0_2px_12px_-4px_rgba(29,36,51,.18)]",
        )}
      >
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id="q"
          name="q"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={listId}
          aria-activedescendant={shown && active >= 0 ? optionId(active) : undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={t.searchPlaceholder}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/80",
            compact ? "h-9" : "h-10",
          )}
        />
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90",
            compact ? "h-9" : "h-10",
          )}
        >
          {t.searchButton}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {shown ? (items.length ? fmt(t.suggestionsCount, { n: items.length }) : t.suggestionsNone) : ""}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label={t.suggestionsLabel}
        hidden={!shown}
        data-testid="suggestions"
        className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-card py-1.5 shadow-[0_12px_32px_-12px_rgba(29,36,51,.4)]"
      >
        {items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">{t.suggestionsNone}</li>}
        {items.map((b, i) => (
          <li
            key={b.code}
            id={optionId(i)}
            role="option"
            aria-selected={active === i}
            data-testid="suggestion"
            data-code={b.code}
            // mousedown, not click: keeps focus in the input so blur does not close the list first
            onMouseDown={(e) => {
              e.preventDefault();
              choose(i);
            }}
            onMouseMove={() => setActive(i)}
            className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", active === i && "bg-muted")}
          >
            <BookCover
              code={b.code}
              title={b.title}
              author={b.author}
              color={b.shelf.color}
              imageUrl={b.cover}
              className="w-9 shrink-0 rounded-[2px]"
            />
            <span className="flex min-w-0 flex-col">
              <span lang={b.lang} className="truncate font-serif text-[15px] font-semibold">
                {b.title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {b.author} · {fmt(t.shelfRow, { shelf: b.shelf.code, row: b.row })}
              </span>
            </span>
          </li>
        ))}
        <li
          id={optionId(items.length)}
          role="option"
          aria-selected={active === items.length}
          onMouseDown={(e) => {
            e.preventDefault();
            choose(items.length);
          }}
          onMouseMove={() => setActive(items.length)}
          className={cn(
            "mt-1 cursor-pointer border-t border-border px-4 py-2.5 text-sm font-medium text-primary",
            active === items.length && "bg-muted",
          )}
        >
          {fmt(t.suggestSeeAll, { q: query })}
        </li>
      </ul>
    </form>
  );
}
