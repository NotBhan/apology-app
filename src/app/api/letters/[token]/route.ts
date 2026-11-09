import { getRepository } from "@/lib/storage";
import { toPublished } from "@/lib/storage/types";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** Tokens are 20 random bytes (≈27 base64url chars); anything else is a 404. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;

type LetterRouteContext = { params: Promise<{ token: string }> };

/**
 * Recipient read path.
 *
 * Returns only `PublishedApology` — the projection built by `toPublished`,
 * which never includes `accessToken`, `ownerKeyHash` or any other server-only
 * field. Revoked tokens answer 410, drafts that were never published 404.
 */
export async function GET(request: Request, context: LetterRouteContext) {
  const { token } = await context.params;

  const limit = await enforceRateLimit(request, "readLetter");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }



  if (!TOKEN_PATTERN.test(token)) {
    return jsonError(404, "We could not find that letter.");
  }

  try {
    const repository = await getRepository();
    const record = await repository.getByToken(token);
    if (!record) return jsonError(404, "We could not find that letter.");
    if (record.status === "revoked") {
      return jsonError(410, "This letter is no longer available.");
    }
    if (record.status !== "published") {
      return jsonError(404, "This letter has not been shared yet.");
    }

    return jsonOk(toPublished(record));
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
