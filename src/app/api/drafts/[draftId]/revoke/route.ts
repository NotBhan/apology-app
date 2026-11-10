import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

type RevokeRouteContext = { params: Promise<{ draftId: string }> };

/**
 * Revokes a shared letter. The token stops resolving immediately; the draft is
 * kept for the owner, and `accessToken` is never echoed back in the response.
 * Idempotent — revoking an already revoked letter is a no-op.
 */
export async function POST(request: Request, context: RevokeRouteContext) {
  const { draftId } = await context.params;

  const limit = await enforceRateLimit(request, "publish");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }



  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;
    const owner = { hash: authz.creator.key };

    const repository = await getRepository();
    const record = await repository.revoke(draftId, owner.hash);
    return jsonOk({ draft: toCreatorDraft(record) });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
