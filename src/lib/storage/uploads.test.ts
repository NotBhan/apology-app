import { beforeEach, describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";
import { createFakeObjectStore } from "@/test/adapters/fake-object-store";
import { storeUpload, UploadError } from "./uploads";
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
  record.expiresAt = new Date(Date.now() + 86_400_000).toISOString();
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

  it("expiry during PutObject: deferred, then finished by the next run", async () => {
    const record = await publishedRecord(ctx.backend);
    const token = record.accessToken;

    ctx.objects.onPut = async () => {
      // The link expires while the upload is in flight and the Neon function
      // runs. It must NOT finalise over a live reservation.
      record.expiresAt = new Date(Date.now() - 60_000).toISOString();
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

    // Access is already gone.
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
