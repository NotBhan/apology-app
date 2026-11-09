/**
 * Deletion lifecycle contracts.
 *
 * Two durable records, both content-free:
 *
 * - `DeletionJob` is the work ledger. It holds the apology id, the object keys
 *   to remove, an attempt count, a lease and a sanitised error. It never holds
 *   names, messages, notes or media — those live only in `apologies`, which is
 *   read once and then deleted.
 * - `DeletionTombstone` is what remains after a successful purge so Manage can
 *   show "deleted". It stores a hashed owner key, never the key or any content.
 */

export type DeletionState = "pending" | "processing" | "failed" | "completed";
export type DeletionReason = "expired" | "manual";

export interface DeletionJob {
  apologyId: string;
  ownerKeyHash?: string;
  objectKeys: string[];
  state: DeletionState;
  reason: DeletionReason;
  attemptCount: number;
  lastError?: string;
  leaseUntil?: number;
}

export interface DeletionTombstone {
  apologyId: string;
  ownerKeyHash: string;
  deletedAt: string;
  assetsDeleted: number;
  reason: DeletionReason;
}

export type SaveResult =
  | { status: "deleted"; apologyId: string; assetsDeleted: number }
  | { status: "retry"; apologyId: string; error: string; remaining: number }
  | { status: "skipped"; apologyId: string; reason: "leased" | "missing" };

export interface CleanupReport {
  scanned: number;
  deleted: number;
  retried: number;
  skipped: number;
  outcomes: SaveResult[];
}

export interface Candidate {
  apologyId: string;
  /** `expired` means no job existed yet; `job` means a job is already durable. */
  source: "expired" | "job";
}

export interface PendingReservation {
  id: string;
  objectKey: string;
  createdAt: Date;
}

/** A worker owns a job for this long before another run may retry it. */
export const DEFAULT_LEASE_MS = 2 * 60 * 1000;

/**
 * How long a `pending` upload reservation may block finalisation before it is
 * treated as abandoned. Chosen at 30 minutes: comfortably longer than a 5 MB
 * upload on a poor mobile connection, short enough that a crashed client only
 * delays record deletion by one trigger cycle.
 */
export const STALE_RESERVATION_MS = 30 * 60 * 1000;

export const MAX_LAST_ERROR_LENGTH = 500;
