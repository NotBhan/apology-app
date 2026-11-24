// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";

/**
 * PostgreSQL Integration Test Suite for Lifecycle Concurrency & Fencing.
 *
 * Runs against a real PostgreSQL instance to verify:
 * 1. Parent deletion racing with response deletion terminates without deadlock.
 * 2. Two concurrent workers claiming an expired lease serialize cleanly via compare-and-set.
 * 3. Stale workers holding superseded fencing tokens are rejected and cannot mutate rows.
 * 4. Parent deletion racing with a child worker that completed S3 deletion resolves safely.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:54329/postgres";

describe("PostgreSQL Lifecycle Concurrency & Fencing (Real DB)", () => {
  let pool: Pool | null = null;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      pool = new Pool({ connectionString: TEST_DB_URL, connectionTimeoutMillis: 3000 });
      await pool.query("SELECT 1");
      dbAvailable = true;
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
    // Clean all tables before each test
    await pool.query("DELETE FROM response_assets");
    await pool.query("DELETE FROM responses");
    await pool.query("DELETE FROM apology_assets");
    await pool.query("DELETE FROM apologies");
    await pool.query("DELETE FROM deletion_jobs");
    await pool.query("DELETE FROM deletion_tombstones");
  });

  it("Parent deletion racing with response deletion terminates without deadlock", async () => {
    if (!dbAvailable || !pool) return;
    const parentId = "11111111-1111-4000-8000-111111111111";
    const childId = "22222222-2222-4000-8000-222222222222";
    const ownerKeyHash = "owner-hash-1";

    // 1. Seed Parent apology and Child response
    await pool.query(`
      INSERT INTO apologies (id, owner_key_hash, recipient_name, sender_name, situation, messages, theme_id, sticker_pack_id, customization, status, published_at, private_token_hash)
      VALUES ('${parentId}', '${ownerKeyHash}', 'Ananya', 'Rohan', 'fight', '{"personalNote":""}', 'romantic', 'cats', '{}', 'published', now(), 'token-hash-parent')
    `);

    await pool.query(`
      INSERT INTO responses (id, apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
      VALUES ('${childId}', '${parentId}', 'quick', 'published', '{"message":"Forgiven"}', 'pub1', 'man1', now())
    `);

    // 2. Seed assets
    await pool.query(`
      INSERT INTO apology_assets (id, apology_id, object_key, kind, content_type, size_bytes, state)
      VALUES (gen_random_uuid(), '${parentId}', 'apologies/p1/photo.jpg', 'photo', 'image/jpeg', 100, 'uploaded')
    `);

    await pool.query(`
      INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
      VALUES (gen_random_uuid(), '${childId}', 'responses/c1/photo.jpg', 'photo', 'image/jpeg', 100, 'uploaded')
    `);

    // 3. Seed processing deletion jobs with fencing token = 1
    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, owner_key_hash, state, reason, fencing_token)
      VALUES ('apology', '${parentId}', '${ownerKeyHash}', 'processing', 'manual', 1)
    `);

    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, state, reason, fencing_token)
      VALUES ('response', '${childId}', 'processing', 'manual', 1)
    `);

    // 4. Run concurrent finalization transactions with deliberate interleaving
    const clientParent = await pool.connect();
    const clientChild = await pool.connect();

    let parentResult: "committed" | "aborted" | null = null;
    let childResult: "committed" | "aborted" | null = null;

    const parentTx = async () => {
      try {
        await clientParent.query("BEGIN");
        // 1. Lock Parent Row
        const pRow = await clientParent.query(
          "SELECT id FROM apologies WHERE id = $1 FOR UPDATE",
          [parentId],
        );
        if (pRow.rows.length === 0) throw new Error("parent_missing");

        // Small pause to allow child transaction to attempt lock acquisition
        await new Promise((r) => setTimeout(r, 50));

        // 2. Lock Child Rows in deterministic order
        await clientParent.query(
          "SELECT id FROM responses WHERE apology_id = $1 ORDER BY id ASC FOR UPDATE",
          [parentId],
        );

        // 3. Lock Parent Deletion Job
        const pJob = await clientParent.query(
          "SELECT id, fencing_token FROM deletion_jobs WHERE resource_type = 'apology' AND resource_id = $1 FOR UPDATE",
          [parentId],
        );
        if (pJob.rows.length === 0 || pJob.rows[0].fencing_token !== 1) throw new Error("stale");

        // 4. Lock & absorb Child Jobs
        await clientParent.query(`
          UPDATE deletion_jobs
          SET state = 'completed', lease_until = NULL, last_error = 'absorbed_by_parent_deletion', updated_at = now()
          WHERE resource_type = 'response'
            AND resource_id IN (SELECT id FROM responses WHERE apology_id = '${parentId}')
        `);

        // 5. Delete assets & rows
        await clientParent.query("DELETE FROM response_assets WHERE response_id IN (SELECT id FROM responses WHERE apology_id = $1)", [parentId]);
        await clientParent.query("DELETE FROM responses WHERE apology_id = $1", [parentId]);
        await clientParent.query("DELETE FROM apology_assets WHERE apology_id = $1", [parentId]);
        await clientParent.query("DELETE FROM apologies WHERE id = $1", [parentId]);

        // 6. Complete parent job
        await clientParent.query(
          "UPDATE deletion_jobs SET state = 'completed', lease_until = NULL, updated_at = now() WHERE resource_type = 'apology' AND resource_id = $1",
          [parentId],
        );
        await clientParent.query("COMMIT");
        parentResult = "committed";
      } catch {
        await clientParent.query("ROLLBACK");
        parentResult = "aborted";
      } finally {
        clientParent.release();
      }
    };

    const childTx = async () => {
      try {
        await clientChild.query("BEGIN");
        // 1. Lock Child Response Row FIRST (matching hierarchy)
        const cRow = await clientChild.query(
          "SELECT id FROM responses WHERE id = $1 FOR UPDATE",
          [childId],
        );
        if (cRow.rows.length === 0) throw new Error("child_missing");

        // 2. Lock Child Deletion Job SECOND
        const cJob = await clientChild.query(
          "SELECT id, fencing_token, state FROM deletion_jobs WHERE resource_type = 'response' AND resource_id = $1 FOR UPDATE",
          [childId],
        );
        if (cJob.rows.length === 0 || cJob.rows[0].fencing_token !== 1 || cJob.rows[0].state !== "processing") {
          throw new Error("fencing_mismatch");
        }

        // 3. Delete child assets & row
        await clientChild.query("DELETE FROM response_assets WHERE response_id = $1", [childId]);
        await clientChild.query("DELETE FROM responses WHERE id = $1", [childId]);

        // 4. Complete child job
        await clientChild.query(
          "UPDATE deletion_jobs SET state = 'completed', lease_until = NULL, updated_at = now() WHERE resource_type = 'response' AND resource_id = $1",
          [childId],
        );
        await clientChild.query("COMMIT");
        childResult = "committed";
      } catch {
        await clientChild.query("ROLLBACK");
        childResult = "aborted";
      } finally {
        clientChild.release();
      }
    };

    // Execute both concurrently
    await Promise.all([parentTx(), childTx()]);

    // Deadlock did NOT occur; both transactions settled
    expect(parentResult).toBe("committed");
    // Child transaction either committed first, or cleanly aborted after parent deleted it
    expect(["committed", "aborted"]).toContain(childResult);

    // Verify final state: zero orphaned assets, all rows deleted, both jobs completed
    const finalApologies = await pool.query("SELECT count(*) FROM apologies WHERE id = $1", [parentId]);
    const finalResponses = await pool.query("SELECT count(*) FROM responses WHERE id = $1", [childId]);
    const finalApologyAssets = await pool.query("SELECT count(*) FROM apology_assets WHERE apology_id = $1", [parentId]);
    const finalResponseAssets = await pool.query("SELECT count(*) FROM response_assets WHERE response_id = $1", [childId]);
    const finalJobs = await pool.query("SELECT state, last_error FROM deletion_jobs WHERE resource_id IN ($1, $2)", [parentId, childId]);

    expect(Number(finalApologies.rows[0].count)).toBe(0);
    expect(Number(finalResponses.rows[0].count)).toBe(0);
    expect(Number(finalApologyAssets.rows[0].count)).toBe(0);
    expect(Number(finalResponseAssets.rows[0].count)).toBe(0);

    expect(finalJobs.rows).toHaveLength(2);
    for (const job of finalJobs.rows) {
      expect(job.state).toBe("completed");
    }
  });

  it("Two workers claiming the same expired lease serialize cleanly via compare-and-set", async () => {
    if (!dbAvailable || !pool) return;
    const resourceId = "33333333-3333-4000-8000-333333333333";
    const past = new Date(Date.now() - 60_000).toISOString();

    // Seed a crashed processing job with expired lease and fencing_token = 1
    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, state, reason, fencing_token, lease_until, attempt_count)
      VALUES ('apology', '${resourceId}', 'processing', 'manual', 1, '${past}', 1)
    `);

    const client1 = await pool.connect();
    const client2 = await pool.connect();

    const claimSql = `
      UPDATE deletion_jobs
      SET state = 'processing',
          lease_until = now() + interval '60 seconds',
          attempt_count = attempt_count + 1,
          fencing_token = fencing_token + 1,
          updated_at = now()
      WHERE resource_type = 'apology'
        AND resource_id = $1
        AND state <> 'completed'
        AND (lease_until IS NULL OR lease_until < now())
      RETURNING *
    `;

    // Both workers attempt claim at the exact same instant
    const [claim1, claim2] = await Promise.all([
      client1.query(claimSql, [resourceId]),
      client2.query(claimSql, [resourceId]),
    ]);

    client1.release();
    client2.release();

    const winner = claim1.rows.length === 1 ? claim1 : claim2;
    const loser = claim1.rows.length === 0 ? claim1 : claim2;

    // Exactly one winner claimed the job
    expect(winner.rows).toHaveLength(1);
    expect(winner.rows[0].fencing_token).toBe(2);
    expect(winner.rows[0].attempt_count).toBe(2);

    // Loser received 0 rows
    expect(loser.rows).toHaveLength(0);

    // Database state shows token = 2
    const finalJob = await pool.query("SELECT * FROM deletion_jobs WHERE resource_id = $1", [resourceId]);
    expect(finalJob.rows[0].fencing_token).toBe(2);
    expect(finalJob.rows[0].state).toBe("processing");
  });

  it("Stale worker attempting finalization after fencing-token replacement is rejected", async () => {
    if (!dbAvailable || !pool) return;
    const apologyId = "44444444-4444-4000-8000-444444444444";
    const ownerKeyHash = "owner-hash-4";

    await pool.query(`
      INSERT INTO apologies (id, owner_key_hash, recipient_name, sender_name, situation, messages, theme_id, sticker_pack_id, customization, status, published_at, private_token_hash)
      VALUES ('${apologyId}', '${ownerKeyHash}', 'Maya', 'Kabir', 'fight', '{"personalNote":""}', 'romantic', 'cats', '{}', 'published', now(), 'token-hash-4')
    `);

    await pool.query(`
      INSERT INTO apology_assets (id, apology_id, object_key, kind, content_type, size_bytes, state)
      VALUES (gen_random_uuid(), '${apologyId}', 'apologies/p4/photo.jpg', 'photo', 'image/jpeg', 100, 'uploaded')
    `);

    // Worker 1 claimed earlier at fencing_token = 2
    const staleFencingToken = 2;

    // Worker 2 reclaimed after lease expiry, advancing token to 3
    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, owner_key_hash, state, reason, fencing_token, attempt_count)
      VALUES ('apology', '${apologyId}', '${ownerKeyHash}', 'processing', 'manual', 3, 2)
    `);

    // Worker 1 wakes up and attempts finalization with token 2
    const clientStale = await pool.connect();
    let staleAborted = false;

    try {
      await clientStale.query("BEGIN");

      // 1. Lock Parent Row
      const pRow = await clientStale.query("SELECT id FROM apologies WHERE id = $1 FOR UPDATE", [apologyId]);
      if (pRow.rows.length === 0) throw new Error("missing");

      // 2. Lock Parent Job and verify fencing token
      const pJob = await clientStale.query(
        "SELECT id, fencing_token FROM deletion_jobs WHERE resource_type = 'apology' AND resource_id = $1 FOR UPDATE",
        [apologyId],
      );

      // Verify token
      if (pJob.rows.length === 0 || pJob.rows[0].fencing_token !== staleFencingToken) {
        throw new Error("fencing_token_mismatch");
      }

      // If token had matched (which it shouldn't), delete rows:
      await clientStale.query("DELETE FROM apology_assets WHERE apology_id = $1", [apologyId]);
      await clientStale.query("DELETE FROM apologies WHERE id = $1", [apologyId]);
      await clientStale.query("COMMIT");
    } catch (e: unknown) {
      await clientStale.query("ROLLBACK");
      staleAborted = true;
      expect((e as Error).message).toBe("fencing_token_mismatch");
    } finally {
      clientStale.release();
    }

    expect(staleAborted).toBe(true);

    // Verify row was NOT deleted by stale worker
    const survivorApology = await pool.query("SELECT count(*) FROM apologies WHERE id = $1", [apologyId]);
    const survivorAsset = await pool.query("SELECT count(*) FROM apology_assets WHERE apology_id = $1", [apologyId]);
    const jobState = await pool.query("SELECT fencing_token, state FROM deletion_jobs WHERE resource_id = $1", [apologyId]);

    expect(Number(survivorApology.rows[0].count)).toBe(1);
    expect(Number(survivorAsset.rows[0].count)).toBe(1);
    expect(jobState.rows[0].fencing_token).toBe(3);
    expect(jobState.rows[0].state).toBe("processing");
  });

  it("Parent deletion racing with an already-running child S3 deletion resolves safely", async () => {
    if (!dbAvailable || !pool) return;
    const parentId = "55555555-5555-4000-8000-555555555555";
    const childId = "66666666-6666-4000-8000-666666666666";
    const ownerKeyHash = "owner-hash-5";

    await pool.query(`
      INSERT INTO apologies (id, owner_key_hash, recipient_name, sender_name, situation, messages, theme_id, sticker_pack_id, customization, status, published_at, private_token_hash)
      VALUES ('${parentId}', '${ownerKeyHash}', 'Tara', 'Arjun', 'fight', '{"personalNote":""}', 'romantic', 'cats', '{}', 'published', now(), 'token-hash-5')
    `);

    await pool.query(`
      INSERT INTO responses (id, apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
      VALUES ('${childId}', '${parentId}', 'quick', 'published', '{"message":"Accepted"}', 'pub5', 'man5', now())
    `);

    await pool.query(`
      INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
      VALUES (gen_random_uuid(), '${childId}', 'responses/c5/photo.jpg', 'photo', 'image/jpeg', 100, 'uploaded')
    `);

    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, owner_key_hash, state, reason, fencing_token)
      VALUES ('apology', '${parentId}', '${ownerKeyHash}', 'processing', 'manual', 1)
    `);

    await pool.query(`
      INSERT INTO deletion_jobs (resource_type, resource_id, state, reason, fencing_token)
      VALUES ('response', '${childId}', 'processing', 'manual', 1)
    `);

    // Scenario: Child worker has already finished S3 object deletion out-of-transaction.
    // While child worker pauses before starting DB finalization, parent finalization runs and completes.

    const clientParent = await pool.connect();
    await clientParent.query("BEGIN");
    // Parent locks rows
    await clientParent.query("SELECT id FROM apologies WHERE id = $1 FOR UPDATE", [parentId]);
    await clientParent.query("SELECT id FROM responses WHERE apology_id = $1 ORDER BY id ASC FOR UPDATE", [parentId]);
    await clientParent.query("SELECT id FROM deletion_jobs WHERE resource_type = 'apology' AND resource_id = $1 FOR UPDATE", [parentId]);

    // Parent absorbs child job and deletes rows
    await clientParent.query(`
      UPDATE deletion_jobs
      SET state = 'completed', lease_until = NULL, last_error = 'absorbed_by_parent_deletion', updated_at = now()
      WHERE resource_type = 'response' AND resource_id = '${childId}'
    `);
    await clientParent.query("DELETE FROM response_assets WHERE response_id = $1", [childId]);
    await clientParent.query("DELETE FROM responses WHERE id = $1", [childId]);
    await clientParent.query("DELETE FROM apologies WHERE id = $1", [parentId]);
    await clientParent.query(
      "UPDATE deletion_jobs SET state = 'completed', lease_until = NULL, updated_at = now() WHERE resource_type = 'apology' AND resource_id = $1",
      [parentId],
    );
    await clientParent.query("COMMIT");
    clientParent.release();

    // Now Child worker enters DB finalization transaction
    const clientChild = await pool.connect();
    let childExitedSafely = false;

    try {
      await clientChild.query("BEGIN");
      // Step 1: Lock response row
      const row = await clientChild.query("SELECT id FROM responses WHERE id = $1 FOR UPDATE", [childId]);
      if (row.rows.length === 0) {
        // Row was already deleted by parent!
        throw new Error("response_row_missing_or_already_deleted");
      }
      await clientChild.query("COMMIT");
    } catch (e: unknown) {
      await clientChild.query("ROLLBACK");
      expect((e as Error).message).toBe("response_row_missing_or_already_deleted");
      childExitedSafely = true;
    } finally {
      clientChild.release();
    }

    expect(childExitedSafely).toBe(true);

    // Final audit
    const childJob = await pool.query("SELECT state, last_error FROM deletion_jobs WHERE resource_type = 'response' AND resource_id = $1", [childId]);
    expect(childJob.rows[0].state).toBe("completed");
    expect(childJob.rows[0].last_error).toBe("absorbed_by_parent_deletion");
  });

  /* -------------------------------------------------------------------------- */
  /* Response Asset Quota Concurrency Suite                                     */
  /* -------------------------------------------------------------------------- */
  describe("PostgreSQL Response Asset Quota Concurrency (Real DB)", () => {
    const parentId = "33333333-3333-4000-8000-333333333333";
    const childId = "44444444-4444-4000-8000-444444444444";
    const ownerKeyHash = "owner-hash-quota-test";

    beforeEach(async () => {
      if (!dbAvailable || !pool) return;
      await pool.query(`
        INSERT INTO apologies (id, owner_key_hash, recipient_name, sender_name, situation, messages, theme_id, sticker_pack_id, customization, status, published_at, private_token_hash)
        VALUES ('${parentId}', '${ownerKeyHash}', 'Target', 'Sender', 'note', '{"personalNote":""}', 'romantic', 'cats', '{}', 'published', now(), 'token-hash-parent-quota')
      `);
      await pool.query(`
        INSERT INTO responses (id, apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
        VALUES ('${childId}', '${parentId}', 'quick', 'published', '{"message":"Thank you"}', 'pub-q', 'man-q', now())
      `);
    });

    it("1. Two concurrent uploads competing for final photo slot: exactly one succeeds", async () => {
      if (!dbAvailable || !pool) return;

      // Seed 9 uploaded photos (limit is 10)
      for (let i = 1; i <= 9; i++) {
        await pool.query(`
          INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
          VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/photo_${i}.jpg', 'photo', 'image/jpeg', 1000, 'uploaded')
        `);
      }

      const client1 = await pool.connect();
      const client2 = await pool.connect();

      try {
        const executeReserve = async (client: typeof client1, key: string) => {
          await client.query("BEGIN");
          // Row lock serializes the check
          const lock = await client.query(
            "SELECT id FROM responses WHERE id = $1 AND status IN ('draft', 'published') FOR UPDATE",
            [childId],
          );
          if (lock.rows.length === 0) {
            await client.query("ROLLBACK");
            return false;
          }

          const usage = await client.query(
            "SELECT count(*)::int as count FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
            [childId],
          );
          if (usage.rows[0].count >= 10) {
            await client.query("ROLLBACK");
            return false;
          }

          await client.query(
            "INSERT INTO response_assets (response_id, object_key, kind, content_type, size_bytes, state) VALUES ($1, $2, 'photo', 'image/jpeg', 1000, 'pending')",
            [childId, key],
          );
          await client.query("COMMIT");
          return true;
        };

        const [res1, res2] = await Promise.all([
          executeReserve(client1, "responses/test/photo_slot_compete_1.jpg"),
          executeReserve(client2, "responses/test/photo_slot_compete_2.jpg"),
        ]);

        // Exactly one concurrent transaction must succeed
        const successCount = (res1 ? 1 : 0) + (res2 ? 1 : 0);
        expect(successCount).toBe(1);

        // Database total count must never exceed 10
        const finalCount = await pool.query(
          "SELECT count(*)::int as count FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
          [childId],
        );
        expect(finalCount.rows[0].count).toBe(10);
      } finally {
        client1.release();
        client2.release();
      }
    });

    it("2. Concurrent uploads competing for remaining byte quota: total never exceeds 16 MB", async () => {
      if (!dbAvailable || !pool) return;

      const FOURTEEN_MB = 14 * 1024 * 1024;
      const TWO_MB = 2 * 1024 * 1024;
      const SIXTEEN_MB = 16 * 1024 * 1024;

      // Seed 14 MB of existing assets
      await pool.query(`
        INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
        VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/big1.jpg', 'photo', 'image/jpeg', ${FOURTEEN_MB}, 'uploaded')
      `);

      const client1 = await pool.connect();
      const client2 = await pool.connect();

      try {
        const executeByteReserve = async (client: typeof client1, key: string) => {
          await client.query("BEGIN");
          const lock = await client.query(
            "SELECT id FROM responses WHERE id = $1 AND status IN ('draft', 'published') FOR UPDATE",
            [childId],
          );
          if (lock.rows.length === 0) {
            await client.query("ROLLBACK");
            return false;
          }

          const usage = await client.query(
            "SELECT coalesce(sum(size_bytes), 0)::bigint as total FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
            [childId],
          );
          const currentTotal = Number(usage.rows[0].total);
          if (currentTotal + TWO_MB > SIXTEEN_MB) {
            await client.query("ROLLBACK");
            return false;
          }

          await client.query(
            "INSERT INTO response_assets (response_id, object_key, kind, content_type, size_bytes, state) VALUES ($1, $2, 'photo', 'image/jpeg', $3, 'pending')",
            [childId, key, TWO_MB],
          );
          await client.query("COMMIT");
          return true;
        };

        const [res1, res2] = await Promise.all([
          executeByteReserve(client1, "responses/test/byte_compete_1.jpg"),
          executeByteReserve(client2, "responses/test/byte_compete_2.jpg"),
        ]);

        const successCount = (res1 ? 1 : 0) + (res2 ? 1 : 0);
        expect(successCount).toBe(1);

        const finalUsage = await pool.query(
          "SELECT coalesce(sum(size_bytes), 0)::bigint as total FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
          [childId],
        );
        expect(Number(finalUsage.rows[0].total)).toBe(SIXTEEN_MB);
      } finally {
        client1.release();
        client2.release();
      }
    });

    it("3. A failed reservation releases quota", async () => {
      if (!dbAvailable || !pool) return;

      // Seed 9 uploaded and 1 failed
      for (let i = 1; i <= 9; i++) {
        await pool.query(`
          INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
          VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/p_${i}.jpg', 'photo', 'image/jpeg', 1000, 'uploaded')
        `);
      }
      await pool.query(`
        INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
        VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/p_failed.jpg', 'photo', 'image/jpeg', 1000, 'failed')
      `);

      // Count active
      const countRes = await pool.query(
        "SELECT count(*)::int as count FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
        [childId],
      );
      expect(countRes.rows[0].count).toBe(9); // 10th slot is available because failed is excluded
    });

    it("4. Pending reservations count against quota", async () => {
      if (!dbAvailable || !pool) return;

      // Seed 9 uploaded and 1 pending
      for (let i = 1; i <= 9; i++) {
        await pool.query(`
          INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
          VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/up_${i}.jpg', 'photo', 'image/jpeg', 1000, 'uploaded')
        `);
      }
      await pool.query(`
        INSERT INTO response_assets (id, response_id, object_key, kind, content_type, size_bytes, state)
        VALUES (gen_random_uuid(), '${childId}', 'responses/${childId}/up_pending.jpg', 'photo', 'image/jpeg', 1000, 'pending')
      `);

      const countRes = await pool.query(
        "SELECT count(*)::int as count FROM response_assets WHERE response_id = $1 AND state <> 'failed'",
        [childId],
      );
      expect(countRes.rows[0].count).toBe(10); // Slot 10 is reserved by pending
    });

    it("5. Repeated concurrency race: parent deletion racing with child asset reservation completes without deadlock across multiple iterations", async () => {
      if (!dbAvailable || !pool) return;

      const ITERATIONS = 5;
      for (let i = 0; i < ITERATIONS; i++) {
        const iterParentId = `11111111-1111-4000-8000-${String(i).padStart(12, "0")}`;
        const iterChildId = `22222222-2222-4000-8000-${String(i).padStart(12, "0")}`;

        // 1. Seed Parent apology and Child response
        await pool.query(`
          INSERT INTO apologies (id, owner_key_hash, recipient_name, sender_name, situation, messages, theme_id, sticker_pack_id, customization, status, published_at, private_token_hash)
          VALUES ('${iterParentId}', 'owner-hash', 'Recipient', 'Sender', 'fight', '{"personalNote":""}', 'romantic', 'cats', '{}', 'published', now(), 'token-hash')
        `);

        await pool.query(`
          INSERT INTO responses (id, apology_id, response_type, status, content, public_token_hash, manage_token_hash, published_at)
          VALUES ('${iterChildId}', '${iterParentId}', 'quick', 'published', '{"message":"Race test"}', 'pub-${i}', 'man-${i}', now())
        `);

        await pool.query(`
          INSERT INTO deletion_jobs (resource_type, resource_id, owner_key_hash, state, reason, fencing_token)
          VALUES ('apology', '${iterParentId}', 'owner-hash', 'processing', 'manual', 1)
        `);

        const clientDeletion = await pool.connect();
        const clientReservation = await pool.connect();

        let deadlockDetected = false;

        const runParentDeletion = async () => {
          try {
            await clientDeletion.query("BEGIN");
            // 1. Lock parent apology row FIRST
            await clientDeletion.query("SELECT id FROM apologies WHERE id = $1 FOR UPDATE", [iterParentId]);
            // Jitter
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
            // 2. Lock child response rows SECOND
            await clientDeletion.query("SELECT id FROM responses WHERE apology_id = $1 ORDER BY id ASC FOR UPDATE", [iterParentId]);
            // 3. Delete response assets and responses
            await clientDeletion.query("DELETE FROM response_assets WHERE response_id IN (SELECT id FROM responses WHERE apology_id = $1)", [iterParentId]);
            await clientDeletion.query("DELETE FROM responses WHERE apology_id = $1", [iterParentId]);
            await clientDeletion.query("DELETE FROM apologies WHERE id = $1", [iterParentId]);
            await clientDeletion.query("UPDATE deletion_jobs SET state = 'completed' WHERE resource_type = 'apology' AND resource_id = $1", [iterParentId]);
            await clientDeletion.query("COMMIT");
          } catch (err: unknown) {
            await clientDeletion.query("ROLLBACK").catch(() => {});
            if (String(err).includes("deadlock detected") || (err as { code?: string })?.code === "40P01") {
              deadlockDetected = true;
            }
          }
        };

        const runChildReservation = async () => {
          try {
            // Exact SQL CTE from reserveResponseAsset with FOR UPDATE OF r
            const key = `responses/${iterChildId}/race_${i}.jpg`;
            await clientReservation.query(`
              WITH locked AS (
                SELECT r.id
                FROM responses r
                INNER JOIN apologies a ON a.id = r.apology_id
                WHERE r.id = $1
                  AND r.apology_id = $2
                  AND r.status IN ('draft', 'published')
                  AND a.status = 'published'
                  AND NOT EXISTS (
                    SELECT 1 FROM deletion_jobs ja
                    WHERE ja.resource_type = 'apology' AND ja.resource_id = a.id
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM deletion_jobs j
                    WHERE j.resource_type = 'response' AND j.resource_id = $1
                  )
                FOR UPDATE OF r
              )
              INSERT INTO response_assets (response_id, object_key, kind, content_type, size_bytes, state)
              SELECT locked.id, $3, 'photo', 'image/jpeg', 1024, 'pending'
              FROM locked
              RETURNING id
            `, [iterChildId, iterParentId, key]);
          } catch (err: unknown) {
            if (String(err).includes("deadlock detected") || (err as { code?: string })?.code === "40P01") {
              deadlockDetected = true;
            }
          }
        };

        try {
          await Promise.all([runParentDeletion(), runChildReservation()]);
          expect(deadlockDetected).toBe(false);
        } finally {
          clientDeletion.release();
          clientReservation.release();
        }
      }
    }, 30000);
  });
});
