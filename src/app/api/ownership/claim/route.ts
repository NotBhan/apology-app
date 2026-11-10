import { requireApiCreator } from "@/lib/security/creator";
import { getLegacyOwnerHash } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { jsonOk, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

/**
 * Claims the records created by this browser before Neon Auth existed.
 *
 * Both proofs are required: the session decides *who* receives the rows, and
 * the legacy cookie decides *which* rows. Neither alone is enough — a session
 * cannot guess a hash, and a cookie cannot choose a destination account.
 *
 * The update is a single statement guarded by `user_id IS NULL`, so repeats
 * and concurrent callers are no-ops rather than reassignments. Recipient
 * tokens, publication state, expiry, media, deletion jobs and tombstones are
 * untouched.
 */
export async function POST() {
  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;

    const legacyKeyHash = await getLegacyOwnerHash();
    if (!legacyKeyHash) {
      return jsonOk({ claimed: 0, reason: "no_legacy_cookie" });
    }

    const repository = await getRepository();
    const claimed = await repository.claimLegacyRecords({
      userId: authz.creator.userId,
      scopeKey: authz.creator.key,
      legacyKeyHash,
    });

    return jsonOk({ claimed });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
