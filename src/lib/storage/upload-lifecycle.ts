import { randomId } from "@/lib/id";

/**
 * Upload lifecycle.
 *
 * The ordering is the whole point:
 *
 *   1. reserve  — a `pending` row with a server-generated object key,
 *   2. upload   — `PutObject` for that key only,
 *   3. complete — conditional on the apology still being editable.
 *
 * Because the key is in the database *before* the object exists, deletion
 * intent always snapshots it, so an object can never escape a deletion. Upload
 * completion is the second gate: if deletion started mid-upload, the object
 * just written is removed here and never attached.
 */

export const MAX_ASSETS_PER_APOLOGY = 6; // five photos + one audio file

/** `apologies/{apologyId}/{random}.{ext}` — no names, no tokens. */
export function buildObjectKey(apologyId: string, extension: string): string {
  const safe = extension.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 5) || "bin";
  return `apologies/${apologyId}/${randomId(16)}.${safe}`;
}

export { EXTENSION_BY_MIME, extensionForMime } from "@/lib/storage/mime";
