import { AlertTriangle } from "lucide-react";
import { PrintButton } from "@/components/admin/print-button";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { fmt } from "@/lib/dict";
import { getDict } from "@/lib/i18n";
import { isLocalSiteUrl, qrSvg } from "@/lib/qr";

/**
 * Printable sticker sheet: one sticker per shelf (large) and per book.
 * A4, 3 columns × 6 rows of ~63 × 44 mm book stickers — fits standard 18-up label sheets.
 */
export default async function QrSheetPage() {
  const { locale, t } = await getDict();
  const [shelves, books] = await Promise.all([
    db.shelf.findMany({ orderBy: { code: "asc" } }),
    db.book.findMany({ orderBy: { code: "asc" }, select: { code: true, title: true, row: true, shelf: { select: { code: true, color: true } } } }),
  ]);
  const [shelfQrs, bookQrs] = await Promise.all([
    Promise.all(shelves.map((s) => qrSvg(`/shelf/${s.code}`))),
    Promise.all(books.map((b) => qrSvg(`/book/${b.code}`))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{t.qrTitle}</h1>
          <p className="text-sm text-muted-foreground">{fmt(t.qrHint, { url: config.siteUrl })}</p>
        </div>
        <PrintButton label={t.qrPrint} />
      </div>

      {isLocalSiteUrl() && (
        <p className="no-print flex items-start gap-2 rounded-lg bg-borrowed/10 px-4 py-3 text-sm text-borrowed" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t.qrWarnLocalhost}
        </p>
      )}

      <section className="qr-sheet">
        <h2 className="no-print mb-3 font-serif text-lg font-semibold">{t.qrShelves}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-0">
          {shelves.map((s, i) => (
            <div key={s.id} className="qr-sticker qr-sticker-tall flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-white p-4 text-center" data-testid="qr-shelf">
              <div className="size-36 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: shelfQrs[i] }} />
              <p className="font-serif text-3xl leading-none font-semibold" style={{ color: s.color }}>
                {s.code}
              </p>
              <p className="text-sm">{locale === "th" ? s.nameTh : s.nameEn}</p>
              <p className="text-[10px] text-muted-foreground">{t.siteName}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="qr-sheet print:break-before-page">
        <h2 className="no-print mb-3 font-serif text-lg font-semibold">{t.qrBooks}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-0">
          {books.map((b, i) => (
            <div key={b.code} className="qr-sticker flex items-center gap-3 rounded-lg border border-border bg-white p-3" data-testid="qr-book">
              <div className="size-20 shrink-0 [&_svg]:h-full [&_svg]:w-full print:size-[30mm]" dangerouslySetInnerHTML={{ __html: bookQrs[i] }} />
              <div className="min-w-0">
                <p className="font-mono text-base font-semibold" style={{ color: b.shelf.color }}>
                  {b.code}
                </p>
                <p className="line-clamp-2 text-xs leading-snug break-words hyphens-auto">{b.title}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{fmt(t.shelfRow, { shelf: b.shelf.code, row: b.row })}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
