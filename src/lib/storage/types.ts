import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";

export interface ApologyRepository {
  createDraft(ownerKeyHash: string, seed: { recipientName: string; senderName: string }): Promise<ApologyRecord>;
  getDraft(id: string): Promise<ApologyRecord | undefined>;
  saveDraft(id: string, ownerKeyHash: string, payload: DraftPayload): Promise<ApologyRecord>;
  /** Re-publishes with a fresh 1–7 day window; the token is reused. */
  publish(id: string, ownerKeyHash: string, durationDays: number): Promise<ApologyRecord>;
  revoke(id: string, ownerKeyHash: string): Promise<ApologyRecord>;
  remove(id: string, ownerKeyHash: string): Promise<void>;
  listByOwner(ownerKeyHash: string): Promise<ApologyDraft[]>;
  /** Recipient read path: token + published status only. */
  getPublishedByToken(token: string): Promise<PublishedApology | undefined>;
  /** Look up a record by its access token, for the creator's own preview. */
  getByToken(token: string): Promise<ApologyRecord | undefined>;
}

export function toPublished(record: ApologyRecord): PublishedApology {
  return {
    recipientName: record.recipientName,
    senderName: record.senderName,
    situation: record.situation,
    situationCustom: record.situationCustom,
    messages: record.messages,
    themeId: record.themeId,
    stickerPackId: record.stickerPackId,
    customization: record.customization,
    publishedAt: record.publishedAt ?? record.updatedAt,
  };
}

/** Strips server-only fields before anything crosses the network. */
export function toCreatorDraft(record: ApologyRecord): ApologyDraft {
  return {
    id: record.id,
    recipientName: record.recipientName,
    senderName: record.senderName,
    situation: record.situation,
    situationCustom: record.situationCustom,
    language: record.language,
    messages: record.messages,
    themeId: record.themeId,
    stickerPackId: record.stickerPackId,
    customization: record.customization,
    linkDurationDays: record.linkDurationDays ?? 3,
    expiresAt: record.expiresAt,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
  };
}
