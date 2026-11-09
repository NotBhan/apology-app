import type { DeleteBatchResult, ObjectStore } from "@/lib/storage/object-store";

/**
 * Mock object store.
 *
 * `onPut` lets a test interleave something with an in-flight upload — the
 * deterministic way to exercise the upload/deletion race without threads or
 * sleeps.
 */
export interface FakeObjectStore extends ObjectStore {
  objects: Map<string, { bytes: Uint8Array; contentType: string }>;
  deleted: string[];
  presigned: { key: string; ttl: number }[];
  /** When set, `put` throws. */
  failPutWith?: unknown;
  /** When set, `head` throws (e.g. a 403). */
  failHeadWith?: unknown;
  /** When set, `deleteMany` throws (transport failure). */
  failDeleteWith?: unknown;
  /** Per-key delete failures, simulating a partial `DeleteObjects` response. */
  deleteErrors: Map<string, string>;
  /** Runs inside `put`, so a test can interleave deletion with an in-flight upload. */
  onPut?: (key: string) => Promise<void> | void;
}

export function createFakeObjectStore(): FakeObjectStore {
  const store: FakeObjectStore = {
    objects: new Map(),
    deleted: [],
    presigned: [],
    deleteErrors: new Map(),

    async put(key, bytes, contentType) {
      if (store.failPutWith) throw store.failPutWith;
      store.objects.set(key, { bytes, contentType });
      if (store.onPut) await store.onPut(key);
    },

    async head(key) {
      if (store.failHeadWith) throw store.failHeadWith;
      return { exists: store.objects.has(key) };
    },

    async deleteMany(keys): Promise<DeleteBatchResult> {
      if (store.failDeleteWith) throw store.failDeleteWith;
      const result: DeleteBatchResult = { deleted: [], missing: [], failed: [] };

      for (const key of keys) {
        const code = store.deleteErrors.get(key);
        if (code) {
          // S3 reports "already gone" as a per-key error entry.
          if (code === "NoSuchKey" || code === "NotFound") result.missing.push(key);
          else result.failed.push({ key, code });
          continue;
        }

        if (store.objects.delete(key)) result.deleted.push(key);
        else result.missing.push(key);
        store.deleted.push(key);
      }

      return result;
    },

    async presignGet(key, ttlSeconds) {
      store.presigned.push({ key, ttl: ttlSeconds });
      return `https://storage.test/${key}?sig=fake`;
    },
  };

  return store;
}
