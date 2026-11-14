import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function BookNotFound() {
  const { t } = await getDict();
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-serif text-2xl font-semibold">{t.notFoundTitle}</h1>
      <p className="mt-2 text-muted-foreground">{t.notFoundBody}</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        {t.backToBooks}
      </Link>
    </div>
  );
}
