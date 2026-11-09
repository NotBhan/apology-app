import "server-only";
import { constantTimeEqual } from "@/lib/id";
import { getRepository } from "@/lib/storage";
import { purgeApology } from "@/lib/lifecycle";

/**
 * Manual delete. Same lifecycle as the scheduled purge: verify ownership, then
 * run the identical asset-then-record workflow so a manual deletion cannot
 * leave different residue than an expired one.
 *
 * Throws `FORBIDDEN` for a mismatched owner, matching the repository's
 * vocabulary so callers can map it with `repositoryErrorResponse`.
 */
export async function deleteDraftForOwner(
  id: string,
  ownerKeyHash: string,
): Promise<{ deleted: boolean; assetsRemoved: number; pending: boolean }> {
  const repository = await getRepository();
  const record = await repository.getDraft(id);
  if (!record) return { deleted: false, assetsRemoved: 0, pending: false };
  if (!constantTimeEqual(record.ownerKeyHash, ownerKeyHash)) {
    throw new Error("FORBIDDEN");
  }

  const outcome = await purgeApology(id, "manual");
  if (outcome.status === "deleted") {
    return { deleted: true, assetsRemoved: outcome.assetsDeleted, pending: false };
  }
  // Storage failed: the job is queued and the next scheduled run retries it.
  return { deleted: false, assetsRemoved: 0, pending: true };
}
