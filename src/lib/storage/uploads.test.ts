import { beforeEach, describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";
import { createFakeObjectStore } from "@/test/adapters/fake-object-store";
import { MAX_AUDIO_BYTES, MAX_PHOTO_BYTES, storeUpload, UploadError } from "./uploads";
import { runCleanup } from "@/lib/lifecycle/protocol";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const OWNER = "owner-hash";

function setup() {
  const backend = createFakeBackend();
  const objects = createFakeObjectStore();
  return { backend, objects, deps: { repository: backend.repository, objects } };
}

async function publishedRecord(backend: ReturnType<typeof setup>["backend"]) {
  const record = makeRecord({ ownerKeyHash: OWNER, status: "published" });
  backend.state.apologies.set(record.id, record);
  return record;
}

describe("upload lifecycle", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("reserves before uploading, then attaches", async () => {
    const record = await publishedRecord(ctx.backend);
    const order: string[] = [];

    ctx.objects.onPut = () => {
      order.push("put");
      // The row must already exist when the object is written.
      expect(ctx.backend.state.assets.get(record.id)?.[0]?.state).toBe("pending");
    };

    const asset = await storeUpload(ctx.deps, {
      data: PNG,
      declaredMime: "image/png",
      apologyId: record.id,
      ownerKeyHash: OWNER,
    });

    order.push("done");
    expect(asset.state).toBe("uploaded");
    expect(asset.objectKey).toMatch(new RegExp(`^apologies/${record.id}/[A-Za-z0-9_-]+\\.png$`));
    expect(order).toEqual(["put", "done"]);
  });

  it("rejects a file whose bytes contradict its declared type", async () => {
    const record = await publishedRecord(ctx.backend);
    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/jpeg",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toBeInstanceOf(UploadError);
    expect(ctx.objects.objects.size).toBe(0);
  });

  it("rejects an oversized file before touching storage", async () => {
    const record = await publishedRecord(ctx.backend);
    const huge = new Uint8Array(9 * 1024 * 1024);
    huge.set(PNG);

    await expect(
      storeUpload(ctx.deps, {
        data: huge,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 413 });
    expect(ctx.objects.objects.size).toBe(0);
  });

  it("refuses to reserve once deletion has started", async () => {
    const record = await publishedRecord(ctx.backend);
    await ctx.backend.repository.requestDeletionByOwner(record.id, OWNER);

    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(ctx.objects.objects.size).toBe(0);
  });

  it("marks the reservation failed when the PutObject fails", async () => {
    const record = await publishedRecord(ctx.backend);
    ctx.objects.failPutWith = new Error("network down");

    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 502 });

    expect(ctx.backend.state.assets.get(record.id)?.[0]?.state).toBe("failed");
  });

  it("enforces the asset cap without counting failed rows", async () => {
    const record = await publishedRecord(ctx.backend);

    for (let index = 0; index < 6; index += 1) {
      await storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      });
    }

    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("upload versus deletion (deterministic interleavings)", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  it("manual delete during PutObject: object removed, nothing attached", async () => {
    const record = await publishedRecord(ctx.backend);

    // Deletion happens *inside* the upload window.
    ctx.objects.onPut = async () => {
      await ctx.backend.repository.requestDeletionByOwner(record.id, OWNER);
    };

    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 409 });

    const job = ctx.backend.state.jobs.get(record.id);
    expect(job).toBeDefined();
    // The key was snapshotted because the reservation preceded the PUT.
    expect(job?.objectKeys).toHaveLength(1);
    expect(ctx.objects.objects.size).toBe(0);
    expect(ctx.backend.state.assets.get(record.id)?.[0]?.state).toBe("failed");
  });

  it("deletion during PutObject: deferred, then finished by the next run", async () => {
    const record = await publishedRecord(ctx.backend);
    const token = record.accessToken;

    ctx.objects.onPut = async () => {
      // The author deletes the letter while the upload is in flight and the
      // Neon function runs. It must NOT finalise over a live reservation.
      await ctx.backend.repository.requestDeletionByOwner(record.id, OWNER);
      await runCleanup({ store: ctx.backend.lifecycle, objects: ctx.objects });
    };

    await expect(
      storeUpload(ctx.deps, {
        data: PNG,
        declaredMime: "image/png",
        apologyId: record.id,
        ownerKeyHash: OWNER,
      }),
    ).rejects.toMatchObject({ status: 409 });

    // Access is gone the moment the author deleted it, not at any deadline.
    expect(await ctx.backend.repository.getPublishedByToken(token)).toBeUndefined();
    // The uploader removed the object it had just written.
    expect(ctx.objects.objects.size).toBe(0);
    // The run deferred rather than finalising over an in-flight upload.
    expect(ctx.backend.state.jobs.get(record.id)?.lastError).toBe("pending upload");
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);

    // With the reservation released, the next run completes the job.
    const second = await runCleanup({ store: ctx.backend.lifecycle, objects: ctx.objects });
    expect(second.deleted).toBe(1);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(false);
    expect(ctx.backend.state.tombstones).toHaveLength(1);
  });

  it("never restores access after the race", async () => {
    const record = await publishedRecord(ctx.backend);
    const token = record.accessToken;

    ctx.objects.onPut = async () => {
      await ctx.backend.repository.requestDeletionByOwner(record.id, OWNER);
    };

    await storeUpload(ctx.deps, {
      data: PNG,
      declaredMime: "image/png",
      apologyId: record.id,
      ownerKeyHash: OWNER,
    }).catch(() => undefined);

    expect(await ctx.backend.repository.getPublishedByToken(token)).toBeUndefined();
  });
});

describe("upload ceilings fit the hosting platform", () => {
  /**
   * Vercel Functions reject a request body above 4.5 MB with
   * `FUNCTION_PAYLOAD_TOO_LARGE` before the handler executes, so the app-level
   * checks would never run. `/api/uploads` sends multipart, which adds boundary
   * and header bytes on top of the file itself, so require headroom.
   */
  const PLATFORM_BODY_LIMIT = 4.5 * 1024 * 1024;
  const MULTIPART_OVERHEAD = 64 * 1024;

  it.each([
    ["photo", MAX_PHOTO_BYTES],
    ["audio", MAX_AUDIO_BYTES],
  ])("keeps the %s ceiling under the platform body cap", (_kind, limit) => {
    expect(limit + MULTIPART_OVERHEAD).toBeLessThan(PLATFORM_BODY_LIMIT);
  });
});


describe("storeUpload size and declared MIME guards", () => {
  const noopDeps = {
    repository: {
      reserveAsset: async () => undefined,
      completeAsset: async () => null,
      failAsset: async () => undefined,
    },
    objects: {
      put: async () => undefined,
      deleteMany: async () => ({ deleted: [], failed: [] }),
      presignGet: async () => "https://signed.example/obj",
    },
  } as unknown as Parameters<typeof storeUpload>[0];

  it("rejects files over 4 MB with exact ceiling error message", async () => {
    const oversized = new Uint8Array(4 * 1024 * 1024 + 1);
    oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

    await expect(
      storeUpload(noopDeps, {
        data: oversized,
        declaredMime: "image/png",
        apologyId: "11111111-2222-3333-4444-555555555555",
        ownerKeyHash: "owner-hash",
      }),
    ).rejects.toMatchObject({
      status: 413,
      message: "Files must be 4 MB or smaller.",
    });
  });

  it("rejects files whose declared MIME does not match sniffed bytes", async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    await expect(
      storeUpload(noopDeps, {
        data: jpegBytes,
        declaredMime: "image/png",
        apologyId: "11111111-2222-3333-4444-555555555555",
        ownerKeyHash: "owner-hash",
      }),
    ).rejects.toMatchObject({
      status: 415,
      message: "The file contents do not match the type it claims to be.",
    });
  });
});
