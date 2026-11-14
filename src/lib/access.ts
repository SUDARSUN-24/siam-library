import "server-only";
import { config } from "./config";

type Viewer = { user?: { role?: string } | null } | null;

/**
 * THE one place that decides who may read book previews (text pages and photos).
 * Used by the book page and the image route.
 *
 * PREVIEW_ACCESS=public    → everyone (current setting)
 * PREVIEW_ACCESS=students  → only signed-in users. Today only staff accounts exist;
 *   when student login (e.g. university SSO) is added, give students a session and
 *   this check starts working for them with no other changes.
 */
export function canViewPreview(session: Viewer): boolean {
  if (config.previewAccess === "public") return true;
  return Boolean(session?.user);
}
