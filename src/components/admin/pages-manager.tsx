"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Camera, ImagePlus, Loader2, Trash2, Type } from "lucide-react";
import { deletePage, movePage } from "@/app/admin/actions";
import { fmt, type Dict } from "@/lib/dict";
import { cn } from "@/lib/utils";

export type ManagedPage = { id: string; order: number; type: "IMAGE" | "TEXT"; imageUrl: string | null; snippet: string | null };

type Props = { t: Dict; bookId: string; pages: ManagedPage[]; maxPages: number; maxBytes: number };

function errorText(t: Dict, code: string, maxPages: number): string | undefined {
  return {
    too_large: t.uploadErrTooLarge,
    not_image: t.uploadErrNotImage,
    empty: t.uploadErrNotImage,
    full: fmt(t.adminPagesFull, { max: maxPages }),
    unauthorized: t.uploadErrSession,
  }[code];
}

/**
 * Shrink big phone photos before upload (saves mobile data; converts HEIC on iPhone).
 * Keeps the result under `maxBytes` — on Vercel that is 4 MB, because serverless functions
 * reject request bodies over 4.5 MB. Tries smaller sizes / lower quality until it fits.
 */
async function downscale(file: File, maxBytes: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // not decodable here — the server validates (and rejects) it
  }
  try {
    let best: Blob = file;
    for (const [side, quality] of [[2000, 0.88], [2000, 0.75], [1600, 0.7], [1200, 0.65]] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
      if (blob && blob.size < best.size) best = blob;
      if (best.size <= maxBytes) break;
    }
    return best;
  } finally {
    bitmap.close();
  }
}

export function PagesManager({ t, bookId, pages, maxPages, maxBytes }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const remaining = maxPages - pages.length;

  async function upload(fileList: FileList | null) {
    const files = [...(fileList ?? [])];
    if (!files.length) return;
    if (remaining <= 0) return toast.error(fmt(t.adminPagesFull, { max: maxPages }));
    const batch = files.slice(0, remaining);
    if (files.length > remaining) toast.warning(fmt(t.adminPagesFull, { max: maxPages }));

    setProgress({ done: 0, total: batch.length });
    let ok = 0;
    for (const [i, file] of batch.entries()) {
      if (!file.type.startsWith("image/") && file.type !== "") {
        toast.error(`${file.name}: ${t.uploadErrNotImage}`);
        continue;
      }
      const blob = await downscale(file, maxBytes);
      if (blob.size > maxBytes) {
        toast.error(`${file.name}: ${t.uploadErrTooLarge}`);
        continue;
      }
      const body = new FormData();
      body.append("file", blob, file.name);
      try {
        const res = await fetch(`/api/admin/books/${bookId}/pages`, { method: "POST", body });
        if (res.ok) ok++;
        else {
          // Vercel's own 413 (body over 4.5 MB) is plain text, not our JSON.
          const { error } = await res.json().catch(() => ({ error: res.status === 413 ? "too_large" : "" }));
          toast.error(`${file.name}: ${errorText(t, error, maxPages) ?? res.statusText}`);
          if (error === "full" || error === "unauthorized") break;
        }
      } catch {
        toast.error(`${file.name}: ${t.uploadErrNetwork}`);
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setProgress(null);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (ok) toast.success(t.adminUploadDone);
    router.refresh();
  }

  const busy = progress !== null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{fmt(t.adminPagesHint, { max: maxPages })}</p>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <label
          className={cn(uploadBtn, "bg-primary text-primary-foreground hover:bg-primary/90", (busy || remaining <= 0) && disabledCls)}
        >
          <Camera className="size-5" aria-hidden="true" />
          <span>{t.adminTakePhoto}</span>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy || remaining <= 0}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        <label className={cn(uploadBtn, "border border-border bg-card hover:border-primary/40", (busy || remaining <= 0) && disabledCls)}>
          <ImagePlus className="size-5" aria-hidden="true" />
          <span>{t.adminChooseImages}</span>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy || remaining <= 0}
            onChange={(e) => upload(e.target.files)}
            data-testid="page-upload"
          />
        </label>
        <span className="col-span-2 self-center text-sm text-muted-foreground tabular-nums sm:ml-2" aria-live="polite">
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {fmt(t.adminUploading, { done: progress.done, total: progress.total })}
            </span>
          ) : (
            `${pages.length} / ${maxPages}`
          )}
        </span>
      </div>

      {pages.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="page-list">
          {pages.map((p, i) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card" data-testid="managed-page">
              <div className="relative aspect-[5/7] bg-paper">
                {p.type === "IMAGE" && p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full overflow-hidden p-3 font-serif text-[10px] leading-relaxed text-muted-foreground">
                    <Type className="mb-1 size-3.5" aria-hidden="true" />
                    {p.snippet}
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-foreground text-xs font-medium text-background">
                  {i + 1}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <span className="truncate px-1 text-[11px] text-muted-foreground">{p.type === "IMAGE" ? t.adminPhotoPage : t.adminTextPage}</span>
                <div className="flex">
                  <IconAction action={movePage} pageId={p.id} extra={{ direction: "up" }} label={t.adminMoveUp} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </IconAction>
                  <IconAction action={movePage} pageId={p.id} extra={{ direction: "down" }} label={t.adminMoveDown} disabled={i === pages.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconAction>
                  <IconAction action={deletePage} pageId={p.id} label={t.adminDeletePage} danger confirmText={t.adminDeletePage + "?"}>
                    <Trash2 className="size-4" />
                  </IconAction>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const uploadBtn = "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-within:ring-3 focus-within:ring-ring/30";
const disabledCls = "pointer-events-none opacity-50";

function IconAction({
  action,
  pageId,
  extra,
  label,
  disabled,
  danger,
  confirmText,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  pageId: string;
  extra?: Record<string, string>;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  confirmText?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
        } finally {
          setPending(false);
        }
      }}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="pageId" value={pageId} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        aria-label={label}
        title={label}
        disabled={disabled || pending}
        className={cn(
          "grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30",
          danger ? "hover:text-destructive" : "hover:text-foreground",
        )}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : children}
      </button>
    </form>
  );
}
