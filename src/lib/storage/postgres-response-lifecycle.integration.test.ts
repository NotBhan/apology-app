// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createDb } from "@/db/client";
import { PostgresRepository } from "./postgres-repository";
import { ResponseRepository } from "./response-repository";
import { PostgresLifecycleStore } from "@/lib/lifecycle/postgres-store";
import { runCleanup } from "@/lib/lifecycle/protocol";
import type { ObjectStore } from "./object-store";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:54329/postgres";

describe("PostgreSQL Real DB Integration: Response Repository & Lifecycle", () => {
  let pool: Pool | null = null;
  let dbAvailable = false;
  let db: ReturnType<typeof createDb>;
  let apologyRepo: PostgresRepository;
  let responseRepo: ResponseRepository;
  let lifecycleStore: PostgresLifecycleStore;

  const deletedKeys = new Set<string>();
  const mockObjectStore: ObjectStore = {
    put: async () => {},
    presignGet: async () => "https://example.com/asset.jpg",
    head: async (key: string) => ({ exists: !deletedKeys.has(key) }),
    deleteMany: async (keys: string[]) => {
      for (const k of keys) deletedKeys.add(k);
      return { deleted: keys, missing: [], failed: [] };
    },
  };

  beforeAll(async () => {
    try {
      pool = new Pool({ connectionString: TEST_DB_URL, connectionTimeoutMillis: 5000 });
      await pool.query("SELECT 1");
      dbAvailable = true;
      db = createDb(TEST_DB_URL);
      apologyRepo = new PostgresRepository(db);
      responseRepo = new ResponseRepository(db);
      lifecycleStore = new PostgresLifecycleStore(db);
    } catch {
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable || !pool) return;
    await pool.query("DELETE FROM response_assets");
    await pool.query("DELETE FROM responses");
    await pool.query("DELETE FROM apology_assets");
    await pool.query("DELETE FROM apologies");
    await pool.query("DELETE FROM deletion_jobs");
    await pool.query("DELETE FROM deletion_tombstones");
  });

  async function seedParentApology(status: "draft" | "published" = "published") {
    const parent = await apologyRepo.createDraft(
      { userId: "owner-real-db", scopeKey: "owner-real-db" },
      { recipientName: "Ananya", senderName: "Kabir" }
    );
    await apologyRepo.saveDraft(parent.id, "owner-real-db", {
      recipientName: "Ananya",
      senderName: "Kabir",
      situation: "other",
      situationCustom: "test",
      language: "en",
      messages: { message1: "Hey", message2: "Sorry", message3: "Miss you", personalNote: "" },
      themeId: "heartfelt",
      stickerPackId: "cats",
      customization: { audio: { source: "none", volume: 0 }, photos: [], memoryStyle: "polaroid" },
      linkDurationDays: 3,
    });
    if (status === "published") {
      const pub = await apologyRepo.publish(parent.id, "owner-real-db", 3);
      return { id: parent.id, token: pub.accessToken };
    }
    return { id: parent.id, token: "" };
  }

  it("1. Response draft creation, updates, and parent liveness enforcement", async () => {
    if (!dbAvailable) return;
    const parent = await seedParentApology("published");

    // Can create draft for published parent
    const draft = await responseRepo.createDraft(parent.id, "quick", { message: "Initial draft" });
    expect(draft.id).toBeDefined();
    expect(draft.apologyId).toBe(parent.id);
    expect(draft.responseType).toBe("quick");
    expect(draft.status).toBe("draft");
    expect(draft.content).toEqual({ message: "Initial draft" });

    // Update draft content
    const updated = await responseRepo.saveDraft(draft.id, {
      message: "Updated draft message",
      recipientEmotion: "forgive",
    });
    expect(updated.content).toEqual({
      message: "Updated draft message",
      recipientEmotion: "forgive",
    });

    // Attempting to create a draft for a non-existent parent fails
    await expect(
      responseRepo.createDraft("00000000-0000-4000-8000-000000000000", "quick")
    ).rejects.toThrow("PARENT_NOT_ACCESSIBLE");

    // Attempting to create draft for unpublished parent fails
    const draftParent = await seedParentApology("draft");
    await expect(
      responseRepo.createDraft(draftParent.id, "quick")
    ).rejects.toThrow("PARENT_NOT_ACCESSIBLE");
  });

  it("2. Publication, dual capability tokens, and cryptographic hash verification", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");
    const draft = await responseRepo.createDraft(parent.id, "experience", {
      experienceType: "birthday",
      content: { headline: "Happy Birthday", message: "Cheers!" },
    });

    const pubResult = await responseRepo.publishResponse(draft.id);
    expect(pubResult.publicToken).toHaveLength(43);
    expect(pubResult.manageToken).toHaveLength(43);
    expect(pubResult.publicToken).not.toEqual(pubResult.manageToken);

    // Verify row in PostgreSQL
    const res = await pool.query("SELECT * FROM responses WHERE id = $1", [draft.id]);
    expect(res.rows).toHaveLength(1);
    const row = res.rows[0];
    expect(row.status).toBe("published");
    expect(row.public_token_hash).toHaveLength(43);
    expect(row.manage_token_hash).toHaveLength(43);
    expect(row.published_at).not.toBeNull();

    // Verify lookup by public token
    const publicView = await responseRepo.getByPublicToken(pubResult.publicToken);
    expect(publicView).not.toBeNull();
    expect(publicView?.response.id).toBe(draft.id);
    expect(publicView?.parent.senderName).toBe("Kabir");

    // Verify lookup by manage token
    const manageView = await responseRepo.getByManageToken(pubResult.manageToken);
    expect(manageView).not.toBeNull();
    expect(manageView?.id).toBe(draft.id);
    expect(manageView?.status).toBe("published");
  });

  it("3. Database constraints: response_type and status CHECK constraints", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");

    // Invalid response_type rejected by responses_type_check
    await expect(
      pool.query(`
        INSERT INTO responses (id, apology_id, response_type, status, content)
        VALUES (gen_random_uuid(), '${parent.id}', 'invalid_type', 'draft', '{}')
      `)
    ).rejects.toThrow(/responses_type_check/);

    // Invalid status rejected by responses_status_check
    await expect(
      pool.query(`
        INSERT INTO responses (id, apology_id, response_type, status, content)
        VALUES (gen_random_uuid(), '${parent.id}', 'quick', 'invalid_status', '{}')
      `)
    ).rejects.toThrow(/responses_status_check/);

    // Published status without token hashes rejected by responses_published_complete
    await expect(
      pool.query(`
        INSERT INTO responses (id, apology_id, response_type, status, content, published_at)
        VALUES (gen_random_uuid(), '${parent.id}', 'quick', 'published', '{}', now())
      `)
    ).rejects.toThrow(/responses_published_complete/);
  });

  it("4. Revocation and access cut-off", async () => {
    if (!dbAvailable) return;
    const parent = await seedParentApology("published");
    const draft = await responseRepo.createDraft(parent.id, "quick", { message: "Hello" });
    const { publicToken, manageToken } = await responseRepo.publishResponse(draft.id);

    // Owner revokes response
    const revoked = await responseRepo.revokeResponse(manageToken);
    expect(revoked.status).toBe("revoked");

    // Public token no longer grants access
    const publicView = await responseRepo.getByPublicToken(publicToken);
    expect(publicView).toBeNull();

    // Owner can still view via manageToken
    const manageView = await responseRepo.getByManageToken(manageToken);
    expect(manageView).not.toBeNull();
    expect(manageView?.status).toBe("revoked");

    // Owner can restore back to published
    const restored = await responseRepo.restoreResponse(manageToken);
    expect(restored.status).toBe("published");
    const restoredPublicView = await responseRepo.getByPublicToken(publicToken);
    expect(restoredPublicView).not.toBeNull();
  });

  it("5. Response asset reservation, completion, and quota enforcement", async () => {
    if (!dbAvailable) return;
    const parent = await seedParentApology("published");
    const draft = await responseRepo.createDraft(parent.id, "quick");

    // Reserve an asset
    const reserved = await responseRepo.reserveResponseAsset({
      responseId: draft.id,
      objectKey: `responses/${draft.id}/photo-1.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024 * 1024, // 1 MB
      maxAssets: 3,
    });
    expect(reserved).not.toBeNull();
    expect(reserved?.state).toBe("pending");

    // Complete/promote the asset upload
    const promoted = await responseRepo.promoteResponseAsset(
      reserved!.id,
      `responses/${draft.id}/photo-1.jpg`,
      1024 * 1024
    );
    expect(promoted).toBe(true);

    // Exceeding maxAssets limit returns null (quota enforcement)
    const extra1 = await responseRepo.reserveResponseAsset({
      responseId: draft.id,
      objectKey: `responses/${draft.id}/photo-2.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 1, // Only allowed 1, already have 1
    });
    expect(extra1).toBeNull();

    // Foreign key constraint on response_assets: deleting response fails loudly (RESTRICT)
    if (pool) {
      await expect(
        pool.query("DELETE FROM responses WHERE id = $1", [draft.id])
      ).rejects.toThrow(/foreign key constraint/i);
    }
  });

  it("6. Response deletion lifecycle and cleanup worker finalization", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");
    const draft = await responseRepo.createDraft(parent.id, "quick");
    const reserved = await responseRepo.reserveResponseAsset({
      responseId: draft.id,
      objectKey: `responses/${draft.id}/photo-to-delete.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 500,
      maxAssets: 3,
    });
    await responseRepo.promoteResponseAsset(
      reserved!.id,
      `responses/${draft.id}/photo-to-delete.jpg`,
      500
    );
    const { manageToken } = await responseRepo.publishResponse(draft.id);

    // Request deletion
    const jobScheduled = await responseRepo.deleteResponse(manageToken);
    expect(jobScheduled).toBe(true);

    // Verify deletion job scheduled in PostgreSQL
    const jobRes = await pool.query(
      "SELECT * FROM deletion_jobs WHERE resource_type = 'response' AND resource_id = $1",
      [draft.id]
    );
    expect(jobRes.rows).toHaveLength(1);
    expect(jobRes.rows[0].state).toBe("pending");

    // Run cleanup cycle
    const report = await runCleanup({
      store: lifecycleStore,
      objects: mockObjectStore,
      now: () => new Date(),
    });
    expect(report.deleted).toBeGreaterThanOrEqual(1);

    // Verify response row and assets removed from PostgreSQL
    const postResp = await pool.query("SELECT * FROM responses WHERE id = $1", [draft.id]);
    expect(postResp.rows).toHaveLength(0);
    const postAssets = await pool.query("SELECT * FROM response_assets WHERE response_id = $1", [draft.id]);
    expect(postAssets.rows).toHaveLength(0);

    // Deletion job marked completed
    const finalJob = await pool.query(
      "SELECT * FROM deletion_jobs WHERE resource_type = 'response' AND resource_id = $1",
      [draft.id]
    );
    expect(finalJob.rows[0].state).toBe("completed");
  });

  it("7. Parent apology deletion cascades to clean up child responses and assets", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");
    const child1 = await responseRepo.createDraft(parent.id, "quick");
    await responseRepo.publishResponse(child1.id);
    const child2 = await responseRepo.createDraft(parent.id, "experience", {
      experienceType: "birthday",
      content: { message: "HB" },
    });
    await responseRepo.publishResponse(child2.id);

    // Schedule parent deletion
    await apologyRepo.requestDeletionByOwner(parent.id, "owner-real-db");

    // Run cleanup cycle
    const report = await runCleanup({
      store: lifecycleStore,
      objects: mockObjectStore,
      now: () => new Date(),
    });
    expect(report.deleted).toBeGreaterThanOrEqual(1);

    // Verify both parent and all child responses deleted from PostgreSQL
    const parentCheck = await pool.query("SELECT * FROM apologies WHERE id = $1", [parent.id]);
    expect(parentCheck.rows).toHaveLength(0);
    const childrenCheck = await pool.query("SELECT * FROM responses WHERE apology_id = $1", [parent.id]);
    expect(childrenCheck.rows).toHaveLength(0);

    // Verify tombstone recorded
    const tombCheck = await pool.query("SELECT * FROM deletion_tombstones WHERE apology_id = $1", [parent.id]);
    expect(tombCheck.rows).toHaveLength(1);
  });

  it("8. Status CHECK constraint enforces exact canonical statuses: ('draft', 'published', 'revoked', 'deleted')", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");

    // All 4 valid statuses succeed (supplying unique publication tokens to satisfy responses_published_complete and uniqueness)
    const validStatuses = ["draft", "published", "revoked", "deleted"] as const;
    for (const status of validStatuses) {
      const res = await pool.query(
        `INSERT INTO responses (apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
         VALUES ($1, 'quick', $2, '{}', $3, $4, now())
         RETURNING id, status`,
        [parent.id, status, `pub-hash-${status}`, `man-hash-${status}`]
      );
      expect(res.rows[0].status).toBe(status);
    }

    // Invalid statuses are rejected by responses_status_check CHECK constraint
    const invalidStatuses = ["expired", "invalid", "archived", "pending"];
    for (const invalid of invalidStatuses) {
      await expect(
        pool.query(
          `INSERT INTO responses (apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
           VALUES ($1, 'quick', $2, '{}', $3, $4, now())`,
          [parent.id, invalid, `pub-hash-${invalid}`, `man-hash-${invalid}`]
        )
      ).rejects.toThrow(/responses_status_check|check constraint/i);
    }
  });

  it("9. Permanent-link invariant: no expires_at column on responses and access never expires based on elapsed time", async () => {
    if (!dbAvailable || !pool) return;

    // Verify database schema has no expires_at or link_duration_days column on responses table
    const columnsRes = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'responses' AND column_name IN ('expires_at', 'link_duration_days')
    `);
    expect(columnsRes.rows).toHaveLength(0);

    const parent = await seedParentApology("published");
    const draft = await responseRepo.createDraft(parent.id, "quick", { message: "Permanent response test" });
    const { publicToken, manageToken } = await responseRepo.publishResponse(draft.id);

    // Initial access is live
    const record = await responseRepo.getByPublicToken(publicToken);
    expect(record).not.toBeNull();
    expect(record?.response.content).toEqual({ message: "Permanent response test" });

    // Explicit revocation makes it inaccessible
    await responseRepo.revokeResponse(manageToken);
    const revokedCheck = await responseRepo.getByPublicToken(publicToken);
    expect(revokedCheck).toBeNull();

    // Explicit restoration restores access
    await responseRepo.restoreResponse(manageToken);
    const restoredCheck = await responseRepo.getByPublicToken(publicToken);
    expect(restoredCheck).not.toBeNull();
    expect(restoredCheck?.response.id).toBe(draft.id);
  });

  it("10. reserveResponseAsset parent-liveness, matching parent, and deletion-job fencing", async () => {
    if (!dbAvailable || !pool) return;
    const parent = await seedParentApology("published");
    const otherParent = await seedParentApology("published");
    const draftParent = await seedParentApology("draft");

    // Case A: Successful reservation with matching published parent
    const draftA = await responseRepo.createDraft(parent.id, "quick");
    const reservedA = await responseRepo.reserveResponseAsset({
      responseId: draftA.id,
      apologyId: parent.id,
      objectKey: `responses/${draftA.id}/photo-live.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 5,
    });
    expect(reservedA).not.toBeNull();
    expect(reservedA?.apologyId).toBe(draftA.id);

    // Case B: Mismatched apologyId fails reservation
    const draftB = await responseRepo.createDraft(parent.id, "quick");
    const reservedB = await responseRepo.reserveResponseAsset({
      responseId: draftB.id,
      apologyId: otherParent.id, // Wrong parent
      objectKey: `responses/${draftB.id}/photo-mismatch.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 5,
    });
    expect(reservedB).toBeNull();

    // Case C: Draft parent (not published) fails reservation
    const draftC = await pool.query(
      `INSERT INTO responses (apology_id, response_type, status, content)
       VALUES ($1, 'quick', 'draft', '{}') RETURNING id`,
      [draftParent.id]
    );
    const draftCId = draftC.rows[0].id;
    const reservedC = await responseRepo.reserveResponseAsset({
      responseId: draftCId,
      apologyId: draftParent.id,
      objectKey: `responses/${draftCId}/photo-draft-parent.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 5,
    });
    expect(reservedC).toBeNull();

    // Case D: Parent apology with pending deletion job fails reservation
    const draftD = await responseRepo.createDraft(parent.id, "quick");
    await pool.query(
      `INSERT INTO deletion_jobs (resource_type, resource_id, state, reason, fencing_token)
       VALUES ('apology', $1, 'pending', 'manual', 1)`,
      [parent.id]
    );
    const reservedD = await responseRepo.reserveResponseAsset({
      responseId: draftD.id,
      apologyId: parent.id,
      objectKey: `responses/${draftD.id}/photo-parent-deleting.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 5,
    });
    expect(reservedD).toBeNull();

    // Case E: Child response with pending deletion job fails reservation
    await pool.query(`DELETE FROM deletion_jobs WHERE resource_type = 'apology' AND resource_id = $1`, [parent.id]);
    const draftE = await responseRepo.createDraft(parent.id, "quick");
    await pool.query(
      `INSERT INTO deletion_jobs (resource_type, resource_id, state, reason, fencing_token)
       VALUES ('response', $1, 'pending', 'manual', 1)`,
      [draftE.id]
    );
    const reservedE = await responseRepo.reserveResponseAsset({
      responseId: draftE.id,
      apologyId: parent.id,
      objectKey: `responses/${draftE.id}/photo-child-deleting.jpg`,
      kind: "photo",
      contentType: "image/jpeg",
      sizeBytes: 1024,
      maxAssets: 5,
    });
    expect(reservedE).toBeNull();
  });
});
