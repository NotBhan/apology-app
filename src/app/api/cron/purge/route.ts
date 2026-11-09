import { constantTimeEqual } from "@/lib/id";
import { purgeExpired } from "@/lib/lifecycle";
import { jsonError, jsonOk } from "@/lib/api/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Purge is bounded by the batch size, but give a cold start room. */
export const maxDuration = 60;

/**
 * Scheduled deletion of expired apologies.
 *
 * This endpoint is never public. Vercel Cron calls it with
 * `Authorization: Bearer $CRON_SECRET`; a manual operator can pass the same
 * value as `x-cron-secret`. With no secret configured it refuses to run at all,
 * because an unauthenticated endpoint that deletes data is worse than one that
 * is missing.
 *
 * Access to an expired letter is already blocked by the read path, so this job
 * is about physically removing data, not about enforcement.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const direct = request.headers.get("x-cron-secret")?.trim() ?? "";

  if (bearer && constantTimeEqual(bearer, secret)) return true;
  if (direct && constantTimeEqual(direct, secret)) return true;
  return false;
}

async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return jsonError(503, "Cleanup is not configured. Set CRON_SECRET to enable it.");
  }
  if (!authorized(request)) {
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // whether this route exists.
    return jsonError(404, "Not found.");
  }

  try {
    const report = await purgeExpired();
    return jsonOk({
      ok: true,
      scanned: report.scanned,
      deleted: report.deleted,
      retried: report.retried,
      skipped: report.skipped,
      // Ids only: no names, no messages, nothing personal.
      outcomes: report.outcomes.map((outcome) => ({
        id: outcome.apologyId,
        status: outcome.status,
        ...(outcome.status === "retry" ? { remainingAssets: outcome.remainingAssets } : {}),
      })),
    });
  } catch (error) {
    console.error("[cron] purge failed:", error);
    return jsonError(500, "Cleanup failed. It will be retried on the next run.");
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
