"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, ChevronLeft, ChevronRight, MapPin, RotateCcw } from "lucide-react";
import { BookCover } from "./book-cover";
import { PageText } from "./page-text";
import { dictionaries, fmt, type Locale } from "@/lib/dict";
import { cn } from "@/lib/utils";

export type ViewerPage = { id: string; type: "TEXT" | "IMAGE"; text?: string | null; imageUrl?: string | null };

type Props = {
  locale: Locale;
  pages: ViewerPage[];
  book: { code: string; title: string; author: string; color: string };
  /** Language of the book text (for correct Thai/English typography). */
  bookLanguage: string;
  location: string; // "Shelf A · Row 2"
  available: boolean;
  dueDateLabel?: string | null;
  loanDays: number;
};

type Slide = { kind: "cover" } | { kind: "page"; page: ViewerPage; n: number } | { kind: "end" };

export function PreviewViewer({ locale, pages, book, bookLanguage, location, available, dueDateLabel, loanDays }: Props) {
  const t = dictionaries[locale];
  // A generated cover is shown first unless staff uploaded a photo as page 1.
  const photoCover = pages[0]?.type === "IMAGE";
  const slides: Slide[] = [
    ...(photoCover ? [] : [{ kind: "cover" } as const]),
    ...pages.map((page, i) => ({ kind: "page" as const, page, n: i + 1 })),
    { kind: "end" },
  ];
  const last = slides.length - 1;

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(last, to));
      setDir(next >= index ? 1 : -1);
      setIndex(next);
    },
    [index, last],
  );

  // Arrow keys (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // Keep the active thumbnail centred in the strip. Only the strip scrolls (horizontally):
  // scrollIntoView would also scroll the page, which on phones jumped past the title on load.
  useEffect(() => {
    const strip = thumbsRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    if (!strip || !el) return;
    const s = strip.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const left = strip.scrollLeft + (r.left - s.left) - (s.width - r.width) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [index]);

  const slide = slides[index];
  const label = (i: number) => {
    const s = slides[i];
    return s.kind === "cover" ? t.viewerCover : s.kind === "end" ? t.viewerEnd : String(s.n);
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-4" data-testid="preview-viewer">
      {/* Page */}
      <div
        className="relative w-full max-w-[460px] touch-pan-y select-none"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {/* stacked-pages illusion */}
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-r-md bg-[#ebe3d4]" aria-hidden="true" />
        <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-r-md bg-[#f3ecdf]" aria-hidden="true" />

        <div
          className="@container relative aspect-[5/7] w-full overflow-hidden rounded-r-md rounded-l-[3px] bg-paper shadow-[0_2px_4px_rgba(29,36,51,.12),0_18px_40px_-18px_rgba(29,36,51,.45)]"
          role="region"
          aria-roledescription="page"
          aria-label={fmt(t.viewerPage, { n: index + 1, total: slides.length })}
        >
          <div
            key={index}
            className={cn(
              "absolute inset-0 animate-in duration-300 fade-in",
              dir === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6",
            )}
            data-testid="viewer-slide"
            data-slide-kind={slide.kind}
          >
            {slide.kind === "cover" && (
              <div className="h-full p-[7cqw]">
                <BookCover {...book} priority className="h-full rounded-[2px]" />
              </div>
            )}

            {slide.kind === "page" && slide.page.type === "IMAGE" && slide.page.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- served by our checked upload route
              <img
                src={slide.page.imageUrl}
                alt={fmt(t.viewerPage, { n: slide.n, total: pages.length })}
                className="h-full w-full object-contain p-[3cqw]"
                draggable={false}
              />
            )}

            {slide.kind === "page" && slide.page.type === "TEXT" && (
              <div className="h-full overflow-y-auto px-[10cqw] pt-[11cqw] pb-[13cqw]" lang={bookLanguage}>
                <PageText text={slide.page.text ?? ""} className="min-h-full" />
              </div>
            )}

            {slide.kind === "end" && (
              <div className="flex h-full flex-col items-center justify-center px-[9cqw] text-center" data-testid="viewer-end">
                <BookOpenCheck className="size-[13cqw] text-crimson" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-[4cqw] font-serif text-[clamp(20px,6.4cqw,28px)] font-semibold">{t.endTitle}</h3>
                <p className="mt-[2cqw] text-[clamp(14px,3.9cqw,17px)] text-muted-foreground">{t.endBody}</p>
                <div className="mt-[6cqw] w-full rounded-lg border border-border bg-card px-[5cqw] py-[4cqw]">
                  <p className="eyebrow !text-[clamp(11px,3cqw,13px)] text-muted-foreground">{t.endWhere}</p>
                  <p className="mt-1 flex items-center justify-center gap-2 font-serif text-[clamp(20px,6.6cqw,30px)] font-semibold text-crimson">
                    <MapPin className="size-[0.8em]" aria-hidden="true" />
                    {location}
                  </p>
                  <p className="mt-1 font-sans text-[clamp(11px,3cqw,13px)] text-muted-foreground">{book.code}</p>
                </div>
                <p className="mt-[5cqw] text-[clamp(12px,3.4cqw,14px)] leading-relaxed text-muted-foreground">
                  {available ? fmt(t.endCounter, { days: loanDays }) : fmt(t.endBorrowedNote, { date: dueDateLabel ?? "—" })}
                </p>
                <button
                  type="button"
                  onClick={() => go(0)}
                  className="mt-[5cqw] inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t.endRestart}
                </button>
              </div>
            )}

            {slide.kind === "page" && (
              <span className="absolute inset-x-0 bottom-[4.5cqw] text-center font-serif text-[clamp(11px,3cqw,13px)] text-muted-foreground/80">
                — {slide.n} —
              </span>
            )}
          </div>
          {/* spine shadow */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[5cqw] bg-gradient-to-r from-black/10 to-transparent" aria-hidden="true" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full max-w-[460px] items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label={t.viewerPrev}
          data-testid="viewer-prev"
          className="grid size-11 place-items-center rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary disabled:opacity-35 disabled:hover:border-border disabled:hover:text-inherit"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium tabular-nums" data-testid="viewer-position" aria-live="polite">
            {fmt(t.viewerPage, { n: index + 1, total: slides.length })}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">{t.viewerHint}</p>
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          aria-label={t.viewerNext}
          data-testid="viewer-next"
          className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Thumbnails */}
      <div ref={thumbsRef} className="w-full max-w-[460px] overflow-x-auto pb-2" aria-label={t.viewerThumbs}>
        <ol className="mx-auto flex w-max gap-2 px-1">
          {slides.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                data-thumb={i}
                onClick={() => go(i)}
                aria-label={fmt(t.viewerPage, { n: i + 1, total: slides.length })}
                aria-current={i === index ? "page" : undefined}
                className={cn(
                  "@container relative block aspect-[5/7] w-11 overflow-hidden rounded-[3px] border bg-paper text-[10px] text-muted-foreground transition",
                  i === index ? "border-primary ring-2 ring-primary/30" : "border-border opacity-75 hover:opacity-100",
                )}
              >
                {s.kind === "cover" && <BookCover {...book} className="h-full rounded-none shadow-none" />}
                {s.kind === "page" && s.page.type === "IMAGE" && s.page.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.page.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                {s.kind === "page" && s.page.type === "TEXT" && (
                  <span className="absolute inset-[18%] flex flex-col gap-[3px]" aria-hidden="true">
                    {[90, 100, 75, 100, 60].map((w, k) => (
                      <span key={k} className="h-[2px] rounded bg-muted-foreground/25" style={{ width: `${w}%` }} />
                    ))}
                  </span>
                )}
                {s.kind === "end" && (
                  <span className="grid h-full place-items-center bg-accent">
                    <BookOpenCheck className="size-4 text-crimson" aria-hidden="true" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-paper/90 text-center leading-[14px] font-medium">
                  {label(i)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
