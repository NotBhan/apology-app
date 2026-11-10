import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";
import type { DeletionTombstone } from "@/lib/lifecycle/types";

/**
 * Persistence contract.
 *
 * Nothing here schedules or performs physical deletion. `remove()` and
 * `requestDeletionByOwner()` only enqueue durable intent; the Neon cleanup
 * function owns object and row removal.
 */

export type AssetState = "pending" | "uploaded" | "failed";

export interface AssetRecord {
  id: string;
  apologyId: string;
  state: AssetState;
  objectKey: string;
  kind: "photo" | "audio";
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ServingAsset extends AssetRecord {
  ownerKeyHash: string;
  apologyStatus: string;
  expiresAt: string | null;
}

export interface ReserveAssetInput {
  apologyId: string;
  ownerKeyHash: string;
  objectKey: string;
  kind: "photo" | "audio";
  contentType: string;
  sizeBytes: number;
  /** Maximum live (non-failed) assets the apology may hold. */
  maxAssets: number;
}

export interface DraftOwner {
  /** Verified Neon Auth user id. Always server-derived. */
  userId: string;
  /** Legacy hash, only when the creator still holds a pre-auth cookie. */
  legacyKey?: string;
  /** Value written to `owner_key_hash` so existing predicates match. */
  scopeKey: string;
}

export interface ApologyRepository {
  createDraft(
    owner: DraftOwner,
    seed: { recipientName: string; senderName: string },
    options?: { experienceType?: string; content?: unknown },
  ): Promise<ApologyRecord>;

  getDraft(id: string): Promise<ApologyRecord | undefined>;

  saveDraft(id: string, ownerKeyHash: string, payload: DraftPayload): Promise<ApologyRecord>;

  /**
   * Publishes or renews. Mints a **new** link token every time, because only
   * hashes are stored; the plaintext is returned once, on the result.
   */
  publish(id: string, ownerKeyHash: string, durationDays: number): Promise<ApologyRecord>;

  revoke(id: string, ownerKeyHash: string): Promise<ApologyRecord>;

  /** Manual deletion: marks inaccessible and enqueues intent. No object I/O. */
  remove(id: string, ownerKeyHash: string): Promise<void>;

  listByOwner(ownerKeyHash: string, legacyKeyHash?: string): Promise<ApologyDraft[]>;

  /**
   * Binds unclaimed legacy rows to an account. Atomic and idempotent: the
   * `user_id IS NULL` guard means a repeated or concurrent call claims nothing.
   * `owner_key_hash` is rewritten to the account scope key so the row becomes
   * operable through the normal predicates, and the legacy branch stops
   * matching it.
   */
  claimLegacyRecords(input: {
    userId: string;
    scopeKey: string;
    legacyKeyHash: string;
  }): Promise<number>;

  getPublishedByToken(token: string): Promise<PublishedApology | undefined>;

  getByToken(token: string): Promise<ApologyRecord | undefined>;

  /* ---- assets ------------------------------------------------------- */

  /** Writes the row before any object exists. `null` = not eligible. */
  reserveAsset(input: ReserveAssetInput): Promise<AssetRecord | null>;

  /** Conditional attach: `null` means deletion started while the PUT ran. */
  completeAsset(
    assetId: string,
    apologyId: string,
    ownerKeyHash: string,
  ): Promise<AssetRecord | null>;

  failAsset(assetId: string): Promise<void>;

  listAssets(apologyId: string): Promise<AssetRecord[]>;

  getAssetForServing(assetId: string): Promise<ServingAsset | undefined>;

  /* ---- lifecycle (creator-facing) ----------------------------------- */

  requestDeletionByOwner(id: string, ownerKeyHash: string): Promise<boolean>;

  isDeletionPending(apologyId: string): Promise<boolean>;

  tombstonesForOwner(ownerKeyHash: string): Promise<DeletionTombstone[]>;
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
