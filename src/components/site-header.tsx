import Link from "next/link";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import type { Dict, Locale } from "@/lib/dict";

export function LibraryMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--crimson)" />
      <path d="M8 10.5c2.6-.9 5.3-.6 8 1.2v11c-2.7-1.8-5.4-2.1-8-1.2z" fill="#fdf8ee" />
      <path d="M24 10.5c-2.6-.9-5.3-.6-8 1.2v11c2.7-1.8 5.4-2.1 8-1.2z" fill="#fdf8ee" opacity=".78" />
    </svg>
  );
}

export function LanguageToggle({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={locale === "th" ? "en" : "th"} />
      <button
        type="submit"
        aria-label={t.langToggleAria}
        data-testid="lang-toggle"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium hover:border-primary/40 hover:text-primary"
      >
        <Languages className="size-4" aria-hidden="true" />
        {t.langToggle}
      </button>
    </form>
  );
}

export function SiteHeader({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <LibraryMark className="size-8 shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-serif text-[15px] font-semibold sm:text-base">{t.siteName}</span>
            <span className="eyebrow truncate !text-[11px] !tracking-[0.08em] text-muted-foreground">{t.siteTagline}</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/#shelves"
            className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            {t.navShelves}
          </Link>
          <LanguageToggle t={t} locale={locale} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="no-print mt-16 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {t.siteName}
        </p>
        {/* No link to the staff area on public pages: staff open the secret ADMIN_PATH bookmark. */}
      </div>
    </footer>
  );
}
