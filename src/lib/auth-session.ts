import "server-only";

/** Current visitor's session (null for anonymous students). Wired to Auth.js in Phase 4. */
export async function getViewerSession(): Promise<{ user?: { role?: string } | null } | null> {
  return null;
}
