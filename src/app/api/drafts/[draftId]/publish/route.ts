import { constantTimeEqual } from "@/lib/id";
import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { draftPayloadSchema, formatZodError, linkDurationDaysSchema } from "@/lib/validation/apology";
import { DEFAULT_LINK_DAYS, normalizeDurationDays } from "@/lib/expiry";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/security/postgres-rate-limit";

export const dynamic = "force-dynamic";

/** Public recipient page that renders `GET /api/letters/[token]`. */
const LETTER_PATH_PREFIX = "/letter";

type PublishRouteContext = { params: Promise<{ draftId: string }> };

/**
 * Publishes a draft and returns `{ token, path, expiresAt }` to the owner only.
 *
 * The body may carry `{ durationDays }` (1–7). Anything outside that window is
 * rejected rather than clamped, so a caller never silently gets a different
 * lifetime than it asked for.
 *
 * The stored content is re-validated against `draftPayloadSchema` first, so a
 * draft that is still missing any of its three messages (or a name) cannot be
 * shared by a stale tab or a direct API call.
 */
export async function POST(request: Request, context: PublishRouteContext) {
  const { draftId } = await context.params;

  const limit = await enforceRateLimit(request, "publish");
  if (!limit.allowed) {
    return jsonError(429, "Too many requests. Try again shortly.", undefined, rateLimitHeaders(limit));
  }



  const body = await readJsonBody(request);
  const requested =
    body.ok && body.data && typeof body.data === "object"
      ? (body.data as { durationDays?: unknown }).durationDays
      : undefined;

  const duration = linkDurationDaysSchema.safeParse(requested ?? DEFAULT_LINK_DAYS);
  if (!duration.success) {
    return jsonError(400, "Choose a link lifetime between 1 and 7 days.", {
      durationDays: duration.error.issues[0]?.message ?? "Invalid lifetime.",
    });
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

    // Apology completeness is a rule of the apology module, not of the platform.
    const isExperience = (record.experienceType ?? "apology") !== "apology";

    const required = draftPayloadSchema.safeParse({
      recipientName: record.recipientName,
      senderName: record.senderName,
      situation: record.situation,
      situationCustom: record.situationCustom,
      language: record.language,
      messages: record.messages,
      themeId: record.themeId,
      stickerPackId: record.stickerPackId,
      customization: record.customization,
    });

    if (!required.success && !isExperience) {
      return jsonError(
        400,
        "Finish the required parts of the letter before publishing.",
        formatZodError(required.error),
      );
    }

    const published = await repository.publish(draftId, owner.hash, duration.data);
    const token = published.accessToken;

    return jsonOk({
      token,
      path: `${LETTER_PATH_PREFIX}/${encodeURIComponent(token)}`,
      expiresAt: published.expiresAt,
      durationDays: normalizeDurationDays(duration.data),
    });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
