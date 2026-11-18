import { db } from "@/lib/db";

/**
 * Uptime check: GET /api/health → 200 {"status":"ok"} when the app can reach the database,
 * 503 {"status":"error"} when it cannot. Used by the uptime monitor
 * (.github/workflows/uptime.yml) and by people checking the site (docs/RUNBOOK.md).
 * It reveals nothing else about the system. Every call wakes the Neon database, so the
 * monitor must not call it more often than every ~15 minutes (free plan compute hours).
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.shelf.findFirst({ select: { id: true } });
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("[health] database check failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ status: "error" }, { status: 503, headers });
  }
}
