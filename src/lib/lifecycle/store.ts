import type {
  Candidate,
  DeletionJob,
  PendingReservation,
  SaveResult,
} from "./types";

/**
 * Everything the cleanup protocol needs from the database.
 *
 * Implemented by `PostgresLifecycleStore` in production and by an in-memory
 * double in tests, so the protocol can be exercised without a database.
 * Nothing here performs object I/O.
 */
export interface LifecycleStore {
  /** Expired apologies plus any job that is not yet `completed`. */
  listCandidates(now: Date, limit: number): Promise<Candidate[]>;

  /** Atomic intent for an expiry candidate: job first, then status. */
  requestDeletionForExpiry(apologyId: string, now: Date): Promise<boolean>;

  /** Lease compare-and-set. `null` means another worker holds it, or it is done. */
  claim(apologyId: string, now: Date, leaseMs: number): Promise<DeletionJob | null>;

  /** Every object key ever reserved for this apology, in any state. */
  objectKeys(apologyId: string): Promise<string[]>;

  pendingReservations(apologyId: string): Promise<PendingReservation[]>;

  /** Marks abandoned reservations `failed` so they stop blocking finalisation. */
  abandonReservations(ids: string[]): Promise<void>;

  /** Deletes asset rows and the apology, writes the tombstone, completes the job. */
  finalize(job: DeletionJob, assetsDeleted: number, now: Date): Promise<void>;

  /** Records a retryable failure without restoring access. */
  fail(job: DeletionJob, error: string, now: Date): Promise<void>;

  /** Releases the lease without counting a failure (e.g. a pending upload). */
  defer(job: DeletionJob, reason: string, now: Date): Promise<void>;
}

export type { Candidate, DeletionJob, PendingReservation, SaveResult };
