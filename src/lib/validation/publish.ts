import { getExperience } from "@/experiences/registry";
import { draftPayloadSchema, formatZodError } from "@/lib/validation/apology";
import type { ApologyRecord } from "@/types/apology";

export type PublishValidationResult =
  | { ok: true }
  | { ok: false; error: string; fields?: Record<string, string> };

/**
 * Shared completeness validator for publishing drafts (used by both the REST API
 * route and server actions so experience and apology rules never drift).
 */
export function validateDraftForPublish(
  record: Pick<
    ApologyRecord,
    | "experienceType"
    | "content"
    | "recipientName"
    | "senderName"
    | "situation"
    | "situationCustom"
    | "language"
    | "messages"
    | "themeId"
    | "stickerPackId"
    | "customization"
  >,
): PublishValidationResult {
  const experienceType = record.experienceType ?? "apology";
  if (experienceType !== "apology") {
    const exp = getExperience(experienceType);
    if (!exp) {
      return { ok: false, error: "Unsupported experience type." };
    }
    const expRequired = exp.draftSchema.safeParse(record.content);
    if (!expRequired.success) {
      return {
        ok: false,
        error: "Finish the required parts of this experience before publishing.",
        fields: formatZodError(expRequired.error),
      };
    }
    return { ok: true };
  }

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

  if (!required.success) {
    return {
      ok: false,
      error: "Finish the required parts of the letter before publishing.",
      fields: formatZodError(required.error),
    };
  }

  return { ok: true };
}
