import { isLinkLive } from "@/lib/expiry";
import type { ApologyRecord } from "@/types/apology";

/**
 * The single decision about whether a stored asset may be served.
 *
 * Extracted from the route so it can be tested directly: media access is the
 * half of expiry enforcement that is easy to get wrong, because the link can be
 * dead while the photo URL still resolves.
 */
export interface AssetAccessInput {
  asset: { ownerKeyHash?: string; apologyId?: string };
  /** Hash from the caller's creator cookie, when there is one. */
  ownerKeyHash?: string;
  /** The apology the asset belongs to, if it still exists. */
  record?: Pick<ApologyRecord, "status" | "expiresAt">;
  now?: number;
}

export function canServeAsset(input: AssetAccessInput): boolean {
  // The owner can always see their own media, including before publishing.
  if (input.ownerKeyHash && input.asset.ownerKeyHash === input.ownerKeyHash) {
    return true;
  }

  // Anything unbound fails closed rather than becoming anonymously readable.
  if (!input.asset.apologyId) return false;
  if (!input.record) return false;

  return isLinkLive(input.record.status, input.record.expiresAt, input.now);
}
