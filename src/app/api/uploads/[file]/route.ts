import { canViewPreview } from "@/lib/access";
import { getViewerSession } from "@/lib/auth-session";
import { config } from "@/lib/config";
import { storage } from "@/lib/storage";
import { uploadFileNameSchema } from "@/lib/validation";

/**
 * Serves uploaded preview photos from storage (UPLOAD_DIR, or the private Vercel Blob store).
 * Only <uuid>.webp names are accepted, so path traversal is impossible,
 * and the same PREVIEW_ACCESS rule as the book page applies.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const name = uploadFileNameSchema.safeParse(file);
  if (!name.success) return new Response("Not found", { status: 404 });

  if (!canViewPreview(await getViewerSession())) return new Response("Forbidden", { status: 403 });

  const data = await storage.read(name.data);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": config.previewAccess === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
