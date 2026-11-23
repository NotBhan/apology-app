import { z } from "zod";
import { getResponseRepository } from "@/lib/storage";
import { quickReplyPayloadSchema } from "@/lib/validation/response";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ experienceId: string }> };

const quickReplyRequestSchema = quickReplyPayloadSchema.extend({
  responseId: z.string().uuid("Invalid draft ID").optional(),
});

/**
 * Creates and publishes an anonymous Quick Reply to a published experience.
 *
 * Generates and returns dual capability tokens:
 * - publicToken: bearer viewing capability (/response/[publicToken])
 * - manageToken: author management capability (/response/manage/[manageToken])
 *
 * Neither token is ever persisted in plaintext; only SHA-256 hashes are stored.
 */
export async function POST(request: Request, context: RouteContext) {
  const { experienceId: apologyId } = await context.params;

  const limit = await enforceRateLimit(request, "publish");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON payload.");
  }

  const parsed = quickReplyRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid response payload.";
    return jsonError(400, firstIssue);
  }

  const { responseId, message, recipientEmotion, photos } = parsed.data;
  const content = {
    message,
    recipientEmotion,
    photos: photos ?? [],
  };

  try {
    const repository = getResponseRepository();

    let draftId = responseId;
    if (draftId) {
      const draft = await repository.getDraft(draftId);
      if (!draft || draft.apologyId !== apologyId) {
        return jsonError(404, "Draft could not be found.");
      }
    } else {
      const draft = await repository.createDraft(apologyId, "quick", content);
      draftId = draft.id;
    }

    const { publicToken, manageToken } = await repository.publishResponse(draftId, content);

    return jsonOk(
      {
        ok: true,
        publicToken,
        manageToken,
        publicUrl: `/response/${publicToken}`,
        manageUrl: `/response/manage/${manageToken}`,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PARENT_NOT_ACCESSIBLE") {
      return jsonError(404, "That experience is no longer accessible.");
    }
    return repositoryErrorResponse(error);
  }
}
