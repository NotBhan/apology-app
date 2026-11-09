import "server-only";
import { getRepository } from "@/lib/storage";
import { removeUpload, uploadExists } from "@/lib/storage/uploads";
import { getPurgeStore } from "./purge-store";
import { listPurgeCandidates, purgeNow, runPurge } from "./purge";
import type { PurgeDeps } from "./purge";
import type { PurgeOutcome, PurgeReport } from "./types";

/** Wires the worker to whatever backends this deployment is configured with. */
export async function defaultPurgeDeps(): Promise<PurgeDeps> {
  const [store, repository] = await Promise.all([getPurgeStore(), getRepository()]);
  return {
    store,
    repository,
    uploads: { remove: removeUpload, stat: uploadExists },
  };
}

/** Scheduled entry point: expiry pass plus retry pass. */
export async function purgeExpired(
  options: { now?: number; limit?: number } = {},
): Promise<PurgeReport> {
  const deps = await defaultPurgeDeps();
  const fixedNow = options.now;
  return runPurge({
    ...deps,
    // Tests drive a fixed clock; production uses the wall clock.
    now: fixedNow === undefined ? undefined : () => fixedNow,
    limit: options.limit,
  });
}

/** Read-only view of what the next run would delete. No mutation. */
export async function auditExpired(
  limit = 100,
): Promise<Awaited<ReturnType<typeof listPurgeCandidates>>> {
  const deps = await defaultPurgeDeps();
  return listPurgeCandidates(deps, limit);
}

/** Manual delete from the creator's Manage page. Same lifecycle, no expiry wait. */
export async function purgeApology(
  apologyId: string,
  reason: "expired" | "legacy" | "manual" = "manual",
): Promise<PurgeOutcome> {
  const deps = await defaultPurgeDeps();
  return purgeNow(deps, apologyId, reason);
}

export type { PurgeOutcome, PurgeReport };
