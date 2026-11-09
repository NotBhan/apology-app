import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FilePurgeStore } from "./purge-store";
import { listPurgeCandidates, purgeNow, runPurge } from "./purge";
import type { PurgeDeps, PurgeRepository } from "./purge";
import type { ApologyRecord } from "@/types/apology";

/* -------------------------------------------------------------------------- */
/* Fakes                                                                      */
/* -------------------------------------------------------------------------- */

const T0 = Date.parse("2026-03-01T12:00:00.000Z");
const DAY = 86_400_000;

function makeRecord(patch: Partial<ApologyRecord> = {}): ApologyRecord {
  return {
    id: "apology-1",
    accessToken: "token-1",
    ownerKeyHash: "owner-hash",
    recipientName: "Ananya",
    senderName: "Rohan",
    situation: "fight",
    situationCustom: "",
    language: "en",
    messages: {
      message1: "I said too much.",
      message2: "You matter.",
      message3: "I will do better.",
      personalNote: "At 2am.",
    },
    themeId: "romantic",
    stickerPackId: "cats",
    customization: {
      audio: { source: "custom", volume: 0.5, assetId: "audio-1" },
      photos: [
        { id: "photo-1", url: "/api/uploads/photo-1" },
        { id: "photo-2", url: "/api/uploads/photo-2" },
      ],
      memoryStyle: "polaroid",
    },
    linkDurationDays: 3,
    status: "published",
    createdAt: new Date(T0 - DAY).toISOString(),
    updatedAt: new Date(T0 - DAY).toISOString(),
    publishedAt: new Date(T0 - DAY).toISOString(),
    expiresAt: new Date(T0 - 1000).toISOString(),
    ...patch,
  };
}

class FakeRepository implements PurgeRepository {
  records = new Map<string, ApologyRecord>();

  add(record: ApologyRecord) {
    this.records.set(record.id, record);
    return this;
  }

  async listExpired(nowIso: string, limit: number): Promise<ApologyRecord[]> {
    const now = Date.parse(nowIso);
    return [...this.records.values()]
      .filter((record) => record.status === "published")
      .filter((record) => {
        const expires = Date.parse(record.expiresAt ?? "");
        // Legacy (missing/invalid expiry) counts as expired, matching the
        // real repositories.
        return !Number.isFinite(expires) || expires <= now;
      })
      .slice(0, limit);
  }

  async getDraft(id: string): Promise<ApologyRecord | undefined> {
    return this.records.get(id);
  }

  async purge(id: string): Promise<void> {
    this.records.delete(id);
  }
}

class FakeUploads {
  objects = new Map<string, number>();
  /** Ids whose remove() should throw on the next call. */
  failing = new Set<string>();
  removals: string[] = [];

  constructor(ids: string[] = []) {
    for (const id of ids) this.objects.set(id, 1);
  }

  async remove(id: string): Promise<void> {
    if (this.failing.has(id)) {
      this.failing.delete(id);
      throw new Error("storage unavailable");
    }
    this.removals.push(id);
    this.objects.delete(id);
  }

  async stat(id: string): Promise<boolean> {
    return this.objects.has(id);
  }
}

/* -------------------------------------------------------------------------- */

const DATA = path.join(process.cwd(), ".data");
const JOBS = path.join(DATA, "deletions");
const TOMBS = path.join(DATA, "tombstones");

async function clearLifecycle() {
  await fs.rm(JOBS, { recursive: true, force: true });
  await fs.rm(TOMBS, { recursive: true, force: true });
}

describe("purge lifecycle", () => {
  let repository: FakeRepository;
  let uploads: FakeUploads;
  let deps: PurgeDeps;

  beforeEach(async () => {
    await clearLifecycle();
    repository = new FakeRepository().add(makeRecord());
    uploads = new FakeUploads(["photo-1", "photo-2", "audio-1", "unrelated-photo"]);
    deps = {
      store: new FilePurgeStore(),
      repository,
      uploads,
      now: () => T0,
      leaseMs: 60_000,
    };
  });

  afterEach(async () => {
    await clearLifecycle();
  });

  it("deletes the record and every asset it references", async () => {
    const report = await runPurge(deps);

    expect(report.deleted).toBe(1);
    expect(repository.records.has("apology-1")).toBe(false);

    // Photos and the custom audio file, and nothing else.
    expect(uploads.removals.sort()).toEqual(["audio-1", "photo-1", "photo-2"]);
    expect(await uploads.stat("photo-1")).toBe(false);
    expect(await uploads.stat("audio-1")).toBe(false);
  });

  it("never touches assets belonging to another apology", async () => {
    await runPurge(deps);
    expect(await uploads.stat("unrelated-photo")).toBe(true);
    expect(uploads.removals).not.toContain("unrelated-photo");
  });

  it("writes a tombstone with no personal content", async () => {
    await runPurge(deps);
    const store = deps.store as FilePurgeStore;
    const tombstones = await store.listTombstones("owner-hash");

    expect(tombstones).toHaveLength(1);
    const serialised = JSON.stringify(tombstones[0]);
    expect(serialised).not.toContain("Ananya");
    expect(serialised).not.toContain("Rohan");
    expect(serialised).not.toContain("I said too much");
    expect(tombstones[0]).toMatchObject({
      apologyId: "apology-1",
      assetsDeleted: 3,
      reason: "expired",
    });
  });

  it("is idempotent: a second run finds nothing to do", async () => {
    await runPurge(deps);
    const second = await runPurge(deps);

    expect(second.deleted).toBe(0);
    expect(second.scanned).toBe(0);
    expect(uploads.removals).toHaveLength(3);
  });

  it("keeps the record and retries when a storage delete fails", async () => {
    uploads.failing.add("photo-2");

    const first = await runPurge(deps);
    expect(first.retried).toBe(1);
    // The record must survive a failed purge, or the photos would be orphaned.
    expect(repository.records.has("apology-1")).toBe(true);

    const job = await deps.store.getJob("apology-1");
    expect(job?.lastError).toContain("storage unavailable");
    expect(job?.attempts).toBe(1);

    // Next scheduled run: the failure has cleared, so it completes.
    const second = await runPurge(deps);
    expect(second.deleted).toBe(1);
    expect(repository.records.has("apology-1")).toBe(false);
    expect(await uploads.stat("photo-2")).toBe(false);
    expect(await deps.store.getJob("apology-1")).toBeUndefined();
  });

  it("verifies deletion instead of trusting remove()", async () => {
    // A backend that reports success but leaves the object behind.
    const liar = {
      removed: [] as string[],
      async remove(id: string) {
        this.removed.push(id);
      },
      async stat() {
        return true;
      },
    };

    const report = await runPurge({ ...deps, uploads: liar });
    expect(report.retried).toBe(1);
    expect(repository.records.has("apology-1")).toBe(true);
    expect((await deps.store.getJob("apology-1"))?.lastError).toContain("still present");
  });

  it("skips candidates another worker has leased", async () => {
    // Simulate a worker already inside the critical section.
    await deps.store.claim("apology-1", T0, 60_000);

    const report = await runPurge(deps);
    expect(report.skipped).toBe(1);
    expect(report.deleted).toBe(0);
    expect(repository.records.has("apology-1")).toBe(true);
  });

  it("survives two concurrent runs without double-deleting", async () => {
    const [a, b] = await Promise.all([runPurge(deps), runPurge(deps)]);

    const deleted = a.deleted + b.deleted;
    const skipped = a.skipped + b.skipped;

    expect(deleted).toBe(1);
    expect(skipped).toBe(1);
    expect(repository.records.has("apology-1")).toBe(false);
    // Each asset removed exactly once even under concurrency.
    expect(uploads.removals.sort()).toEqual(["audio-1", "photo-1", "photo-2"]);
  });

  it("leaves a live letter alone", async () => {
    repository.records.set(
      "apology-1",
      makeRecord({ expiresAt: new Date(T0 + DAY).toISOString() }),
    );

    const report = await runPurge(deps);
    expect(report.scanned).toBe(0);
    expect(repository.records.has("apology-1")).toBe(true);
    expect(uploads.removals).toHaveLength(0);
  });

  it("treats the exact expiry instant as expired", async () => {
    repository.records.set("apology-1", makeRecord({ expiresAt: new Date(T0).toISOString() }));
    const report = await runPurge(deps);
    expect(report.deleted).toBe(1);
  });

  it("ignores drafts, which have no expiry", async () => {
    repository.records.set(
      "apology-1",
      makeRecord({ status: "draft", expiresAt: undefined }),
    );
    const report = await runPurge(deps);
    expect(report.scanned).toBe(0);
    expect(repository.records.has("apology-1")).toBe(true);
  });

  it("finishes a job whose record is already gone", async () => {
    // A previous run deleted the record but died before the assets.
    await deps.store.claim("apology-1", T0 - DAY, 1000);
    await deps.store.saveJob({
      apologyId: "apology-1",
      ownerKeyHash: "owner-hash",
      assetIds: ["photo-1"],
      attempts: 1,
      createdAt: new Date(T0 - DAY).toISOString(),
      updatedAt: new Date(T0 - DAY).toISOString(),
    });
    repository.records.delete("apology-1");

    const report = await runPurge(deps);
    expect(report.deleted).toBe(1);
    expect(await uploads.stat("photo-1")).toBe(false);
    expect(await deps.store.getJob("apology-1")).toBeUndefined();
  });

  it("manual deletion follows the same pipeline", async () => {
    repository.records.set(
      "apology-1",
      makeRecord({ expiresAt: new Date(T0 + 3 * DAY).toISOString() }),
    );

    const outcome = await purgeNow(deps, "apology-1", "manual");
    expect(outcome.status).toBe("deleted");
    expect(repository.records.has("apology-1")).toBe(false);
    expect(uploads.removals.sort()).toEqual(["audio-1", "photo-1", "photo-2"]);

    const tombstones = await (deps.store as FilePurgeStore).listTombstones("owner-hash");
    expect(tombstones[0]?.reason).toBe("manual");
  });

  it("marks a legacy record as such in the tombstone", async () => {
    repository.records.set(
      "apology-1",
      makeRecord({ expiresAt: undefined, status: "published" }),
    );

    const report = await runPurge(deps);
    expect(report.deleted).toBe(1);

    const [tombstone] = await (deps.store as FilePurgeStore).listTombstones("owner-hash");
    expect(tombstone.reason).toBe("legacy");
  });

  it("audits candidates without deleting anything", async () => {
    repository.records.set(
      "apology-1",
      makeRecord({ expiresAt: undefined, status: "published" }),
    );

    const candidates = await listPurgeCandidates(deps);
    expect(candidates).toEqual([{ apologyId: "apology-1", reason: "legacy" }]);

    // Nothing was touched.
    expect(repository.records.has("apology-1")).toBe(true);
    expect(uploads.removals).toHaveLength(0);
  });

  it("reports missing when there is nothing to delete", async () => {
    const outcome = await purgeNow(deps, "does-not-exist", "manual");
    expect(outcome.status).toBe("skipped");
  });
});
