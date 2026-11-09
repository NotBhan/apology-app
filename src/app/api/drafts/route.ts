import { getOrCreateOwner, getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { createDraftSchema, formatZodError } from "@/lib/validation/apology";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

/**
 * Lists the drafts owned by this browser's creator cookie.
 * Reading never mints an identity: a first-time visitor simply has no drafts.
 */
export async function GET() {
  try {
    const owner = await getOwner();
    if (!owner) return jsonOk({ drafts: [] });

    const repository = await getRepository();
    const drafts = await repository.listByOwner(owner.hash);
    return jsonOk({ drafts });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/**
 * Creates a draft seeded with the two names. The owner is derived from the
 * httpOnly cookie (`getOrCreateOwner`) — never from the request body.
 */
export async function POST(request: Request) {
  const limit = await enforceRateLimit(request, "createDraft");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = createDraftSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, "Check the highlighted fields.", formatZodError(parsed.error));
  }

  try {
    const owner = await getOrCreateOwner();
    const repository = await getRepository();
    const record = await repository.createDraft(owner.hash, parsed.data);
    return jsonOk({ draft: toCreatorDraft(record) }, 201);
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
