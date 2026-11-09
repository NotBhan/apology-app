/**
 * Deletion lifecycle.
 *
 * Two records, deliberately minimal:
 *
 * - `DeletionJob` tracks work in progress. It holds the apology id, the asset
 *   ids still to remove, an attempt count and a lease. It never holds names,
 *   messages, notes or image data — the apology document is the only place
 *   content lives, and it is read once, then deleted.
 * - `DeletionTombstone` is what remains after a successful purge, so the
 *   creator's Manage page can say "deleted" instead of silently losing a row.
 *   It stores a hashed owner key, never the owner's key or any content.
 */

export interface DeletionJob {
  apologyId: string;
  /**
   * Hash of the creator key, carried only so a retry can still write the
   * tombstone after the apology document is gone. Never the key itself.
   */
  ownerKeyHash?: string;
  /** Upload ids that must be gone before the record is removed. */
  assetIds: string[];
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  /** Epoch ms. While in the future, another worker skips this job. */
  leaseUntil?: number;
}

export interface DeletionTombstone {
  apologyId: string;
  /** SHA-256 of the creator's cookie key. Not reversible to the key. */
  ownerKeyHash: string;
  deletedAt: string;
  assetsDeleted: number;
  /** Why it was removed. `legacy` means it had no valid expiry at all. */
  reason: "expired" | "legacy" | "manual";
}

export type PurgeOutcome =
  | { status: "deleted"; apologyId: string; assetsDeleted: number }
  | { status: "retry"; apologyId: string; error: string; remainingAssets: number }
  | { status: "skipped"; apologyId: string; reason: "leased" | "missing" };

export interface PurgeReport {
  scanned: number;
  deleted: number;
  retried: number;
  skipped: number;
  outcomes: PurgeOutcome[];
}

/** How long a worker owns a job before another may retry it. */
export const DEFAULT_LEASE_MS = 2 * 60 * 1000;
