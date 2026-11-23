import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/db/client";
import {
  apologies,
  deletionJobs,
  responses,
  responseAssets,
  type ResponseRow,
  type ResponseAssetRow,
} from "@/db/schema";
import { createResponseTokens, hashResponseToken } from "@/lib/id";
import { isResponseLive } from "@/lib/expiry";
import type {
  PublishedResponse,
  ResponseContent,
  ResponseDraft,
  ResponseRecord,
  ResponseType,
} from "@/types/response";
import type { PublishedApology } from "@/types/apology";
import { rowToRecord } from "./postgres-repository";
import { toPublished, type AssetRecord } from "./types";

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function requiredIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const maybe = result as { rows?: Record<string, unknown>[] };
  return maybe.rows ?? [];
}

export function rowToResponse(row: ResponseRow): ResponseRecord {
  return {
    id: row.id,
    apologyId: row.apologyId,
    responseType: row.responseType as ResponseType,
    status: row.status as ResponseRecord["status"],
    content: (row.content ?? {}) as ResponseContent,
    publicTokenHash: row.publicTokenHash,
    manageTokenHash: row.manageTokenHash,
    createdAt: requiredIso(row.createdAt),
    updatedAt: requiredIso(row.updatedAt),
    publishedAt: iso(row.publishedAt),
  };
}

export function toPublishedResponse(record: ResponseRecord, publicToken?: string, manageToken?: string): PublishedResponse {
  return {
    id: record.id,
    apologyId: record.apologyId,
    responseType: record.responseType,
    status: "published",
    content: record.content,
    publishedAt: record.publishedAt ?? record.updatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publicToken,
    manageToken,
  };
}

export function rowToResponseAsset(row: ResponseAssetRow): AssetRecord {
  return {
    id: row.id,
    apologyId: row.responseId,
    state: row.state as AssetRecord["state"],
    objectKey: row.objectKey,
    kind: row.kind as AssetRecord["kind"],
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: requiredIso(row.createdAt),
  };
}

export interface ServingResponseAsset extends AssetRecord {
  responseStatus: string;
  apologyStatus: string;
  publicTokenHash: string | null;
  manageTokenHash: string | null;
  parentOwnerKeyHash: string | null;
}

export class ResponseRepository {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  /**
   * Create an initial anonymous response draft bound to a parent experience.
   * Fails if parent is deleted, revoked, or non-existent.
   */
  async createDraft(
    apologyId: string,
    responseType: ResponseType,
    content: ResponseContent = { message: "" },
  ): Promise<ResponseDraft> {
    const parent = await this.db
      .select({ id: apologies.id, status: apologies.status })
      .from(apologies)
      .where(and(eq(apologies.id, apologyId), eq(apologies.status, "published")))
      .limit(1);

    if (parent.length === 0) {
      throw new Error("PARENT_NOT_ACCESSIBLE");
    }

    const [row] = await this.db
      .insert(responses)
      .values({
        apologyId,
        responseType,
        status: "draft",
        content,
      })
      .returning();

    const record = rowToResponse(row);
    return {
      id: record.id,
      apologyId: record.apologyId,
      responseType: record.responseType,
      status: "draft",
      content: record.content,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getDraft(id: string): Promise<ResponseDraft | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [row] = await this.db
      .select()
      .from(responses)
      .where(and(eq(responses.id, id), eq(responses.status, "draft")))
      .limit(1);

    if (!row) return null;
    const record = rowToResponse(row);
    return {
      id: record.id,
      apologyId: record.apologyId,
      responseType: record.responseType,
      status: "draft",
      content: record.content,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async saveDraft(id: string, content: ResponseContent): Promise<ResponseDraft> {
    const [row] = await this.db
      .update(responses)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(and(eq(responses.id, id), eq(responses.status, "draft")))
      .returning();

    if (!row) throw new Error("DRAFT_NOT_FOUND");
    const record = rowToResponse(row);
    return {
      id: record.id,
      apologyId: record.apologyId,
      responseType: record.responseType,
      status: "draft",
      content: record.content,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Publish a response.
   * Generates and stores dual capability tokens (publicToken, manageToken).
   * Verified against parent liveness before publication.
   */
  async publishResponse(
    id: string,
    content?: ResponseContent,
  ): Promise<{ response: PublishedResponse; publicToken: string; manageToken: string }> {
    const { publicToken, manageToken } = createResponseTokens();
    const publicTokenHash = hashResponseToken(publicToken);
    const manageTokenHash = hashResponseToken(manageToken);

    const result = await this.db.execute(sql`
      with locked as (
        select r.id, r.apology_id
        from ${responses} r
        inner join ${apologies} a on a.id = r.apology_id
        where r.id = ${id}
          and r.status in ('draft', 'published', 'revoked')
          and a.status = 'published'
          and not exists (
            select 1 from ${deletionJobs} j
            where j.resource_type = 'response' and j.resource_id = r.id
          )
          and not exists (
            select 1 from ${deletionJobs} j
            where j.resource_type = 'apology' and j.resource_id = a.id
          )
        for update
      )
      update ${responses} r
      set status = 'published',
          public_token_hash = ${publicTokenHash},
          manage_token_hash = ${manageTokenHash},
          content = coalesce(${content ? JSON.stringify(content) : null}::jsonb, r.content),
          published_at = coalesce(r.published_at, now()),
          updated_at = now()
      where r.id in (select id from locked)
      returning r.id, r.apology_id as "apologyId", r.response_type as "responseType",
                r.status, r.content, r.public_token_hash as "publicTokenHash",
                r.manage_token_hash as "manageTokenHash", r.created_at as "createdAt",
                r.updated_at as "updatedAt", r.published_at as "publishedAt"
    `);

    const [raw] = rowsOf(result);
    if (!raw) throw new Error("PUBLISH_FAILED");

    const record = rowToResponse(raw as unknown as ResponseRow);
    return {
      response: toPublishedResponse(record, publicToken, manageToken),
      publicToken,
      manageToken,
    };
  }

  /**
   * Revoke public link via manageToken capability.
   * Immediate access cut-off, retaining content and media for author recovery.
   */
  async revokeResponse(manageToken: string): Promise<ResponseRecord> {
    const hash = hashResponseToken(manageToken);
    const [row] = await this.db
      .update(responses)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(and(eq(responses.manageTokenHash, hash), eq(responses.status, "published")))
      .returning();

    if (!row) throw new Error("REVOKE_NOT_ALLOWED");
    return rowToResponse(row);
  }

  /**
   * Restore a revoked response back to published via manageToken.
   */
  async restoreResponse(manageToken: string): Promise<ResponseRecord> {
    const hash = hashResponseToken(manageToken);
    const [row] = await this.db
      .update(responses)
      .set({ status: "published", updatedAt: new Date() })
      .where(and(eq(responses.manageTokenHash, hash), eq(responses.status, "revoked")))
      .returning();

    if (!row) throw new Error("RESTORE_NOT_ALLOWED");
    return rowToResponse(row);
  }

  /**
   * Request physical deletion via manageToken capability.
   * Creates durable deletion job and marks response status deleted in one transaction.
   */
  async deleteResponse(manageToken: string): Promise<boolean> {
    const hash = hashResponseToken(manageToken);

    const result = await this.db.execute(sql`
      with locked as (
        select r.id, r.manage_token_hash from ${responses} r
        where r.manage_token_hash = ${hash} and r.status <> 'deleted'
        for update
      ),
      keys as (
        select coalesce(jsonb_agg(x.object_key), '[]'::jsonb) as k
        from ${responseAssets} x
        where x.response_id = (select id from locked)
      ),
      intent as (
        insert into ${deletionJobs} (resource_type, resource_id, object_keys, state, reason, fencing_token)
        select 'response', locked.id, keys.k, 'pending', 'manual', 1
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
      update ${responses} r
      set status = 'deleted', updated_at = now()
      where r.id in (select resource_id from intent)
      returning r.id
    `);

    return rowsOf(result).length > 0;
  }

  /**
   * View a published response by its bearer publicToken.
   * Checks both response status and parent experience status.
   */
  async getByPublicToken(
    token: string,
  ): Promise<{ response: PublishedResponse; parent: PublishedApology } | null> {
    if (!/^[A-Za-z0-9_-]{10,96}$/.test(token)) return null;
    const tokenHash = hashResponseToken(token);

    const [row] = await this.db
      .select({
        response: responses,
        apology: apologies,
      })
      .from(responses)
      .innerJoin(apologies, eq(apologies.id, responses.apologyId))
      .where(
        and(
          eq(responses.publicTokenHash, tokenHash),
          eq(responses.status, "published"),
          sql`not exists (select 1 from ${deletionJobs} j where j.resource_type = 'response' and j.resource_id = ${responses.id})`,
        ),
      )
      .limit(1);

    if (!row) return null;

    if (!isResponseLive(row.response.status, row.apology.status)) {
      return null;
    }

    const responseRecord = rowToResponse(row.response);
    const apologyRecord = rowToRecord(row.apology);

    return {
      response: toPublishedResponse(responseRecord, token),
      parent: toPublished(apologyRecord),
    };
  }

  /**
   * Look up response management record by manageToken capability.
   */
  async getByManageToken(manageToken: string): Promise<ResponseRecord | null> {
    if (!/^[A-Za-z0-9_-]{10,96}$/.test(manageToken)) return null;
    const hash = hashResponseToken(manageToken);

    const [row] = await this.db
      .select()
      .from(responses)
      .where(and(eq(responses.manageTokenHash, hash), sql`${responses.status} <> 'deleted'`))
      .limit(1);

    return row ? rowToResponse(row) : null;
  }

  /**
   * Reserve an asset row in pending state for a response before S3 upload.
   */
  async reserveResponseAsset(input: {
    responseId: string;
    manageToken?: string;
    objectKey: string;
    kind: "photo" | "audio";
    contentType: string;
    sizeBytes: number;
    maxAssets: number;
    maxTotalBytes?: number;
  }): Promise<AssetRecord | null> {
    const totalBytesLimit = input.maxTotalBytes ?? 16 * 1024 * 1024;

    return await this.db.transaction(async (tx) => {
      // 1. Explicitly serialize concurrent reservations for this response by locking the parent response row FOR UPDATE
      const lockResult = await tx.execute(sql`
        select id from ${responses}
        where id = ${input.responseId}
          and status in ('draft', 'published')
          and not exists (
            select 1 from ${deletionJobs} j
            where j.resource_type = 'response' and j.resource_id = ${input.responseId}
          )
        for update
      `);
      const [locked] = rowsOf(lockResult);
      if (!locked) return null;

      // 2. Query current usage under the exclusive lock (all pending and ready count, failed are excluded)
      const usageResult = await tx.execute(sql`
        select count(*)::int as asset_count,
               coalesce(sum(size_bytes), 0)::bigint as total_bytes
        from ${responseAssets}
        where response_id = ${input.responseId} and state <> 'failed'
      `);
      const [usage] = rowsOf(usageResult) as unknown as [{ asset_count: number; total_bytes: string | number }];
      const currentCount = Number(usage?.asset_count ?? 0);
      const currentBytes = Number(usage?.total_bytes ?? 0);

      // 3. Evaluate quota boundaries
      if (currentCount >= input.maxAssets) {
        return null;
      }
      if (currentBytes + input.sizeBytes > totalBytesLimit) {
        return null;
      }

      // 4. Insert pending reservation within the serialized transaction
      const insertResult = await tx.execute(sql`
        insert into ${responseAssets}
          (response_id, object_key, kind, content_type, size_bytes, state)
        values
          (${input.responseId}, ${input.objectKey}, ${input.kind},
           ${input.contentType}, ${input.sizeBytes}, 'pending')
        returning id,
                  response_id as "responseId",
                  state,
                  object_key as "objectKey",
                  kind,
                  content_type as "contentType",
                  size_bytes as "sizeBytes",
                  created_at as "createdAt"
      `);

      const [raw] = rowsOf(insertResult);
      return raw ? rowToResponseAsset(raw as unknown as ResponseAssetRow) : null;
    });
  }

  /**
   * Promote asset state from pending to uploaded upon successful S3 write.
   */
  async promoteResponseAsset(assetId: string, objectKey: string, sizeBytes: number): Promise<boolean> {
    const [row] = await this.db
      .update(responseAssets)
      .set({
        state: "uploaded",
        sizeBytes,
        updatedAt: new Date(),
      })
      .where(and(eq(responseAssets.id, assetId), eq(responseAssets.objectKey, objectKey), eq(responseAssets.state, "pending")))
      .returning({ id: responseAssets.id });

    return Boolean(row);
  }

  async failAsset(assetId: string): Promise<void> {
    await this.db
      .update(responseAssets)
      .set({ state: "failed", updatedAt: new Date() })
      .where(eq(responseAssets.id, assetId));
  }

  async getAssetForServing(assetId: string): Promise<ServingResponseAsset | null> {
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) return null;

    const [row] = await this.db
      .select({
        asset: responseAssets,
        response: responses,
        apology: apologies,
      })
      .from(responseAssets)
      .innerJoin(responses, eq(responses.id, responseAssets.responseId))
      .innerJoin(apologies, eq(apologies.id, responses.apologyId))
      .where(
        and(
          eq(responseAssets.id, assetId),
          sql`not exists (
            select 1 from ${deletionJobs} j
            where (j.resource_type = 'response' and j.resource_id = ${responses.id})
               or (j.resource_type = 'apology' and j.resource_id = ${apologies.id})
          )`,
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      ...rowToResponseAsset(row.asset),
      responseStatus: row.response.status,
      apologyStatus: row.apology.status,
      publicTokenHash: row.response.publicTokenHash,
      manageTokenHash: row.response.manageTokenHash,
      parentOwnerKeyHash: row.apology.ownerKeyHash,
    };
  }

  /**
   * List all published responses for a parent experience (for the creator's view).
   */
  async listResponsesForApology(apologyId: string, ownerKeyHash: string): Promise<PublishedResponse[]> {
    const parent = await this.db
      .select({ id: apologies.id })
      .from(apologies)
      .where(and(eq(apologies.id, apologyId), eq(apologies.ownerKeyHash, ownerKeyHash)))
      .limit(1);

    if (parent.length === 0) return [];

    const rows = await this.db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.apologyId, apologyId),
          eq(responses.status, "published"),
          sql`not exists (select 1 from ${deletionJobs} j where j.resource_type = 'response' and j.resource_id = ${responses.id})`,
        ),
      )
      .orderBy(desc(responses.publishedAt));

    return rows.map((row) => toPublishedResponse(rowToResponse(row)));
  }
}
