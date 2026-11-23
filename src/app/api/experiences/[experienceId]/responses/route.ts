import { requireApiCreator } from "@/lib/security/creator";
import { getResponseRepository } from "@/lib/storage";
import { jsonError, jsonOk, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ experienceId: string }> };

/**
 * Creator endpoint to list all published responses for their own experience.
 * Protected by Neon Auth session / scopeKey.
 */
export async function GET(request: Request, context: RouteContext) {
  const { experienceId: apologyId } = await context.params;

  const limit = await enforceRateLimit(request, "serveUpload");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  if (!/^[0-9a-f-]{36}$/i.test(apologyId)) {
    return jsonError(404, "Invalid experience ID.");
  }

  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;

    const repository = getResponseRepository();
    const responses = await repository.listResponsesForApology(apologyId, authz.creator.key);

    return jsonOk({ responses });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
