import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { config } from "./config";

/**
 * Where preview photos live. `name` is always one of our own `<uuid>.webp` names
 * (validated by the callers with uploadFileNameSchema).
 *
 *  - disk: UPLOAD_DIR on the server (local dev, Docker volume)
 *  - blob: a PRIVATE Vercel Blob store (used when BLOB_READ_WRITE_TOKEN is set).
 *          Blobs are not reachable by URL; they are streamed only through
 *          /api/uploads/[file], which runs the PREVIEW_ACCESS check first.
 */
export interface PhotoStorage {
  save(name: string, data: Buffer): Promise<void>;
  /** Photo bytes, or null when it does not exist. */
  read(name: string): Promise<ReadableStream<Uint8Array<ArrayBuffer>> | Uint8Array<ArrayBuffer> | null>;
  /** Missing files are ignored. */
  remove(name: string): Promise<void>;
}

const diskStorage: PhotoStorage = {
  async save(name, data) {
    await mkdir(config.uploadDir, { recursive: true });
    await writeFile(path.join(config.uploadDir, name), data, { flag: "wx" });
  },
  async read(name) {
    try {
      return new Uint8Array(await readFile(path.join(config.uploadDir, name)));
    } catch {
      return null;
    }
  },
  async remove(name) {
    await unlink(path.join(config.uploadDir, name)).catch(() => {});
  },
};

const blobPath = (name: string) => `pages/${name}`;

const blobStorage: PhotoStorage = {
  async save(name, data) {
    await put(blobPath(name), data, {
      access: "private",
      contentType: "image/webp",
      addRandomSuffix: false, // the name is already a random UUID
      allowOverwrite: false,
    });
  },
  async read(name) {
    const res = await get(blobPath(name), { access: "private" }).catch((e: unknown) => {
      console.error("[storage] blob read failed", name, e instanceof Error ? e.message : e);
      return null;
    });
    if (res && res.statusCode !== 200) console.error("[storage] blob read status", name, res.statusCode);
    return res?.statusCode === 200 ? (res.stream as ReadableStream<Uint8Array<ArrayBuffer>>) : null;
  },
  async remove(name) {
    await del(blobPath(name)).catch(() => {});
  },
};

export const storage: PhotoStorage = config.storage === "blob" ? blobStorage : diskStorage;
