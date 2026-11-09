import "server-only";
import type { ApologyRecord } from "@/types/apology";
import type { ApologyRepository } from "@/lib/storage/types";
import type { PurgeStore } from "./purge-store";
import {
  DEFAULT_LEASE_MS,
  type DeletionJob,
  type PurgeOutcome,
  type PurgeReport,
} from "./types";

/**
 * The purge worker.
 *
 * Runs in two passes over the same code path:
 *   1. records whose `expiresAt` has passed, and
 *   2. jobs left behind by a previous run that could not finish.
 *
 * Order matters. Assets are removed *before* the record, because a record that
 * still points at missing photos is worse than a leftover file: the record is
 * what a person can see. If storage fails, the job is kept and retried, so a
 * failure can never silently strand bytes.
 *
 * Every step is idempotent. Deleting an object twice, deleting a missing
 * record, or running two workers at once all converge on the same result.
 */

export interface PurgeUploads {
  remove(id: string): Promise<void>;
  stat(id: string): Promise<boolean>;
}

/** Only the three repository capabilities the worker needs. */
export type PurgeRepository = Pick<ApologyRepository, "listExpired" | "getDraft" | "purge">;

export interface PurgeDeps {
  store: PurgeStore;
  repository: PurgeRepository;
  uploads: PurgeUploads;
  /** Injected clock; tests drive expiry without waiting. */
  now?: () => number;
  limit?: number;
  leaseMs?: number;
}

/**
 * Why a record is being purged. A published record with no valid expiry is
 * "legacy", not "expired": it was written before expiry became mandatory, it is
 * already inaccessible, and it must still be removed.
 */
export function expiryReason(
  record: Pick<ApologyRecord, "status" | "expiresAt">,
): "expired" | "legacy" | "manual" {
  if (record.status !== "published") return "manual";
  return Number.isFinite(Date.parse(record.expiresAt ?? "")) ? "expired" : "legacy";
}

export interface PurgeCandidate {
  apologyId: string;
  reason: "expired" | "legacy" | "retry";
}

/**
 * Read-only audit of what the next run would touch. Powers the dry-run mode of
 * the cron endpoint, so an operator can see legacy records before deleting them.
 */
export async function listPurgeCandidates(
  deps: PurgeDeps,
  limit = 100,
): Promise<PurgeCandidate[]> {
  const nowMs = deps.now ? deps.now() : Date.now();
  const expired = await deps.repository.listExpired(new Date(nowMs).toISOString(), limit);
  const retryable = await deps.store.listRetryable(nowMs, limit);

  const found = new Map<string, PurgeCandidate>();
  for (const record of expired) {
    const reason = expiryReason(record);
    found.set(record.id, {
      apologyId: record.id,
      reason: reason === "legacy" ? "legacy" : "expired",
    });
  }
  for (const job of retryable) {
    if (!found.has(job.apologyId)) {
      found.set(job.apologyId, { apologyId: job.apologyId, reason: "retry" });
    }
  }
  return [...found.values()];
}

export async function runPurge(deps: PurgeDeps): Promise<PurgeReport> {
  const nowMs = deps.now ? deps.now() : Date.now();
  const limit = deps.limit ?? 25;
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const nowIso = new Date(nowMs).toISOString();

  const expired = await deps.repository.listExpired(nowIso, limit);
  const retryable = await deps.store.listRetryable(nowMs, limit);

  // One attempt per apology even if both passes name it.
  const candidates = new Map<string, { record?: ApologyRecord; job?: DeletionJob }>();
  for (const record of expired) candidates.set(record.id, { record });
  for (const job of retryable) {
    const existing = candidates.get(job.apologyId);
    if (existing) existing.job = job;
    else candidates.set(job.apologyId, { job });
  }

  const outcomes: PurgeOutcome[] = [];

  for (const [apologyId, candidate] of candidates) {
    const outcome = await purgeOne(deps, {
      apologyId,
      record: candidate.record,
      job: candidate.job,
      nowMs,
      leaseMs,
    });
    outcomes.push(outcome);
    if (outcomes.length >= limit) break;
  }

  return {
    scanned: candidates.size,
    deleted: outcomes.filter((o) => o.status === "deleted").length,
    retried: outcomes.filter((o) => o.status === "retry").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    outcomes,
  };
}

interface PurgeOneArgs {
  apologyId: string;
  record?: ApologyRecord;
  job?: DeletionJob;
  nowMs: number;
  leaseMs: number;
  reason?: "expired" | "legacy" | "manual";
}

async function purgeOne(deps: PurgeDeps, args: PurgeOneArgs): Promise<PurgeOutcome> {
  const { apologyId, nowMs, leaseMs } = args;

  const record = args.record ?? (await deps.repository.getDraft(apologyId));
  const job = args.job ?? (await deps.store.getJob(apologyId));

  // Nothing to do. Checked before claiming so a manual delete of an unknown id
  // does not create an empty job that then "deletes" itself.
  if (!record && !job) {
    return { status: "skipped", apologyId, reason: "missing" };
  }

  const claimed = await deps.store.claim(apologyId, nowMs, leaseMs);
  if (!claimed) {
    return { status: "skipped", apologyId, reason: "leased" };
  }

  // The manifest: everything this apology owns. Merged with whatever a
  // previous run already recorded, so a retry cannot lose an id.
  const assetIds = new Set<string>(job?.assetIds ?? []);
  if (record) {
    for (const photo of record.customization.photos) {
      if (photo.id) assetIds.add(photo.id);
    }
    if (record.customization.audio.assetId) assetIds.add(record.customization.audio.assetId);
  }

  const working: DeletionJob = {
    apologyId,
    ownerKeyHash: record?.ownerKeyHash ?? job?.ownerKeyHash,
    assetIds: [...assetIds],
    attempts: (job?.attempts ?? 0) + 1,
    lastError: undefined,
    createdAt: job?.createdAt ?? new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
    leaseUntil: nowMs + leaseMs,
  };

  // 1. Remove every storage object, tolerating failures per object.
  const failures: string[] = [];
  for (const assetId of working.assetIds) {
    try {
      await deps.uploads.remove(assetId);
    } catch (error) {
      failures.push(`${assetId}: ${describe(error)}`);
    }
  }

  // 2. Verify: anything still present counts as a failure even if remove()
  //    reported success.
  for (const assetId of working.assetIds) {
    try {
      if (await deps.uploads.stat(assetId)) failures.push(`${assetId}: still present`);
    } catch (error) {
      failures.push(`${assetId}: verify failed (${describe(error)})`);
    }
  }

  if (failures.length > 0) {
    working.lastError = failures.slice(0, 5).join("; ");
    working.leaseUntil = undefined;
    await deps.store.saveJob(working);
    return {
      status: "retry",
      apologyId,
      error: working.lastError,
      remainingAssets: failures.length,
    };
  }

  // 3. Only now remove the record.
  let assetsDeleted = working.assetIds.length;
  if (record) {
    await deps.repository.purge(apologyId);

    const stillThere = await deps.repository.getDraft(apologyId);
    if (stillThere) {
      working.lastError = "record still present after delete";
      working.leaseUntil = undefined;
      await deps.store.saveJob(working);
      return {
        status: "retry",
        apologyId,
        error: working.lastError,
        remainingAssets: 0,
      };
    }

    // 4. Minimal operational record: id, owner hash, counts. No content.
    await deps.store.writeTombstone({
      apologyId,
      ownerKeyHash: record.ownerKeyHash,
      deletedAt: new Date(nowMs).toISOString(),
      assetsDeleted,
      reason: args.reason ?? expiryReason(record),
    });
  } else {
    assetsDeleted = 0;
  }

  await deps.store.removeJob(apologyId);
  return { status: "deleted", apologyId, assetsDeleted };
}

/** Manual delete path: same lifecycle, no expiry check. */
export async function purgeNow(
  deps: PurgeDeps,
  apologyId: string,
  reason: "expired" | "legacy" | "manual" = "manual",
): Promise<PurgeOutcome> {
  const nowMs = deps.now ? deps.now() : Date.now();
  const record = await deps.repository.getDraft(apologyId);
  return purgeOne(deps, {
    apologyId,
    record,
    nowMs,
    leaseMs: deps.leaseMs ?? DEFAULT_LEASE_MS,
    reason,
  });
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 120);
  return String(error).slice(0, 120);
}
