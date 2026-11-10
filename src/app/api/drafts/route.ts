import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { createDraftSchema, formatZodError } from "@/lib/validation/apology";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";
import { getExperience } from "@/experiences/registry";

export const dynamic = "force-dynamic";

/**
 * Lists the drafts owned by this browser's creator cookie.
 * Reading never mints an identity: a first-time visitor simply has no drafts.
 */
export async function GET() {
  try {

    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;

    const repository = await getRepository();
    const drafts = await repository.listByOwner(authz.creator.key);
    return jsonOk({ drafts });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/**
 * Creates a draft seeded with the two names. The owner is the verified Neon
 * Auth user — never the request body, and never a freshly minted cookie.
 */
export async function POST(request: Request) {
  const limit = await enforceRateLimit(request, "createDraft");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  const authz = await requireApiCreator();
  if (!authz.ok) return authz.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const requested = (body.data ?? {}) as { experienceType?: unknown; content?: unknown };
  const requestedType =
    typeof requested.experienceType === "string" ? requested.experienceType : "apology";

  if (requestedType !== "apology") {
    const experience = getExperience(requestedType);
    if (!experience) return jsonError(400, "Unknown experience.");

    const content = experience.draftSchema.safeParse(requested.content);
    if (!content.success) {
      return jsonError(400, "Check the highlighted fields.", formatZodError(content.error));
    }

    const names = content.data as { recipientName: string; senderName: string };
    try {
      const repository = await getRepository();
      const record = await repository.createDraft(
        { userId: authz.creator.userId, scopeKey: authz.creator.key, legacyKey: authz.creator.legacyKey },
        { recipientName: names.recipientName, senderName: names.senderName },
        { experienceType: requestedType, content: content.data },
      );
      return jsonOk({ draft: { ...toCreatorDraft(record), experienceType: requestedType } }, 201);
    } catch (error) {
      return repositoryErrorResponse(error);
    }
  }

  const parsed = createDraftSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, "Check the highlighted fields.", formatZodError(parsed.error));
  }

  try {

    const repository = await getRepository();
    const record = await repository.createDraft(
      { userId: authz.creator.userId, scopeKey: authz.creator.key, legacyKey: authz.creator.legacyKey },
      parsed.data,
    );
    return jsonOk({ draft: toCreatorDraft(record) }, 201);
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
