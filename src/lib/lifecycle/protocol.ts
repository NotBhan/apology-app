import type { ObjectStore } from "../storage/object-store";
import { sanitiseStorageError } from "../storage/filebase-errors";
import type { LifecycleStore } from "./store";
import {
  DEFAULT_LEASE_MS,
  STALE_RESERVATION_MS,
  type CleanupReport,
  type DeletionJob,
  type SaveResult,
} from "./types";

/**
 * The deletion protocol.
 *
 * Shared by the Neon cleanup function and the tests. It has no timer, no
 * scheduler and no loop of its own: it runs once per invocation over whatever
 * the database says is due.
 *
 * Ordering is deliberate:
 *   intent → claim → snapshot keys → (defer | reap) reservations →
 *   delete objects → verify → delete rows + tombstone → completed.
 *
 * No database transaction is held across an object-storage call.
 */

export interface CleanupDeps {
  store: LifecycleStore;
  objects: ObjectStore;
  now?: () => Date;
  limit?: number;
  leaseMs?: number;
  staleReservationMs?: number;
}

export async function runCleanup(deps: CleanupDeps): Promise<CleanupReport> {
  const now = deps.now ? deps.now() : new Date();
  const limit = deps.limit ?? 25;
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const staleMs = deps.staleReservationMs ?? STALE_RESERVATION_MS;

  const candidates = await deps.store.listCandidates(now, limit);
  const outcomes: SaveResult[] = [];

  for (const candidate of candidates) {
    // An expired apology gets its durable intent first; a job candidate already
    // has one.
    if (candidate.source === "expired") {
      await deps.store.requestDeletionForExpiry(candidate.apologyId, now);
    }

    const job = await deps.store.claim(candidate.apologyId, now, leaseMs);
    if (!job) {
      outcomes.push({
        status: "skipped",
        apologyId: candidate.apologyId,
        reason: "leased",
      });
      continue;
    }

    outcomes.push(await purgeOne(deps, job, now, staleMs));
  }

  return {
    scanned: candidates.length,
    deleted: outcomes.filter((o) => o.status === "deleted").length,
    retried: outcomes.filter((o) => o.status === "retry").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    outcomes,
  };
}

async function purgeOne(
  deps: CleanupDeps,
  job: DeletionJob,
  now: Date,
  staleMs: number,
): Promise<SaveResult> {
  // 1. Keys: the job snapshot is authoritative; the live table may have grown.
  const live = await deps.store.objectKeys(job.apologyId);
  const keys = [...new Set([...job.objectKeys, ...live])];

  if (keys.length === 0 && job.ownerKeyHash === undefined) {
    return { status: "skipped", apologyId: job.apologyId, reason: "missing" };
  }

  // 2. A pending reservation means a PutObject may still land.
  const pending = await deps.store.pendingReservations(job.apologyId);
  if (pending.length > 0) {
    const staleBefore = now.getTime() - staleMs;
    const stale = pending.filter((reservation) => reservation.createdAt.getTime() <= staleBefore);

    if (stale.length < pending.length) {
      // At least one upload is still plausibly in flight: do not finalise.
      await deps.store.defer(job, "pending upload", now);
      return {
        status: "retry",
        apologyId: job.apologyId,
        error: "pending upload",
        remaining: keys.length,
      };
    }

    // All reservations are abandoned. Remove their objects too, then unblock.
    const staleKeys = stale.map((reservation) => reservation.objectKey);
    try {
      await deps.objects.deleteMany(staleKeys);
    } catch (error) {
      const message = sanitiseStorageError(error);
      await deps.store.fail(job, message, now);
      return {
        status: "retry",
        apologyId: job.apologyId,
        error: message,
        remaining: keys.length,
      };
    }
    await deps.store.abandonReservations(stale.map((reservation) => reservation.id));
    for (const key of staleKeys) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  // 3. Delete every object.
  let deleted: { deleted: string[]; missing: string[]; failed: { key: string; code: string }[] };
  try {
    deleted = await deps.objects.deleteMany(keys);
  } catch (error) {
    const message = sanitiseStorageError(error);
    await deps.store.fail(job, message, now);
    return {
      status: "retry",
      apologyId: job.apologyId,
      error: message,
      remaining: keys.length,
    };
  }

  if (deleted.failed.length > 0) {
    const message = deleted.failed
      .slice(0, 5)
      .map((entry) => `${entry.code}`)
      .join(", ");
    await deps.store.fail(job, message, now);
    return {
      status: "retry",
      apologyId: job.apologyId,
      error: message,
      remaining: deleted.failed.length,
    };
  }

  // 4. Verify rather than trust the delete response.
  const survivors: string[] = [];
  for (const key of keys) {
    try {
      const head = await deps.objects.head(key);
      if (head.exists) survivors.push(key);
    } catch (error) {
      const message = sanitiseStorageError(error);
      await deps.store.fail(job, message, now);
      return {
        status: "retry",
        apologyId: job.apologyId,
        error: message,
        remaining: keys.length,
      };
    }
  }

  if (survivors.length > 0) {
    const message = `${survivors.length} object(s) still present`;
    await deps.store.fail(job, message, now);
    return {
      status: "retry",
      apologyId: job.apologyId,
      error: message,
      remaining: survivors.length,
    };
  }

  // 5. Only now remove the rows, write the tombstone and complete the job.
  await deps.store.finalize(job, keys.length, now);
  return { status: "deleted", apologyId: job.apologyId, assetsDeleted: keys.length };
}
