import { parseTriggerDelivery } from "@neon/functions/triggers";
import { safeCompare } from "../../src/lib/id";
import { createDb } from "../../src/db/client";
import { PostgresLifecycleStore } from "../../src/lib/lifecycle/postgres-store";
import { runCleanup } from "../../src/lib/lifecycle/protocol";
import {
  FilebaseObjectStore,
  createS3Transport,
  filebaseConfigFromEnv,
} from "../../src/lib/storage/filebase-store";

/**
 * Neon Function `cleanup`.
 *
 * Neon hosts the orchestration; Filebase performs the physical deletion when
 * this handler calls `DeleteObjects`. This is **not** Filebase lifecycle
 * expiry — Filebase rejects `PutBucketLifecycleConfiguration` with 501, so no
 * bucket TTL exists.
 *
 * Two callers:
 *
 * 1. **A Neon `schedule` trigger.** Provenance is the presence of
 *    `x-neon-trigger-invocation-id`, which Neon's proxy strips from client
 *    requests, plus equality with `invocation_id` in the body. No secret or JWT
 *    is required on this path — Neon does not send one, and demanding it would
 *    drop real deliveries.
 * 2. **An operator.** Authenticated with `x-cleanup-secret`, compared in
 *    constant time *before* any parsing or database work. With no
 *    `CLEANUP_SECRET` configured the handler refuses to run at all.
 *
 * Neither path accepts an apology id or an object key from the caller: the
 * database selects what is due.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function isAuthorized(request: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const isTrigger = request.headers.has("x-neon-trigger-invocation-id");

  if (isTrigger) {
    const parsed = await parseTriggerDelivery(request);
    if (!parsed.ok) {
      return {
        ok: false,
        response: json({ error: parsed.error }, parsed.error === "invalid_body" ? 400 : 401),
      };
    }
    // Provenance marker for the acceptance harness. Neon strips this header
    // from client requests, so only a real scheduler delivery carries it.
    console.log(
      "[cleanup] trigger delivery",
      request.headers.get("x-neon-trigger-invocation-id"),
    );
    return { ok: true };
  }

  const secret = process.env.CLEANUP_SECRET;
  if (!secret || secret.length < 32) {
    return { ok: false, response: json({ error: "cleanup not configured" }, 503) };
  }

  const provided = request.headers.get("x-cleanup-secret") ?? "";
  if (!safeCompare(secret, provided)) {
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  return { ok: true };
}

const handler = {
  async fetch(request: Request): Promise<Response> {
    const auth = await isAuthorized(request);
    if (!auth.ok) return auth.response;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return json({ error: "DATABASE_URL is not injected" }, 503);

    try {
      const db = createDb(databaseUrl);
      // Explicit FILEBASE_* values only: ambient AWS_* variables belong to
      // Neon Object Storage and would point at the wrong store.
      const objects = new FilebaseObjectStore(
        createS3Transport(filebaseConfigFromEnv()),
      );

      const report = await runCleanup({
        store: new PostgresLifecycleStore(db),
        objects,
      });

      return json({
        ok: true,
        scanned: report.scanned,
        deleted: report.deleted,
        retried: report.retried,
        skipped: report.skipped,
        // Ids only — never names, messages or keys.
        outcomes: report.outcomes.map((outcome) => ({
          id: outcome.apologyId,
          status: outcome.status,
          ...(outcome.status === "retry" ? { remaining: outcome.remaining } : {}),
        })),
      });
    } catch (error) {
      console.error("[cleanup] run failed", error);
      return json({ error: "cleanup failed; the next run will retry" }, 500);
    }
  },
};

export default handler;
