import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-serif text-6xl font-semibold text-crimson">404</p>
      <h1 className="mt-3 font-serif text-xl font-semibold">{t.notFoundTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.notFoundBody}</p>
      <Link href="/" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        {t.backToBooks}
      </Link>
    </main>
  );
}
