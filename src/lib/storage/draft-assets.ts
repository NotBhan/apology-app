import "server-only";
import type { ApologyRecord } from "@/types/apology";
import { removeUpload } from "./uploads";

/**
 * Every asset a draft can reference. Photos and a custom audio file are the
 * only uploads a letter owns, and both live under ids we minted.
 */
export function assetIdsForDraft(record: ApologyRecord): string[] {
  const ids = new Set<string>();
  for (const photo of record.customization.photos) {
    if (photo.id) ids.add(photo.id);
  }
  const audioId = record.customization.audio.assetId;
  if (audioId) ids.add(audioId);
  return [...ids];
}

/**
 * Deletes a draft's uploads. Called when a draft is removed: without this the
 * bytes outlive the record forever and storage grows without bound.
 *
 * Failures are swallowed on purpose — a draft must still be deletable when
 * storage is temporarily unavailable, and an orphaned object is a cost problem,
 * not a correctness one.
 */
export async function removeDraftAssets(record: ApologyRecord): Promise<number> {
  const ids = assetIdsForDraft(record);
  if (ids.length === 0) return 0;

  const results = await Promise.allSettled(ids.map((id) => removeUpload(id)));
  return results.filter((result) => result.status === "fulfilled").length;
}
