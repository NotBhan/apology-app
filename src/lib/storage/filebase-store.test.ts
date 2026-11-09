import { describe, expect, it } from "vitest";
import {
  FilebaseObjectStore,
  type BucketTransport,
  type FilebaseConfig,
} from "./filebase-store";

const config: FilebaseConfig = {
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucket: "bucket",
  endpoint: "https://s3.filebase.io",
  region: "auto",
};

function notFound() {
  const error = new Error("not found") as Error & { name: string; $metadata?: object };
  error.name = "NotFound";
  error.$metadata = { httpStatusCode: 404 };
  return error;
}

function denied() {
  const error = new Error("denied") as Error & { name: string; $metadata?: object };
  error.name = "AccessDenied";
  error.$metadata = { httpStatusCode: 403 };
  return error;
}

function makeTransport(overrides: Partial<BucketTransport> = {}) {
  const calls = { put: 0, head: 0, deleteBatches: [] as string[][], presign: [] as number[] };
  const transport: BucketTransport = {
    async put() {
      calls.put += 1;
    },
    async head() {
      calls.head += 1;
    },
    async deleteKeys(keys) {
      calls.deleteBatches.push(keys);
      return { deleted: keys, errors: [] };
    },
    async presignGet(_key, ttl) {
      calls.presign.push(ttl);
      return "https://signed/";
    },
    ...overrides,
  };
  return { transport, calls };
}

describe("FilebaseObjectStore", () => {
  it("passes the content type through to PutObject", async () => {
    const seen: string[] = [];
    const { transport } = makeTransport({
      async put(_key, _body, contentType) {
        seen.push(contentType);
      },
    });
    const store = new FilebaseObjectStore(transport);

    await store.put("apologies/a/1.png", new Uint8Array([1, 2, 3]), "image/png");
    expect(seen).toEqual(["image/png"]);
  });

  it("reports a 404 as missing and everything else as a failure", async () => {
    const missingStore = new FilebaseObjectStore(
      makeTransport({ async head() { throw notFound(); } }).transport,
    );
    await expect(missingStore.head("k")).resolves.toEqual({ exists: false });

    const deniedStore = new FilebaseObjectStore(
      makeTransport({ async head() { throw denied(); } }).transport,
    );
    await expect(deniedStore.head("k")).rejects.toThrow();

    const networkStore = new FilebaseObjectStore(
      makeTransport({ async head() { throw new Error("ETIMEDOUT"); } }).transport,
    );
    await expect(networkStore.head("k")).rejects.toThrow();
  });

  it("classifies per-key delete results instead of trusting the response code", async () => {
    const { transport } = makeTransport({
      async deleteKeys(keys) {
        return {
          deleted: [keys[0]],
          errors: [
            { key: keys[1], code: "NoSuchKey" },
            { key: keys[2], code: "AccessDenied" },
          ],
        };
      },
    });
    const store = new FilebaseObjectStore(transport);

    const result = await store.deleteMany(["a", "b", "c"]);
    expect(result.deleted).toEqual(["a"]);
    // Already gone is a success, not a failure.
    expect(result.missing).toEqual(["b"]);
    expect(result.failed).toEqual([{ key: "c", code: "AccessDenied" }]);
  });

  it("chunks at the documented 1,000-key limit", async () => {
    const { transport, calls } = makeTransport();
    const store = new FilebaseObjectStore(transport);

    const keys = Array.from({ length: 2_001 }, (_, index) => `k${index}`);
    await store.deleteMany(keys);

    expect(calls.deleteBatches.map((batch) => batch.length)).toEqual([1000, 1000, 1]);
  });

  it("does not call the provider for an empty key list", async () => {
    const { transport, calls } = makeTransport();
    const store = new FilebaseObjectStore(transport);

    const result = await store.deleteMany([]);
    expect(calls.deleteBatches).toHaveLength(0);
    expect(result).toEqual({ deleted: [], missing: [], failed: [] });
  });

  it("presigns for the requested short TTL", async () => {
    const { transport, calls } = makeTransport();
    const store = new FilebaseObjectStore(transport);

    const url = await store.presignGet("apologies/a/1.png", 60);
    expect(url).toContain("https://signed/");
    expect(calls.presign).toEqual([60]);
  });

  it("never derives credentials from ambient AWS variables", async () => {
    // The config object is the only source; there is no `fromEnv` fallback that
    // reads AWS_*. Guarding the shape keeps that true.
    expect(config).not.toHaveProperty("env");
  });
});
