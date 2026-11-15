import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { LanguageToggle, LibraryMark } from "@/components/site-header";
import { requireStaffForSecurity, TWO_FACTOR_REQUIRED_ROLES } from "@/lib/auth-session";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { formatSecret, otpauthUri } from "@/lib/totp";
import { getOrCreatePendingSecret, unusedBackupCodeCount } from "@/lib/two-factor";
import { ManageTwoFactor, SetupTwoFactor } from "./forms";

export const metadata: Metadata = { title: "Two-step login", robots: { index: false, follow: false } };

/**
 * Two-step login (TOTP). Lives OUTSIDE the (panel) layout: an ADMIN without 2FA is sent
 * here by requireStaff() and may open nothing else until it is set up.
 */
export default async function SecurityPage() {
  const user = await requireStaffForSecurity();
  const { locale, t } = await getDict();
  const required = TWO_FACTOR_REQUIRED_ROLES.includes(user.role);

  let setup: { qr: string; secret: string } | null = null;
  if (!user.twoFactorEnabled) {
    const secret = await getOrCreatePendingSecret(user.id);
    const qr = await QRCode.toString(otpauthUri(user.email, secret), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#1d2433", light: "#ffffff" },
    });
    setup = { qr, secret: formatSecret(secret) };
  }
  const remaining = user.twoFactorEnabled ? await unusedBackupCodeCount(user.id) : 0;

  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        {user.needsTwoFactorSetup ? (
          <span className="flex items-center gap-2">
            <LibraryMark className="size-7" />
            <span className="font-serif text-[15px] font-semibold">{t.navStaff}</span>
          </span>
        ) : (
          <Link href={"/admin"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.adminBooks}
          </Link>
        )}
        <div className="flex items-center gap-2">
          <LanguageToggle t={t} locale={locale} />
          <form action={signOutAction}>
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_32px_-16px_rgba(29,36,51,.3)] sm:p-8">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold">
          {user.twoFactorEnabled ? <ShieldCheck className="size-6 text-primary" aria-hidden="true" /> : <ShieldAlert className="size-6 text-primary" aria-hidden="true" />}
          {t.twoFactorTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="twofa-status">
          {user.twoFactorEnabled ? fmt(t.twoFactorOn, { n: remaining }) : required ? t.twoFactorRequired : t.twoFactorOptional}
        </p>

        {setup ? (
          <SetupTwoFactor t={t} qrSvg={setup.qr} secret={setup.secret} continueHref={"/admin"} />
        ) : (
          <ManageTwoFactor t={t} canDisable={!required} continueHref={"/admin"} />
        )}
      </div>
    </main>
  );
}
