import { inArray, sql } from "drizzle-orm";
import { getDb, type Database } from "../../db/client";
import {
  apologies,
  apologyAssets,
  deletionJobs,
  deletionTombstones,
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
  return {
    apologyId: String(row.apology_id),
    ownerKeyHash: row.owner_key_hash ? String(row.owner_key_hash) : undefined,
    objectKeys: keys,
    state: String(row.state) as DeletionJob["state"],
    reason: String(row.reason) as DeletionJob["reason"],
    attemptCount: Number(row.attempt_count ?? 0),
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
      select a.id as apology_id, 'expired' as source
      from ${apologies} a
      where a.status = 'published'
        and a.expires_at is not null
        and a.expires_at <= ${now.toISOString()}
        and not exists (
          select 1 from ${deletionJobs} j where j.apology_id = a.id
        )
      union all
      select j.apology_id as apology_id, 'job' as source
      from ${deletionJobs} j
      where j.state in ('pending','failed','processing')
      limit ${limit}
    `);

    return rowsOf(result).map((row) => ({
      apologyId: String(row.apology_id),
      source: String(row.source) === "expired" ? "expired" : "job",
    }));
  }

  /**
   * Same atomic intent as the manual path, restricted to the expiry predicate.
   * Job first, status second, one statement.
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
        insert into ${deletionJobs} (apology_id, owner_key_hash, object_keys, state, reason)
        select locked.id, locked.owner_key_hash, keys.k, 'pending', 'expired'
        from locked, keys
        on conflict (apology_id) do update
          set object_keys = (
                select to_jsonb(array(
                  select distinct value
                  from jsonb_array_elements_text(
                    ${deletionJobs}.object_keys || excluded.object_keys) as value))
              ),
              updated_at = now()
          where ${deletionJobs}.state <> 'completed'
        returning apology_id
      )
      update ${apologies} a
      set status = 'deleted', expires_at = null, updated_at = now()
      where a.id in (select apology_id from intent)
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
          updated_at = now()
      where apology_id = ${apologyId}
        and state <> 'completed'
        and (lease_until is null or lease_until < ${now.toISOString()})
      returning *
    `);

    const [row] = rowsOf(result);
    return row ? toJob(row) : null;
  }

  async objectKeys(apologyId: string): Promise<string[]> {
    const result = await this.db.execute(sql`
      select object_key from ${apologyAssets} where apology_id = ${apologyId}
    `);
    return rowsOf(result).map((row) => String(row.object_key));
  }

  async pendingReservations(apologyId: string): Promise<PendingReservation[]> {
    const result = await this.db.execute(sql`
      select id, object_key, created_at
      from ${apologyAssets}
      where apology_id = ${apologyId} and state = 'pending'
    `);

    return rowsOf(result).map((row) => ({
      id: String(row.id),
      objectKey: String(row.object_key),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async abandonReservations(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    // Parameterised through the query builder — no raw interpolation of ids.
    await this.db
      .update(apologyAssets)
      .set({ state: "failed", updatedAt: new Date() })
      .where(inArray(apologyAssets.id, ids));
  }

  /**
   * The only place rows are removed. Asset rows go first because the foreign
   * key is `RESTRICT`; the tombstone and job completion share the same batch so
   * a partial finalise is not possible.
   */
  async finalize(job: DeletionJob, assetsDeleted: number, now: Date): Promise<void> {
    await this.db.batch([
      this.db.execute(sql`delete from ${apologyAssets} where apology_id = ${job.apologyId}`),
      this.db.execute(sql`delete from ${apologies} where id = ${job.apologyId}`),
      this.db.execute(sql`
        insert into ${deletionTombstones}
          (apology_id, owner_key_hash, deleted_at, assets_deleted, reason)
        values (${job.apologyId}, ${job.ownerKeyHash ?? ""}, ${now.toISOString()},
                ${assetsDeleted}, ${job.reason})
        on conflict (apology_id) do nothing
      `),
      this.db.execute(sql`
        update ${deletionJobs}
        set state = 'completed', lease_until = null, last_error = null, updated_at = now()
        where apology_id = ${job.apologyId}
      `),
    ]);
  }

  async fail(job: DeletionJob, error: string, now: Date): Promise<void> {
    await this.db.execute(sql`
      update ${deletionJobs}
      set state = 'failed',
          lease_until = null,
          last_error = ${error.slice(0, MAX_LAST_ERROR_LENGTH)},
          updated_at = ${now.toISOString()}
      where apology_id = ${job.apologyId}
    `);
  }

  async defer(job: DeletionJob, reason: string, now: Date): Promise<void> {
    await this.db.execute(sql`
      update ${deletionJobs}
      set state = 'pending',
          lease_until = null,
          last_error = ${reason.slice(0, MAX_LAST_ERROR_LENGTH)},
          updated_at = ${now.toISOString()}
      where apology_id = ${job.apologyId}
    `);
  }
}
