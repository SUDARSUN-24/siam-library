import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { BookForm } from "@/components/admin/book-form";
import { getBookFormData } from "@/lib/admin-data";
import { getDict } from "@/lib/i18n";

export default async function NewBookPage() {
  const [{ locale, t }, data] = await Promise.all([getDict(), getBookFormData()]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href={"/admin"} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.adminBooks}
      </Link>
      <h1 className="font-serif text-2xl font-semibold">{t.adminAddBook}</h1>
      <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-6">
        <BookForm t={t} locale={locale} {...data} />
      </section>
      <p className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
        <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
        {t.adminSaveFirst}
      </p>
    </div>
  );
}
