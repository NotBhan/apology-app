import { getResponseRepository } from "@/lib/storage";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Public bearer-capability endpoint for fetching a published response and parent context.
 * Returns 404 for unknown, revoked, deleted, or parent-revoked responses.
 */
export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const limit = await enforceRateLimit(request, "serveUpload");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  if (!/^[A-Za-z0-9_-]{10,96}$/.test(token)) {
    return jsonError(404, "We could not find that response.");
  }

  try {
    const repository = getResponseRepository();
    const result = await repository.getByPublicToken(token);

    if (!result) {
      return jsonError(404, "We could not find that response.");
    }

    return jsonOk({
      response: result.response,
      parent: {
        recipientName: result.parent.recipientName,
        senderName: result.parent.senderName,
        publishedAt: result.parent.publishedAt,
      },
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
