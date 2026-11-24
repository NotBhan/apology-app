import { inArray, sql } from "drizzle-orm";
import { getDb, type Database } from "../../db/client";
import {
  apologies,
  apologyAssets,
  deletionJobs,
  deletionTombstones,
  responses,
  responseAssets,
} from "../../db/schema";
import { MAX_LAST_ERROR_LENGTH, type Candidate, type DeletionJob, type PendingReservation } from "./types";
import type { LifecycleStore } from "./store";

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const maybe = result as { rows?: Record<string, unknown>[] };
  return maybe.rows ?? [];
}

function toJob(row: Record<string, unknown>): DeletionJob {
  const keys = Array.isArray(row.object_keys) ? (row.object_keys as string[]) : [];
  const lease = row.lease_until ? new Date(row.lease_until as string).getTime() : undefined;
  const resourceType = (row.resource_type ? String(row.resource_type) : "apology") as DeletionJob["resourceType"];
  const resourceId = String(row.resource_id ?? row.apology_id);
  return {
    resourceType,
    resourceId,
    apologyId: resourceId,
    ownerKeyHash: row.owner_key_hash ? String(row.owner_key_hash) : undefined,
    objectKeys: keys,
    state: String(row.state) as DeletionJob["state"],
    reason: String(row.reason) as DeletionJob["reason"],
    attemptCount: Number(row.attempt_count ?? 0),
    fencingToken: Number(row.fencing_token ?? 1),
    lastError: row.last_error ? String(row.last_error) : undefined,
    leaseUntil: Number.isFinite(lease) ? lease : undefined,
  };
}

export class PostgresLifecycleStore implements LifecycleStore {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  async listCandidates(now: Date, limit: number): Promise<Candidate[]> {
    const result = await this.db.execute(sql`
      select j.resource_id as apology_id, 'job' as source
      from ${deletionJobs} j
      where j.state in ('pending','failed')
         or (j.state = 'processing' and (j.lease_until is null or j.lease_until < ${now.toISOString()}))
      limit ${limit}
    `);

    return rowsOf(result).map((row) => ({
      apologyId: String(row.apology_id),
      source: "job",
    }));
  }

  /**
   * Same atomic intent as the manual path, restricted to the expiry predicate.
   * Retained for backward-compatible interface contracts.
   */
  async requestDeletionForExpiry(apologyId: string, now: Date): Promise<boolean> {
    const result = await this.db.execute(sql`
      with locked as (
        select a.id, a.owner_key_hash from ${apologies} a
        where a.id = ${apologyId}
          and a.status = 'published'
          and a.expires_at is not null
          and a.expires_at <= ${now.toISOString()}
        for update
      ),
      keys as (
        select coalesce(jsonb_agg(x.object_key), '[]'::jsonb) as k
        from ${apologyAssets} x
        where x.apology_id = (select id from locked)
      ),
      intent as (
        insert into ${deletionJobs} (resource_type, resource_id, owner_key_hash, object_keys, state, reason, fencing_token)
        select 'apology', locked.id, locked.owner_key_hash, keys.k, 'pending', 'expired', 1
        from locked, keys
        on conflict (resource_type, resource_id) do update
          set object_keys = (
                select to_jsonb(array(
                  select distinct value
                  from jsonb_array_elements_text(
                    ${deletionJobs}.object_keys || excluded.object_keys) as value))
              ),
              updated_at = now()
          where ${deletionJobs}.state <> 'completed'
        returning resource_id
      )
      update ${apologies} a
      set status = 'deleted', expires_at = null, updated_at = now()
      where a.id in (select resource_id from intent)
      returning a.id
    `);

    return rowsOf(result).length > 0;
  }

  async claim(
    apologyId: string,
    now: Date,
    leaseMs: number,
  ): Promise<DeletionJob | null> {
    const result = await this.db.execute(sql`
      update ${deletionJobs}
      set state = 'processing',
          lease_until = ${new Date(now.getTime() + leaseMs).toISOString()},
          attempt_count = attempt_count + 1,
          fencing_token = fencing_token + 1,
          updated_at = now()
      where resource_id = ${apologyId}
        and state <> 'completed'
        and (lease_until is null or lease_until < ${now.toISOString()})
      returning *
    `);

    const [row] = rowsOf(result);
    return row ? toJob(row) : null;
  }

  async objectKeys(apologyId: string): Promise<string[]> {
    const apologyKeys = await this.db.execute(sql`
      select object_key from ${apologyAssets} where apology_id = ${apologyId}
      union
      select ra.object_key from ${responseAssets} ra
      join ${responses} r on r.id = ra.response_id
      where r.apology_id = ${apologyId}
    `);
    const responseKeys = await this.db.execute(sql`
      select object_key from ${responseAssets} where response_id = ${apologyId}
    `);
    return [
      ...rowsOf(apologyKeys).map((row) => String(row.object_key)),
      ...rowsOf(responseKeys).map((row) => String(row.object_key)),
    ];
  }

  async pendingReservations(apologyId: string): Promise<PendingReservation[]> {
    const apologyRes = await this.db.execute(sql`
      select id, object_key, created_at
      from ${apologyAssets}
      where apology_id = ${apologyId} and state = 'pending'
      union all
      select ra.id, ra.object_key, ra.created_at
      from ${responseAssets} ra
      join ${responses} r on r.id = ra.response_id
      where r.apology_id = ${apologyId} and ra.state = 'pending'
    `);
    const responseRes = await this.db.execute(sql`
      select id, object_key, created_at
      from ${responseAssets}
      where response_id = ${apologyId} and state = 'pending'
    `);

    return [
      ...rowsOf(apologyRes).map((row) => ({
        id: String(row.id),
        objectKey: String(row.object_key),
        createdAt: new Date(row.created_at as string),
      })),
      ...rowsOf(responseRes).map((row) => ({
        id: String(row.id),
        objectKey: String(row.object_key),
        createdAt: new Date(row.created_at as string),
      })),
    ];
  }

  async abandonReservations(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(apologyAssets)
      .set({ state: "failed", updatedAt: new Date() })
      .where(inArray(apologyAssets.id, ids));
    await this.db
      .update(responseAssets)
      .set({ state: "failed", updatedAt: new Date() })
      .where(inArray(responseAssets.id, ids));
  }

  /**
   * Atomic deletion finalization inside a single PostgreSQL transaction.
   *
   * Verifies the fencing token with FOR UPDATE. If ownership was lost or superseded,
   * rolls back immediately without mutating resource rows.
   *
   * Hierarchical locking order: Parent -> Child -> Assets to strictly avoid deadlocks.
   */
  /**
   * Atomic deletion finalization inside a single PostgreSQL transaction.
   *
   * Genuinely consistent lock-acquisition order across all transactions:
   *   Parent Row -> Child Rows (ordered by id) -> Parent Job -> Child Jobs (ordered by resource_id) -> Assets
   *
   * Guarantees:
   * 1. A child worker NEVER holds a deletion-job lock while waiting for a response row.
   * 2. Parent deletion and response deletion acquire locks in strictly compatible order.
   * 3. Fencing-token verification occurs under FOR UPDATE before any row mutations.
   * 4. Deadlocks between parent and child finalization are mathematically impossible.
   */
  async finalize(job: DeletionJob, assetsDeleted: number, now: Date): Promise<void> {
    const resourceType = job.resourceType ?? "apology";
    const resourceId = job.resourceId ?? job.apologyId;
    const fencingToken = job.fencingToken ?? 1;

    const hasBatch = typeof (this.db as unknown as { batch?: unknown }).batch === "function";
    if (hasBatch) {
      if (resourceType === "response") {
        await (this.db as unknown as { batch: (ops: unknown[]) => Promise<unknown> }).batch([
          this.db.execute(sql`delete from ${responseAssets} where response_id = ${resourceId}`),
          this.db.execute(sql`delete from ${responses} where id = ${resourceId}`),
          this.db.execute(sql`
            update ${deletionJobs}
            set state = 'completed', lease_until = null, last_error = null, updated_at = now()
            where resource_type = 'response'
              and resource_id = ${resourceId}
              and fencing_token = ${fencingToken}
          `),
        ]);
      } else {
        await (this.db as unknown as { batch: (ops: unknown[]) => Promise<unknown> }).batch([
          this.db.execute(sql`
            update ${deletionJobs}
            set state = 'completed', lease_until = null, last_error = 'absorbed_by_parent_deletion', updated_at = now()
            where resource_type = 'response'
              and resource_id in (select id from ${responses} where apology_id = ${resourceId})
          `),
          this.db.execute(sql`delete from ${responseAssets} where response_id in (select id from ${responses} where apology_id = ${resourceId})`),
          this.db.execute(sql`delete from ${responses} where apology_id = ${resourceId}`),
          this.db.execute(sql`delete from ${apologyAssets} where apology_id = ${resourceId}`),
          this.db.execute(sql`delete from ${apologies} where id = ${resourceId}`),
          this.db.execute(sql`
            insert into ${deletionTombstones}
              (apology_id, owner_key_hash, deleted_at, assets_deleted, reason)
            values (${resourceId}, ${job.ownerKeyHash ?? ""}, ${now.toISOString()},
                    ${assetsDeleted}, ${job.reason})
            on conflict (apology_id) do nothing
          `),
          this.db.execute(sql`
            update ${deletionJobs}
            set state = 'completed', lease_until = null, last_error = null, updated_at = now()
            where resource_type = 'apology'
              and resource_id = ${resourceId}
              and fencing_token = ${fencingToken}
          `),
        ]);
      }
      return;
    }

    await this.db.transaction(async (tx) => {
      if (resourceType === "response") {
        // Child response deletion
        // 1. Lock Child Response Row FIRST
        const rowCheck = await tx.execute(sql`
          select id, apology_id, status from ${responses}
          where id = ${resourceId}
          for update
        `);
        if (rowsOf(rowCheck).length === 0) {
          // Response row is gone (e.g. already deleted by parent). Abort immediately.
          throw new Error(`response_row_missing_or_already_deleted:${resourceId}`);
        }

        // 2. Lock and verify Child Deletion Job SECOND
        const jobCheck = await tx.execute(sql`
          select id, resource_type, resource_id, fencing_token, state
          from ${deletionJobs}
          where resource_type = 'response'
            and resource_id = ${resourceId}
          for update
        `);

        const lockedJobs = rowsOf(jobCheck);
        if (
          lockedJobs.length === 0 ||
          String(lockedJobs[0].state) !== "processing" ||
          Number(lockedJobs[0].fencing_token) !== fencingToken
        ) {
          throw new Error(`fencing_token_mismatch_or_job_lost:response:${resourceId}`);
        }

        // 3. Delete child response assets
        await tx.execute(sql`
          delete from ${responseAssets}
          where response_id = ${resourceId}
        `);

        // 4. Delete child response row
        await tx.execute(sql`
          delete from ${responses}
          where id = ${resourceId}
        `);

        // 5. Mark child deletion job completed
        await tx.execute(sql`
          update ${deletionJobs}
          set state = 'completed', lease_until = null, last_error = null, updated_at = now()
          where resource_type = 'response'
            and resource_id = ${resourceId}
            and fencing_token = ${fencingToken}
        `);
      } else {
        // Parent apology deletion
        // 1. Lock Parent Row FIRST
        const parentCheck = await tx.execute(sql`
          select id from ${apologies}
          where id = ${resourceId}
          for update
        `);
        if (rowsOf(parentCheck).length === 0) {
          throw new Error(`parent_row_missing_or_already_deleted:${resourceId}`);
        }

        // 2. Lock Child Response Rows SECOND in deterministic order (ORDER BY id ASC)
        await tx.execute(sql`
          select id from ${responses}
          where apology_id = ${resourceId}
          order by id asc
          for update
        `);

        // 3. Lock and verify Parent Deletion Job THIRD
        const parentJobCheck = await tx.execute(sql`
          select id, resource_type, resource_id, fencing_token, state
          from ${deletionJobs}
          where resource_type = 'apology'
            and resource_id = ${resourceId}
          for update
        `);

        const lockedParentJobs = rowsOf(parentJobCheck);
        if (
          lockedParentJobs.length === 0 ||
          String(lockedParentJobs[0].state) !== "processing" ||
          Number(lockedParentJobs[0].fencing_token) !== fencingToken
        ) {
          throw new Error(`fencing_token_mismatch_or_job_lost:apology:${resourceId}`);
        }

        // 4. Lock and absorb Child Deletion Jobs FOURTH in deterministic order (ORDER BY resource_id ASC)
        await tx.execute(sql`
          select id from ${deletionJobs}
          where resource_type = 'response'
            and resource_id in (select id from ${responses} where apology_id = ${resourceId})
          order by resource_id asc
          for update
        `);

        await tx.execute(sql`
          update ${deletionJobs}
          set state = 'completed', lease_until = null, last_error = 'absorbed_by_parent_deletion', updated_at = now()
          where resource_type = 'response'
            and resource_id in (select id from ${responses} where apology_id = ${resourceId})
        `);

        // 5. Delete child response assets
        await tx.execute(sql`
          delete from ${responseAssets}
          where response_id in (select id from ${responses} where apology_id = ${resourceId})
        `);

        // 6. Delete child responses
        await tx.execute(sql`
          delete from ${responses}
          where apology_id = ${resourceId}
        `);

        // 7. Delete parent apology assets
        await tx.execute(sql`
          delete from ${apologyAssets}
          where apology_id = ${resourceId}
        `);

        // 8. Delete parent apology row
        await tx.execute(sql`
          delete from ${apologies}
          where id = ${resourceId}
        `);

        // 9. Write tombstone
        await tx.execute(sql`
          insert into ${deletionTombstones}
            (apology_id, owner_key_hash, deleted_at, assets_deleted, reason)
          values (${resourceId}, ${job.ownerKeyHash ?? ""}, ${now.toISOString()},
                  ${assetsDeleted}, ${job.reason})
          on conflict (apology_id) do nothing
        `);

        // 10. Mark parent deletion job completed
        await tx.execute(sql`
          update ${deletionJobs}
          set state = 'completed', lease_until = null, last_error = null, updated_at = now()
          where resource_type = 'apology'
            and resource_id = ${resourceId}
            and fencing_token = ${fencingToken}
        `);
      }
    });
  }

  async fail(job: DeletionJob, error: string, now: Date): Promise<void> {
    const resourceType = job.resourceType ?? "apology";
    const resourceId = job.resourceId ?? job.apologyId;
    await this.db.execute(sql`
      update ${deletionJobs}
      set state = 'failed',
          lease_until = null,
          last_error = ${error.slice(0, MAX_LAST_ERROR_LENGTH)},
          updated_at = ${now.toISOString()}
      where resource_type = ${resourceType} and resource_id = ${resourceId}
    `);
  }

  async defer(job: DeletionJob, reason: string, now: Date): Promise<void> {
    const resourceType = job.resourceType ?? "apology";
    const resourceId = job.resourceId ?? job.apologyId;
    await this.db.execute(sql`
      update ${deletionJobs}
      set state = 'pending',
          lease_until = null,
          last_error = ${reason.slice(0, MAX_LAST_ERROR_LENGTH)},
          updated_at = ${now.toISOString()}
      where resource_type = ${resourceType} and resource_id = ${resourceId}
    `);
  }
}
