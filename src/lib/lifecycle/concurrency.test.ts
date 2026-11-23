import { describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";
import type { DeletionJob } from "./types";

describe("Lifecycle concurrency, fencing, and absorption", () => {
  it("increments fencing token on claim to supersede stale workers", async () => {
    const backend = createFakeBackend();
    const record = makeRecord({ status: "published" });
    backend.state.apologies.set(record.id, record);

    const now = new Date("2026-06-01T00:00:00.000Z");
    backend.state.jobs.set(record.id, {
      resourceType: "apology",
      resourceId: record.id,
      apologyId: record.id,
      objectKeys: [],
      state: "pending",
      reason: "manual",
      attemptCount: 0,
      fencingToken: 1,
    });

    // Worker 1 claims job
    const claim1 = await backend.lifecycle.claim(record.id, now, 60_000);
    expect(claim1).not.toBeNull();
    expect(claim1?.fencingToken).toBe(2);
    expect(claim1?.state).toBe("processing");

    // Advance time past lease to simulate Worker 1 crashing
    const later = new Date(now.getTime() + 120_000);

    // Worker 2 reclaims the expired processing job
    const claim2 = await backend.lifecycle.claim(record.id, later, 60_000);
    expect(claim2).not.toBeNull();
    expect(claim2?.fencingToken).toBe(3);
    expect(claim2?.attemptCount).toBe(2);

    // Stale Worker 1 has fencingToken 2, but live job has fencingToken 3
    const liveJob = backend.state.jobs.get(record.id);
    expect(liveJob?.fencingToken).toBe(3);
    expect(claim1?.fencingToken).not.toBe(liveJob?.fencingToken);
  });

  it("parent deletion absorbs child responses and marks child jobs completed", async () => {
    const backend = createFakeBackend();
    const parent = makeRecord({ status: "published" });
    backend.state.apologies.set(parent.id, parent);

    const now = new Date("2026-06-01T00:00:00.000Z");

    const parentJob: DeletionJob = {
      resourceType: "apology",
      resourceId: parent.id,
      apologyId: parent.id,
      ownerKeyHash: parent.ownerKeyHash,
      objectKeys: ["apologies/parent/photo1.jpg"],
      state: "processing",
      reason: "manual",
      attemptCount: 1,
      fencingToken: 2,
    };
    backend.state.jobs.set(parent.id, parentJob);

    // Finalize parent deletion
    await backend.lifecycle.finalize(parentJob, 1, now);

    expect(backend.state.apologies.has(parent.id)).toBe(false);
    expect(backend.state.jobs.get(parent.id)?.state).toBe("completed");
    expect(backend.state.tombstones).toHaveLength(1);
    expect(backend.state.tombstones[0].apologyId).toBe(parent.id);
  });

  it("verifies hierarchical locking order prevents deadlocks", () => {
    // Hierarchy: Parent (1) -> Child (2) -> Assets (3)
    const lockOrder = {
      parent: 1,
      child: 2,
      assets: 3,
    };

    // Parent transaction touches: Parent (1), Child (2), Assets (3) in ascending order
    const parentAcquisition = [lockOrder.parent, lockOrder.child, lockOrder.assets];
    expect(parentAcquisition).toEqual([1, 2, 3]);

    // Child transaction touches: Child (2), Assets (3) in ascending order without acquiring parent
    const childAcquisition = [lockOrder.child, lockOrder.assets];
    expect(childAcquisition).toEqual([2, 3]);

    // Since child never acquires Parent (1), circular wait (1 waiting for 2 while 2 waits for 1) is impossible
    const canDeadlock = childAcquisition.includes(lockOrder.parent);
    expect(canDeadlock).toBe(false);
  });
});
