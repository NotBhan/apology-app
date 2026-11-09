import { beforeEach, describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";
import { createFakeObjectStore } from "@/test/adapters/fake-object-store";
import { runCleanup } from "./protocol";
import { STALE_RESERVATION_MS } from "./types";
import type { ObjectStore } from "@/lib/storage/object-store";

const OWNER = "owner-hash";
const NOW = new Date("2026-06-01T00:00:00.000Z");

function setup() {
  const backend = createFakeBackend();
  const objects = createFakeObjectStore();
  return { backend, objects };
}

/** A published, expired apology with two uploaded assets. */
function expiredApology(ctx: ReturnType<typeof setup>, patch: { pending?: boolean } = {}) {
  const record = makeRecord({
    ownerKeyHash: OWNER,
    status: "published",
    expiresAt: new Date(NOW.getTime() - 60_000).toISOString(),
  });
  ctx.backend.state.apologies.set(record.id, record);

  const assets = ["apologies/x/a.png", "apologies/x/b.png"].map((objectKey, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    apologyId: record.id,
    state: (patch.pending ? "pending" : "uploaded") as "pending" | "uploaded",
    objectKey,
    kind: "photo" as const,
    contentType: "image/png",
    sizeBytes: 10,
    createdAt: patch.pending
      ? new Date(NOW.getTime() - STALE_RESERVATION_MS - 1000).toISOString()
      : NOW.toISOString(),
  }));
  ctx.backend.state.assets.set(record.id, assets);
  for (const asset of assets) {
    ctx.objects.objects.set(asset.objectKey, { bytes: new Uint8Array([1]), contentType: "image/png" });
  }

  return record;
}

describe("deletion protocol", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  const run = (overrides: { objects?: ObjectStore } = {}) =>
    runCleanup({
      store: ctx.backend.lifecycle,
      objects: overrides.objects ?? ctx.objects,
      now: () => NOW,
    });

  it("deletes every object, then the rows, then writes a tombstone", async () => {
    const record = expiredApology(ctx);

    const report = await run();

    expect(report.deleted).toBe(1);
    expect(ctx.objects.objects.size).toBe(0);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(false);
    expect(ctx.backend.state.assets.has(record.id)).toBe(false);
    expect(ctx.backend.state.tombstones).toHaveLength(1);
    expect(ctx.backend.state.tombstones[0]).toMatchObject({
      apologyId: record.id,
      assetsDeleted: 2,
      reason: "expired",
    });
    expect(ctx.backend.state.jobs.get(record.id)?.state).toBe("completed");
  });

  it("never stores personal content in the job or tombstone", async () => {
    const record = expiredApology(ctx);
    await run();

    const serialised = JSON.stringify([
      ...ctx.backend.state.jobs.values(),
      ...ctx.backend.state.tombstones,
    ]);
    expect(serialised).not.toContain("Ananya");
    expect(serialised).not.toContain("Rohan");
    expect(serialised).not.toContain("a\",\"b");
    expect(record.recipientName).toBe("Ananya"); // sanity: it was there before
  });

  it("retries without deleting rows when a per-key delete fails", async () => {
    const record = expiredApology(ctx);
    ctx.objects.deleteErrors.set("apologies/x/b.png", "AccessDenied");

    const report = await run();

    expect(report.retried).toBe(1);
    // The record must survive a failed deletion, or the object is orphaned.
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);
    expect(ctx.backend.state.jobs.get(record.id)?.state).toBe("failed");
    expect(ctx.backend.state.jobs.get(record.id)?.lastError).toContain("AccessDenied");
  });

  it("retries when the provider reports success but the object survives", async () => {
    const record = expiredApology(ctx);

    const lying: ObjectStore = {
      async put() {},
      async head() {
        return { exists: true };
      },
      async deleteMany(keys) {
        return { deleted: keys, missing: [], failed: [] };
      },
      async presignGet() {
        return "";
      },
    };

    const report = await run({ objects: lying });

    expect(report.retried).toBe(1);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);
    expect(ctx.backend.state.jobs.get(record.id)?.lastError).toContain("still present");
  });

  it("retries when the transport throws", async () => {
    const record = expiredApology(ctx);
    ctx.objects.failDeleteWith = Object.assign(new Error("timeout"), { name: "TimeoutError" });

    const report = await run();
    expect(report.retried).toBe(1);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);
  });

  it("is idempotent: a second run has nothing to do", async () => {
    expiredApology(ctx);
    await run();
    const second = await run();

    expect(second.deleted).toBe(0);
    expect(second.scanned).toBe(0);
  });

  it("does not double-process under concurrent runs", async () => {
    expiredApology(ctx);

    const [first, second] = await Promise.all([run(), run()]);
    const deleted = first.deleted + second.deleted;
    const skipped = first.skipped + second.skipped;

    expect(deleted).toBe(1);
    expect(skipped).toBe(1);
    expect(ctx.backend.state.tombstones).toHaveLength(1);
  });

  it("defers while a fresh upload reservation exists", async () => {
    const record = makeRecord({
      ownerKeyHash: OWNER,
      status: "published",
      expiresAt: new Date(NOW.getTime() - 60_000).toISOString(),
    });
    ctx.backend.state.apologies.set(record.id, record);
    ctx.backend.state.assets.set(record.id, [
      {
        id: "00000000-0000-4000-8000-00000000abcd",
        apologyId: record.id,
        state: "pending",
        objectKey: "apologies/x/inflight.png",
        kind: "photo",
        contentType: "image/png",
        sizeBytes: 10,
        createdAt: new Date(NOW.getTime() - 1000).toISOString(),
      },
    ]);

    const report = await run();

    expect(report.retried).toBe(1);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);
    expect(ctx.backend.state.jobs.get(record.id)?.lastError).toBe("pending upload");
  });

  it("reaps a stale reservation on a later run and then finishes", async () => {
    const record = expiredApology(ctx, { pending: true });
    ctx.objects.objects.set("apologies/x/a.png", { bytes: new Uint8Array([1]), contentType: "image/png" });

    const report = await run();

    expect(report.deleted).toBe(1);
    expect(ctx.objects.objects.size).toBe(0);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(false);
  });

  it("finishes a job whose apology row is already gone", async () => {
    const record = expiredApology(ctx);
    // Simulate a crash after row deletion, before completion.
    ctx.backend.state.apologies.delete(record.id);
    ctx.backend.state.jobs.set(record.id, {
      apologyId: record.id,
      ownerKeyHash: OWNER,
      objectKeys: ["apologies/x/a.png", "apologies/x/b.png"],
      state: "processing",
      reason: "expired",
      attemptCount: 1,
    });

    const report = await run();

    expect(report.deleted).toBe(1);
    expect(ctx.objects.objects.size).toBe(0);
    expect(ctx.backend.state.jobs.get(record.id)?.state).toBe("completed");
  });

  it("leaves a live letter untouched", async () => {
    const record = makeRecord({
      ownerKeyHash: OWNER,
      status: "published",
      expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
    });
    ctx.backend.state.apologies.set(record.id, record);

    const report = await run();
    expect(report.scanned).toBe(0);
    expect(ctx.backend.state.apologies.has(record.id)).toBe(true);
  });
});
