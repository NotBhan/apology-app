// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "@/db/client";
import { PostgresRepository } from "@/lib/storage/postgres-repository";
import { PostgresLifecycleStore } from "@/lib/lifecycle/postgres-store";
import { runCleanup } from "@/lib/lifecycle/protocol";
import { FilebaseObjectStore } from "@/lib/storage/filebase-store";
import { storeUpload } from "@/lib/storage/uploads";
import type { LifecycleStore } from "@/lib/lifecycle/store";
import type { ObjectStore } from "@/lib/storage/object-store";

/**
 * Production infrastructure acceptance.
 *
 * This is the ONLY suite that touches real infrastructure. It is skipped unless
 * `ACCEPTANCE=1` and the provider credentials are present, so `npm test` stays
 * hermetic and offline.
 *
 *   ACCEPTANCE=1 npm run acceptance
 *
 * Nothing here is a fake: real Neon queries, real Filebase objects, real
 * pre-signed URLs fetched over HTTPS. If a test here fails, the external
 * contract is not met — no amount of green unit tests changes that.
 */

const READY =
  process.env.ACCEPTANCE === "1" &&
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.FILEBASE_ACCESS_KEY);

const suite = READY ? describe : describe.skip;

const OWNER = `acceptance-${Date.now()}`;
const PNG = new Uint8Array(
  Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082",
    "hex",
  ),
);

suite("production infrastructure acceptance", () => {
  const db = READY ? createDb(process.env.DATABASE_URL!) : (null as never);
  const repository = READY ? new PostgresRepository(db) : (null as never);
  const lifecycle = READY ? new PostgresLifecycleStore(db) : (null as never);
  const objects = READY ? FilebaseObjectStore.fromEnv() : (null as never);

  async function wipe() {
    // Objects first: a stranded object after the row is gone is exactly the
    // failure this suite exists to rule out.
    const rows = await db.execute(sql`
      select x.object_key from apology_assets x
      join apologies a on a.id = x.apology_id
      where a.owner_key_hash = ${OWNER}
    `);
    const keys = (rows as unknown as { rows?: { object_key: string }[] }).rows ?? [];
    if (keys.length > 0) await objects.deleteMany(keys.map((row) => row.object_key));

    await db.execute(sql`delete from apology_assets where apology_id in (
      select id from apologies where owner_key_hash = ${OWNER})`);
    await db.execute(sql`delete from apologies where owner_key_hash = ${OWNER}`);
    await db.execute(sql`
      delete from deletion_jobs where apology_id not in (select id from apologies)
        and owner_key_hash = ${OWNER}`);
  }

  beforeEach(async () => {
    if (READY) await wipe();
  });

  afterAll(async () => {
    if (READY) await wipe();
  });

  async function seedPublished(): Promise<{
    id: string;
    token: string;
    objectKey: string;
  }> {
    const draft = await repository.createDraft(OWNER, {
      recipientName: "Acceptance",
      senderName: "Harness",
    });

    await repository.saveDraft(draft.id, OWNER, {
      recipientName: "Acceptance",
      senderName: "Harness",
      situation: "fight",
      situationCustom: "",
      language: "en",
      messages: {
        message1: "a",
        message2: "b",
        message3: "c",
        personalNote: "n",
      },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: {
        audio: { source: "none", volume: 0.5 },
        photos: [],
        memoryStyle: "polaroid",
      },
      linkDurationDays: 1,
    });

    const asset = await storeUpload(
      { repository, objects },
      {
        data: PNG,
        declaredMime: "image/png",
        apologyId: draft.id,
        ownerKeyHash: OWNER,
      },
    );

    const published = await repository.publish(draft.id, OWNER, 1);
    return { id: draft.id, token: published.accessToken, objectKey: asset.objectKey };
  }

  async function expire(id: string) {
    await db.execute(sql`
      update apologies
      set expires_at = now() - interval '1 minute'
      where id = ${id}
    `);
  }

  it("V3+end-to-end: real object is written, then removed with the record", async () => {
    const { id, objectKey, token } = await seedPublished();

    // Outbound S3 works at all (V3).
    await expect(objects.head(objectKey)).resolves.toMatchObject({ exists: true });

    await expire(id);
    expect(await repository.getPublishedByToken(token)).toBeUndefined();

    const report = await runCleanup({ store: lifecycle, objects, now: () => new Date() });
    expect(report.deleted).toBeGreaterThanOrEqual(1);

    // Object gone from Filebase…
    await expect(objects.head(objectKey)).resolves.toMatchObject({ exists: false });
    // …row gone from Neon…
    expect(await repository.getDraft(id)).toBeUndefined();
    // …and a content-free tombstone remains.
    const tombstones = await repository.tombstonesForOwner(OWNER);
    expect(tombstones.some((tomb) => tomb.apologyId === id)).toBe(true);

    const serialised = JSON.stringify(tombstones);
    expect(serialised).not.toContain("Acceptance");
    expect(serialised).not.toContain("Harness");
  });

  it("retries after a transient storage failure and completes", async () => {
    const { id, objectKey } = await seedPublished();
    await expire(id);

    // A real transient failure: the first delete call is refused.
    let failOnce = true;
    const flaky: ObjectStore = {
      put: (...args) => objects.put(...args),
      presignGet: (...args) => objects.presignGet(...args),
      head: (key) => objects.head(key),
      deleteMany: async (keys) => {
        if (failOnce) {
          failOnce = false;
          throw Object.assign(new Error("SlowDown"), { name: "SlowDown" });
        }
        return objects.deleteMany(keys);
      },
    };

    const first = await runCleanup({ store: lifecycle, objects: flaky, now: () => new Date() });
    expect(first.retried).toBeGreaterThanOrEqual(1);
    // The record must survive a failed storage delete.
    expect(await repository.getDraft(id)).toBeDefined();
    await expect(objects.head(objectKey)).resolves.toMatchObject({ exists: true });

    const second = await runCleanup({ store: lifecycle, objects, now: () => new Date() });
    expect(second.deleted).toBeGreaterThanOrEqual(1);
    await expect(objects.head(objectKey)).resolves.toMatchObject({ exists: false });
    expect(await repository.getDraft(id)).toBeUndefined();
  });

  it("does not strand a job when termination happens after objects are deleted", async () => {
    const { id } = await seedPublished();
    await expire(id);

    // Objects are deleted, then the process dies before finalise.
    const crashing = Object.create(lifecycle) as LifecycleStore;
    crashing.finalize = async () => {
      throw new Error("simulated termination after object deletion");
    };

    await expect(
      runCleanup({ store: crashing, objects, now: () => new Date(), leaseMs: 50 }),
    ).rejects.toThrow("simulated termination");

    // Record still there, job leased — not lost.
    expect(await repository.getDraft(id)).toBeDefined();

    // After the lease elapses, the next run resumes with the real store.
    await new Promise((resolve) => setTimeout(resolve, 120));
    const resumed = await runCleanup({ store: lifecycle, objects, now: () => new Date() });

    expect(resumed.deleted).toBeGreaterThanOrEqual(1);
    expect(await repository.getDraft(id)).toBeUndefined();
  });

  it("serves media through a real pre-signed URL", async () => {
    const { objectKey, id } = await seedPublished();
    void id;

    const url = await objects.presignGet(objectKey, 60);
    const response = await fetch(url);

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);

    // A short TTL must actually expire.
    const stale = await objects.presignGet(objectKey, 1);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const expired = await fetch(stale);
    expect(expired.status).toBe(403);
  });

  it("eventually removes every expired record in the batch", async () => {
    const seeded = await Promise.all([seedPublished(), seedPublished(), seedPublished()]);
    for (const item of seeded) await expire(item.id);

    const report = await runCleanup({ store: lifecycle, objects, now: () => new Date(), limit: 10 });
    expect(report.deleted).toBeGreaterThanOrEqual(3);

    for (const item of seeded) {
      expect(await repository.getDraft(item.id)).toBeUndefined();
      await expect(objects.head(item.objectKey)).resolves.toMatchObject({ exists: false });
    }
  });
});
