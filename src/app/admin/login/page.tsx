import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LanguageToggle, LibraryMark } from "@/components/site-header";
import { hasStaffSession } from "@/lib/auth-session";
import { getDict } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff login", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await hasStaffSession()) redirect("/admin");
  const { locale, t } = await getDict();

  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.navHome}
          </Link>
          <LanguageToggle t={t} locale={locale} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_32px_-16px_rgba(29,36,51,.3)] sm:p-8">
          <LibraryMark className="size-10" />
          <h1 className="mt-4 font-serif text-2xl font-semibold">{t.staffLogin}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{t.staffLoginHint}</p>
          <LoginForm t={t} />
        </div>
      </div>
    </main>
  );
}
