import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config";
import { uploadFileNameSchema } from "./validation";

export class UploadError extends Error {
  constructor(public code: "too_large" | "not_image" | "empty") {
    super(code);
  }
}

/**
 * Validate and compress one page photo.
 * - The file must DECODE as an image (we do not trust the MIME type or extension).
 * - EXIF orientation is applied, then all metadata (incl. GPS) is stripped.
 * - Resized to fit 1600×2200 and re-encoded as WebP (quality 80).
 * Returns the random file name stored in UPLOAD_DIR.
 */
export async function savePagePhoto(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("empty");
  if (file.size > config.maxUploadBytes) throw new UploadError("too_large");

  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    const img = sharp(input, { limitInputPixels: 60_000_000, failOn: "error" });
    const meta = await img.metadata();
    if (!meta.format || !["jpeg", "png", "webp", "gif", "tiff", "avif", "heif"].includes(meta.format)) {
      throw new UploadError("not_image");
    }
    output = await img
      .rotate()
      .resize({ width: 1600, height: 2200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError("not_image");
  }

  const name = `${randomUUID()}.webp`;
  await mkdir(config.uploadDir, { recursive: true });
  await writeFile(path.join(config.uploadDir, name), output, { flag: "wx" });
  return name;
}

/** Remove a stored photo. Only accepts our own <uuid>.webp names. Missing files are ignored. */
export async function deletePagePhoto(name: string | null | undefined) {
  const parsed = uploadFileNameSchema.safeParse(name);
  if (!parsed.success) return;
  await unlink(path.join(config.uploadDir, parsed.data)).catch(() => {});
}
