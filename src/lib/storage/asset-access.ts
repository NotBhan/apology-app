import type { AssetRecord, ServingAsset } from "./types";

/**
 * The single authorization decision for stored media.
 *
 * Extracted from the route so it can be tested directly. Media access is
 * decided by the owning record's status alone: a live published experience
 * serves its photographs permanently, and revoking or deleting it stops serving
 * them immediately. There is no expiry input, because published links never
 * expire on their own.
 */
export interface AssetAccessInput {
  asset: Pick<ServingAsset, "ownerKeyHash" | "apologyStatus" | "state">;
  /** Hash from the caller's creator cookie, when there is one. */
  ownerKeyHash?: string;
}

export function canServeAsset(input: AssetAccessInput): boolean {
  const { asset } = input;

  // Only a completed upload on a non-deleted experience is ever servable.
  if (asset.state !== "uploaded" || asset.apologyStatus === "deleted") return false;

  // The owner can always see their own non-deleted media, including before publishing.
  if (input.ownerKeyHash && asset.ownerKeyHash === input.ownerKeyHash) {
    return true;
  }

  // Under permanent links, published media is permanently servable to recipients.
  // Revoked, deleted, or draft assets are refused.
  return asset.apologyStatus === "published";
}

export type { AssetRecord };
