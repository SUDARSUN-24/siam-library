import type { Metadata } from "next";
import Link from "next/link";
import { BookPlus, Library, LogOut, QrCode } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { LanguageToggle, LibraryMark } from "@/components/site-header";
import { requireStaff } from "@/lib/auth-session";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff(); // server-side check for every admin page
  const { locale, t } = await getDict();

  const nav = [
    { href: "/admin", label: t.adminBooks, icon: Library },
    { href: "/admin/books/new", label: t.adminAddBook, icon: BookPlus },
    { href: "/admin/qr", label: t.adminQr, icon: QrCode },
  ];

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <LibraryMark className="size-7" />
            <span className="font-serif text-[15px] font-semibold">{t.navStaff}</span>
          </Link>
          <span className="hidden truncate text-xs text-muted-foreground md:inline" data-testid="admin-user">
            {fmt(t.adminSignedInAs, { name: user.name })} · {user.role}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle t={t} locale={locale} />
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <Link href="/" className="ml-auto inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-primary">
            {t.navHome} ↗
          </Link>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
