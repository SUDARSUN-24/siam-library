import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getDict } from "@/lib/i18n";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getDict();
  return (
    <>
      <SiteHeader t={t} locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter t={t} />
    </>
  );
}
