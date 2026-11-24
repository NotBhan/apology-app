import { z } from "zod";
import { getResponseRepository } from "@/lib/storage";
import { getExperience } from "@/experiences/registry";
import { formatZodError } from "@/lib/validation/apology";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ experienceId: string }> };

const experienceReplyRequestSchema = z.object({
  responseId: z.string().uuid("Invalid draft ID").optional(),
  experienceType: z.string().trim().min(1, "Experience type required"),
  content: z.record(z.string(), z.unknown()),
});

/**
 * Creates and publishes an anonymous Experience Reply to a published experience.
 *
 * Reuses the existing shared response infrastructure and capability tokens:
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

  if (!/^[0-9a-f-]{36}$/i.test(apologyId)) {
    return jsonError(404, "Invalid experience ID.");
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON payload.");
  }

  const parsedRequest = experienceReplyRequestSchema.safeParse(body.data);
  if (!parsedRequest.success) {
    const firstIssue = parsedRequest.error.issues[0]?.message ?? "Invalid response payload.";
    return jsonError(400, firstIssue);
  }

  const { responseId, experienceType, content } = parsedRequest.data;

  const exp = getExperience(experienceType);
  if (!exp) {
    return jsonError(400, "Unknown experience type.");
  }

  const validatedContent = exp.draftSchema.safeParse(content);
  if (!validatedContent.success) {
    return jsonError(400, "Check the highlighted fields.", formatZodError(validatedContent.error));
  }

  const replyPayload = {
    experienceType: exp.id,
    content: validatedContent.data as Record<string, unknown>,
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
      const draft = await repository.createDraft(apologyId, "experience", replyPayload);
      draftId = draft.id;
    }

    const { publicToken, manageToken } = await repository.publishResponse(draftId, replyPayload);

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
