// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDb } from "@/db/client";
import { PostgresRepository } from "@/lib/storage/postgres-repository";
import { PostgresLifecycleStore } from "@/lib/lifecycle/postgres-store";
import { runCleanup } from "@/lib/lifecycle/protocol";
import { createS3Transport, FilebaseObjectStore } from "@/lib/storage/filebase-store";
import { storeUpload } from "@/lib/storage/uploads";
import type { LifecycleStore } from "@/lib/lifecycle/store";
import type { ObjectStore } from "@/lib/storage/object-store";
import {
  resolveIsolatedAcceptanceEnv,
  verifyConnectedTestDatabaseIdentity,
} from "@/test/db-safety";

/**
 * Isolated infrastructure acceptance suite.
 *
 * Requires BOTH:
 * - `ACCEPTANCE=1`
 * - Isolated `TEST_DATABASE_URL` and `FILEBASE_TEST_BUCKET`
 *
 * Never falls back to `DATABASE_URL` or live `FILEBASE_BUCKET`.
 */
const ISOLATED = resolveIsolatedAcceptanceEnv();
const REQUESTED = ISOLATED.requested;
const READY = REQUESTED && ISOLATED.ready;
const ACCEPTANCE_CFG = ISOLATED.config;

const suite = READY ? describe : describe.skip;

if (REQUESTED && !READY) {
  describe("isolated infrastructure acceptance", () => {
    it("requires isolated acceptance credentials", () => {
      throw new Error(
        ISOLATED.reason ??
          "ACCEPTANCE=1 but isolated credentials are missing. Set TEST_DATABASE_URL and FILEBASE_TEST_BUCKET.",
      );
    });
  });
}

const OWNER = `acceptance-${Date.now()}`;
const PNG = new Uint8Array(
  Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082",
    "hex",
  ),
);

// These tests talk to real Neon and Filebase over the network: a single case
// can spend seconds on uploads and deletes, and the batch case does three of
// each. The 5s default is a property of the unit suite, not of this one.
suite("isolated infrastructure acceptance", { timeout: 60_000 }, () => {
  const db = ACCEPTANCE_CFG ? createDb(ACCEPTANCE_CFG.testDatabaseUrl) : (null as never);
  const repository = ACCEPTANCE_CFG ? new PostgresRepository(db) : (null as never);
  const lifecycle = ACCEPTANCE_CFG ? new PostgresLifecycleStore(db) : (null as never);
  const objects = ACCEPTANCE_CFG
    ? new FilebaseObjectStore(
        createS3Transport({
          accessKeyId: ACCEPTANCE_CFG.accessKeyId,
          secretAccessKey: ACCEPTANCE_CFG.secretAccessKey,
          bucket: ACCEPTANCE_CFG.bucket,
          endpoint: ACCEPTANCE_CFG.endpoint,
          region: ACCEPTANCE_CFG.region,
        }),
      )
    : (null as never);
  let dbVerified = false;

  async function wipe() {
    if (!dbVerified) return;
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
      delete from deletion_jobs where resource_id not in (select id from apologies)
        and owner_key_hash = ${OWNER}`);
  }

  beforeAll(async () => {
    if (!READY || !ACCEPTANCE_CFG) return;
    await verifyConnectedTestDatabaseIdentity(
      async (sqlText) => {
        const res = await db.execute(sql.raw(sqlText));
        return ((res as unknown as { rows?: Array<{ db_name?: string | null }> }).rows ?? []);
      },
      ACCEPTANCE_CFG.testDatabaseUrl,
    );
    dbVerified = true;
  });

  beforeEach(async () => {
    if (READY && dbVerified) await wipe();
  });

  afterAll(async () => {
    if (READY && dbVerified) await wipe();
  });

  async function seedPublished(): Promise<{
    id: string;
    token: string;
    objectKey: string;
  }> {
    const draft = await repository.createDraft({ userId: OWNER, scopeKey: OWNER }, {
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

    const published = await repository.publish(draft.id, OWNER);
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
