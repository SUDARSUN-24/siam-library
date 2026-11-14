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
  maxUploadBytes: 10 * 1024 * 1024,
  maxPagesPerBook: 10,
  loanDays: 14,
} as const;
