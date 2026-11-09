import type { AssetRecord, ServingAsset } from "./types";

/**
 * The single authorization decision for stored media.
 *
 * Extracted from the route so it can be tested directly: media access is the
 * half of expiry enforcement that is easy to get wrong, because the link can be
 * dead while the photo URL still resolves.
 */
export interface AssetAccessInput {
  asset: Pick<ServingAsset, "ownerKeyHash" | "apologyStatus" | "expiresAt" | "state">;
  /** Hash from the caller's creator cookie, when there is one. */
  ownerKeyHash?: string;
  now?: number;
}

export function canServeAsset(input: AssetAccessInput): boolean {
  const { asset } = input;

  // Only a completed upload is ever servable.
  if (asset.state !== "uploaded") return false;

  // The owner can always see their own media, including before publishing.
  if (input.ownerKeyHash && asset.ownerKeyHash === input.ownerKeyHash) {
    return true;
  }

  if (asset.apologyStatus !== "published") return false;
  return isLive(asset.expiresAt, input.now);
}

function isLive(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) && parsed > now;
}

export type { AssetRecord };
