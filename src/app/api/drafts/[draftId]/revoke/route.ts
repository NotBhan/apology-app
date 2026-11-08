import { getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

type RevokeRouteContext = { params: Promise<{ draftId: string }> };

/**
 * Revokes a shared letter. The token stops resolving immediately; the draft is
 * kept for the owner, and `accessToken` is never echoed back in the response.
 * Idempotent — revoking an already revoked letter is a no-op.
 */
export async function POST(_request: Request, context: RevokeRouteContext) {
  const { draftId } = await context.params;

  try {
    const owner = await getOwner();
    if (!owner) return jsonError(403, "You do not have access to this draft.");

    const repository = await getRepository();
    const record = await repository.revoke(draftId, owner.hash);
    return jsonOk({ draft: toCreatorDraft(record) });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
