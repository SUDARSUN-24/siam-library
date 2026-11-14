import "server-only";
import path from "node:path";

/** Runtime settings read from environment variables (server only). */
export const config = {
  /** Public base URL used inside QR codes, e.g. https://library.siam.edu */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** "public" = anyone can read previews; "students" = logged-in users only (future). */
  previewAccess: process.env.PREVIEW_ACCESS === "students" ? "students" : "public",
  /** Folder for uploaded preview photos — outside /public so files are served through a checked route. */
  uploadDir: path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads"),
  /** "blob" = Vercel Blob (when BLOB_READ_WRITE_TOKEN is set), otherwise files in UPLOAD_DIR. */
  storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "disk",
  /** Largest photo the server accepts (before WebP compression). */
  maxUploadBytes: 10 * 1024 * 1024,
  /**
   * Largest file the BROWSER may send. Vercel functions reject request bodies over 4.5 MB,
   * so on Vercel the uploader compresses photos below 4 MB first.
   */
  clientUploadBytes: process.env.VERCEL ? 4 * 1024 * 1024 : 10 * 1024 * 1024,
  maxPagesPerBook: 10,
  loanDays: 14,
} as const;
