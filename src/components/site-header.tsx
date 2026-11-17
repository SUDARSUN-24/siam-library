import Link from "next/link";
import { ExternalLink, Languages, LogIn, MapPin } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import type { Dict, Locale } from "@/lib/dict";
import { cn } from "@/lib/utils";
import { SiteNav } from "./site-nav";

export function LibraryMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--crimson)" />
      <path d="M8 10.5c2.6-.9 5.3-.6 8 1.2v11c-2.7-1.8-5.4-2.1-8-1.2z" fill="#ffffff" />
      <path d="M24 10.5c-2.6-.9-5.3-.6-8 1.2v11c2.7-1.8 5.4-2.1 8-1.2z" fill="#ffffff" opacity=".78" />
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
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-input bg-card px-3 text-sm font-medium whitespace-nowrap hover:border-primary hover:text-primary"
      >
        <Languages className="size-4" aria-hidden="true" />
        {t.langToggle}
      </button>
    </form>
  );
}

export function SiteHeader({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <header className="no-print sticky top-0 z-30 border-t-[3px] border-b border-t-primary border-b-border bg-card/95 shadow-[0_1px_8px_-4px_rgba(29,36,51,.18)] backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md">
          <LibraryMark className="size-8 shrink-0 sm:size-9" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-serif text-[15px] font-semibold text-foreground sm:text-[17px]">{t.siteName}</span>
            <span className="eyebrow truncate !text-[11px] !tracking-[0.08em] text-primary">{t.siteTagline}</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <SiteNav booksLabel={t.navBooks} shelvesLabel={t.navShelves} />
          <span className="ml-1 sm:ml-2">
            <LanguageToggle t={t} locale={locale} />
          </span>
        </nav>
      </div>
    </header>
  );
}

const eresources = [
  { key: "eresThaiLis", href: "https://tdc.thailis.or.th" },
  { key: "eresThaiJo", href: "https://www.tci-thaijo.org" },
  { key: "eresScholar", href: "https://scholar.google.com" },
] as const;

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-sans text-sm font-bold text-white">
      {children}
      <span className="mt-2 block h-1 w-7 rounded-full bg-sun" aria-hidden="true" />
    </h2>
  );
}

const footerLink = "inline-flex items-center gap-1.5 rounded-sm text-white/90 underline-offset-4 hover:text-white hover:underline";

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="no-print on-color bg-primary text-sm text-white/90">
      <span className="flex h-1.5" aria-hidden="true">
        <span className="flex-1 bg-hue-blue" />
        <span className="flex-1 bg-sun" />
        <span className="flex-1 bg-hue-raspberry" />
        <span className="flex-1 bg-hue-teal" />
        <span className="flex-1 bg-hue-orange" />
      </span>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <FooterHeading>{t.footerLibrary}</FooterHeading>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/" className={footerLink}>
                {t.navHome}
              </Link>
            </li>
            <li>
              <Link href="/books" className={footerLink}>
                {t.catalogueTitle}
              </Link>
            </li>
            <li>
              <Link href="/#shelves" className={footerLink}>
                {t.shelvesHeading}
              </Link>
            </li>
            <li>
              <Link href="/#categories" className={footerLink}>
                {t.categoriesHeading}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <FooterHeading>{t.footerEresources}</FooterHeading>
          <ul className="flex flex-col gap-2">
            {eresources.map((e) => (
              <li key={e.key}>
                <a href={e.href} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  {t[e.key]}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{t.footerNewTab}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <FooterHeading>{t.footerContact}</FooterHeading>
          <p className="flex gap-2 leading-relaxed">
            <MapPin className="mt-0.5 size-4 shrink-0 text-white" aria-hidden="true" />
            {t.footerAddress}
          </p>
          <p className="mt-2 leading-relaxed">{t.footerBorrowNote}</p>
          <a href="https://www.siam.edu" target="_blank" rel="noopener noreferrer" className={cn(footerLink, "mt-2")}>
            {t.footerUniversity}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t.footerNewTab}</span>
          </a>
        </div>
        <div>
          <FooterHeading>{t.footerStaffHeading}</FooterHeading>
          <p className="leading-relaxed">{t.staffLoginHint}</p>
          <Link
            href="/admin/login"
            data-testid="staff-login-link"
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 font-semibold text-primary shadow-sm hover:bg-sun-soft"
          >
            <LogIn className="size-4" aria-hidden="true" />
            {t.staffLogin}
          </Link>
        </div>
      </div>
      <div className="border-t border-white/25">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-5 text-xs">
          <LibraryMark className="size-5 shrink-0 rounded-[5px] ring-1 ring-white/70" />
          <p>
            © {new Date().getFullYear()} {t.siteName}
          </p>
        </div>
      </div>
    </footer>
  );
}
