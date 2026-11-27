import { constantTimeEqual } from "@/lib/id";
import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { validateDraftForPublish } from "@/lib/validation/publish";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

/** Public recipient page that renders `GET /api/letters/[token]`. */
const LETTER_PATH_PREFIX = "/letter";

type PublishRouteContext = { params: Promise<{ draftId: string }> };

/**
 * Publishes a draft and returns `{ token, path, alreadyPublished }` to the owner.
 *
 * Published links are permanent. The first publish mints the token; a repeat
 * publish of an already-published record keeps the token the recipient already
 * has, because only the hash is stored and the plaintext cannot be recovered.
 * In that case `token`/`path` are empty and `alreadyPublished` is true — the
 * link that was already sent keeps working rather than being replaced.
 *
 * The stored content is re-validated against the owning module's schema first,
 * so a draft that is still incomplete cannot be shared by a stale tab or a
 * direct API call.
 */
export async function POST(request: Request, context: PublishRouteContext) {
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
    const record = await repository.getDraft(draftId);
    if (!record) return jsonError(404, "We could not find that draft.");
    if (!constantTimeEqual(record.ownerKeyHash, owner.hash)) {
      return jsonError(403, "You do not have access to this draft.");
    }
    if (record.status === "revoked") {
      return jsonError(410, "This letter was revoked. Start a new draft to share it again.");
    }

    const validation = validateDraftForPublish(record);
    if (!validation.ok) {
      return jsonError(400, validation.error, validation.fields);
    }

    const published = await repository.publish(draftId, owner.hash);
    const token = published.accessToken;

    return jsonOk({
      token,
      path: token ? `${LETTER_PATH_PREFIX}/${encodeURIComponent(token)}` : "",
      alreadyPublished: !token,
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
