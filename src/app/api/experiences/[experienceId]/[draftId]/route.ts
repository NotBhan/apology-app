import { requireApiCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { getExperience } from "@/experiences/registry";
import { formatZodError } from "@/lib/validation/apology";
import { jsonError, jsonOk, readJsonBody, repositoryErrorResponse } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ experienceId: string; draftId: string }> };

/**
 * Updates a module-owned content document.
 *
 * The module's own schema is the authority: the route never accepts an
 * apology-shaped payload for a birthday record, and ownership is decided by
 * the guarded UPDATE, which returns no row for someone else's draft.
 */
export async function PATCH(request: Request, context: Context) {
  const { experienceId, draftId } = await context.params;

  const authz = await requireApiCreator();
  if (!authz.ok) return authz.response;

  const experience = getExperience(experienceId);
  if (!experience || experience.id === "apology") {
    return jsonError(400, "Unknown experience.");
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const content = experience.draftSchema.safeParse(
    (body.data as { content?: unknown } | null)?.content,
  );
  if (!content.success) {
    return jsonError(400, "Check the highlighted fields.", formatZodError(content.error));
  }

  try {
    const names = content.data as { recipientName: string; senderName: string };
    const repository = await getRepository();
    const record = await repository.saveExperienceContent(
      draftId,
      authz.creator.key,
      content.data,
      { recipientName: names.recipientName, senderName: names.senderName },
    );
    if (!record) return jsonError(404, "We could not find that draft.");
    return jsonOk({ draft: { ...toCreatorDraft(record), experienceType: experience.id } });
  } catch (error) {
    return repositoryErrorResponse(error);
  }
}
