/**
 * Object storage port.
 *
 * The only operations the application and the cleanup function need. Kept
 * narrow so the Filebase adapter can be exercised with a mock S3 client and so
 * nothing calls `DeleteObject` for a key it did not get from the database.
 */

export interface DeleteBatchResult {
  /** Keys the provider confirmed deleted (or that were absent, which S3 treats alike). */
  deleted: string[];
  /** Keys that did not exist. Included for the audit count, not an error. */
  missing: string[];
  /** Keys that genuinely failed. Any entry here means the job is not done. */
  failed: { key: string; code: string }[];
}

export interface ObjectStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** Throws on auth/network/5xx. Returns `exists:false` only for a real 404. */
  head(key: string): Promise<{ exists: boolean; size?: number }>;
  /** Per-key outcome; throws only when the request itself could not be made. */
  deleteMany(keys: string[]): Promise<DeleteBatchResult>;
  /** Short-lived download URL. Never persisted or logged. */
  presignGet(key: string, ttlSeconds: number): Promise<string>;
}

/** Filebase documents 1,000 keys per `DeleteObjects` request. */
export const DELETE_BATCH_SIZE = 1000;

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
