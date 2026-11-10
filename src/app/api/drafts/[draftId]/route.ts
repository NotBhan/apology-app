import { z } from "zod";
import { constantTimeEqual } from "@/lib/id";
import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { draftPayloadSchema, formatZodError } from "@/lib/validation/apology";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

/** A draft autosaves before it is finished, so empty strings are allowed here. */
const editableMessage = z
  .string()
  .trim()
  .max(320, "Message must be 320 characters or fewer.")
  .default("");

/**
 * Save schema: the same shape as `draftPayloadSchema` (the publish contract),
 * minus the "must not be empty" rule on the three messages. Publishing is what
 * requires real content; saving must not, or nothing could be autosaved.
 */
const saveDraftSchema = draftPayloadSchema.extend({
  messages: z.object({
    message1: editableMessage,
    message2: editableMessage,
    message3: editableMessage,
    personalNote: z
      .string()
      .trim()
      .max(1200, "Personal note must be 1200 characters or fewer.")
      .default(""),
  }),
});

type DraftRouteContext = { params: Promise<{ draftId: string }> };

/** Owner-only read. `toCreatorDraft` strips `accessToken` and `ownerKeyHash`. */
export async function GET(_request: Request, context: DraftRouteContext) {
  const { draftId } = await context.params;

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

    return jsonOk({ draft: toCreatorDraft(record) });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** Owner-only save. Replaces the editable fields with the submitted draft. */
export async function PATCH(request: Request, context: DraftRouteContext) {
  const { draftId } = await context.params;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = saveDraftSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(400, "Check the highlighted fields.", formatZodError(parsed.error));
  }

  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;
    const owner = { hash: authz.creator.key };

    const repository = await getRepository();
    const record = await repository.saveDraft(draftId, owner.hash, parsed.data);
    return jsonOk({ draft: toCreatorDraft(record) });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}

/** Owner-only delete. Idempotent: deleting an already-gone draft is not an error. */
export async function DELETE(_request: Request, context: DraftRouteContext) {
  const { draftId } = await context.params;

  try {
    const authz = await requireApiCreator();
    if (!authz.ok) return authz.response;
    const owner = { hash: authz.creator.key };

    const repository = await getRepository();
    const marked = await repository.requestDeletionByOwner(draftId, owner.hash);
    return jsonOk({ ok: true, queued: marked });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
