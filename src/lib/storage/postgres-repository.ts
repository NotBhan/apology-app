import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { ApologyDraft, ApologyRecord, PublishedApology } from "@/types/apology";
import type { DraftPayload } from "@/lib/validation/apology";
import { createLinkToken, hashLinkToken } from "@/lib/id";
import { DEFAULT_LINK_DAYS, isLinkLive, normalizeDurationDays } from "@/lib/expiry";
import type { DeletionTombstone } from "@/lib/lifecycle/types";
import { getDb, type Database } from "@/db/client";
import {
  apologies,
  apologyAssets,
  deletionJobs,
  deletionTombstones,
} from "@/db/schema";
import type { ApologyAssetRow, ApologyRow } from "@/db/schema";
import type {
  ApologyRepository,
  AssetRecord,
  DraftOwner,
  ReserveAssetInput,
  ServingAsset,
} from "./types";
import { toCreatorDraft, toPublished } from "./types";

/**
 * Every mutation is a single statement (or a `db.batch`). No interactive
 * transactions exist on `neon-http`, and none is needed: the guarded statements
 * below are compare-and-set by construction.
 */

/**
 * Raw `db.execute()` rows come back with snake_case column names and with
 * timestamps as strings, unlike the query-builder rows which are mapped to
 * camelCase with real `Date` values. Every helper here accepts both shapes.
 */
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

export function rowToRecord(row: ApologyRow, accessToken = ""): ApologyRecord {
  return {
    id: row.id,
    accessToken,
    // Empty means "no legacy device binding"; rows created under Neon Auth
    // carry a user id instead.
    ownerKeyHash: row.ownerKeyHash ?? "",
    experienceType: row.experienceType ?? "apology",
    content: row.content ?? null,
    recipientName: row.recipientName,
    senderName: row.senderName,
    situation: row.situation as ApologyRecord["situation"],
    situationCustom: row.situationCustom ?? "",
    language: row.language as ApologyRecord["language"],
    messages: row.messages as ApologyRecord["messages"],
    themeId: row.themeId as ApologyRecord["themeId"],
    stickerPackId: row.stickerPackId as ApologyRecord["stickerPackId"],
    customization: row.customization as ApologyRecord["customization"],
    linkDurationDays: row.linkDurationDays,
    status: row.status as ApologyRecord["status"],
    createdAt: requiredIso(row.createdAt),
    updatedAt: requiredIso(row.updatedAt),
    publishedAt: iso(row.publishedAt),
    expiresAt: iso(row.expiresAt),
  };
}

function rowToAsset(row: ApologyAssetRow): AssetRecord {
  return {
    id: row.id,
    apologyId: row.apologyId,
    state: row.state as AssetRecord["state"],
    objectKey: row.objectKey,
    kind: row.kind as AssetRecord["kind"],
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: requiredIso(row.createdAt),
  };
}

export class PostgresRepository implements ApologyRepository {
  private readonly db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDb();
  }

  async createDraft(
    owner: DraftOwner,
    seed: { recipientName: string; senderName: string },
    options?: { experienceType?: string; content?: unknown },
  ): Promise<ApologyRecord> {
    const [row] = await this.db
      .insert(apologies)
      .values({
        // Ownership is written from the verified session only; there is no
        // request-supplied path to either column.
        userId: owner.userId,
        ownerKeyHash: owner.scopeKey,
        // Defaulted at the column level too, so an omission is still 'apology'.
        experienceType: options?.experienceType ?? "apology",
        content: options?.content ?? null,
        recipientName: seed.recipientName,
        senderName: seed.senderName,
        situation: "other",
        situationCustom: "",
        language: "en",
        messages: { message1: "", message2: "", message3: "", personalNote: "" },
        personalNote: "",
        themeId: "romantic",
        stickerPackId: "cats",
        customization: {
          audio: { source: "default", volume: 0.55 },
          photos: [],
          memoryStyle: "polaroid",
        },
        linkDurationDays: DEFAULT_LINK_DAYS,
        status: "draft",
      })
      .returning();

    return rowToRecord(row);
  }

  async getDraft(id: string): Promise<ApologyRecord | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const [row] = await this.db.select().from(apologies).where(eq(apologies.id, id)).limit(1);
    return row ? rowToRecord(row) : undefined;
  }

  async saveDraft(
    id: string,
    ownerKeyHash: string,
    payload: DraftPayload,
  ): Promise<ApologyRecord> {
    const [row] = await this.db
      .update(apologies)
      .set({
        recipientName: payload.recipientName,
        senderName: payload.senderName,
        situation: payload.situation,
        situationCustom: payload.situationCustom ?? "",
        language: payload.language,
        messages: payload.messages,
        personalNote: payload.messages.personalNote,
        themeId: payload.themeId,
        stickerPackId: payload.stickerPackId,
        customization: payload.customization,
        linkDurationDays: normalizeDurationDays(payload.linkDurationDays),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(apologies.id, id),
          eq(apologies.ownerKeyHash, ownerKeyHash),
          sql`${apologies.status} <> 'deleted'`,
          sql`not exists (select 1 from ${deletionJobs} j where j.apology_id = ${apologies.id})`,
        ),
      )
      .returning();

    if (row) return rowToRecord(row);
    throw await this.explainWriteFailure(id, ownerKeyHash);
  }

  /**
   * Publish or renew. Always mints a new token: only the hash is stored, so the
   * previous link cannot be reproduced and therefore cannot survive renewal.
   * The guard and the update are the same statement, so a concurrent deletion
   * cannot interleave.
   */
  async publish(
    id: string,
    ownerKeyHash: string,
    durationDays: number,
  ): Promise<ApologyRecord> {
    const days = normalizeDurationDays(durationDays);
    const token = createLinkToken();
    const tokenHash = hashLinkToken(token);

    const result = await this.db.execute(sql`
      with locked as (
        select a.id from ${apologies} a
        where a.id = ${id}
          and a.owner_key_hash = ${ownerKeyHash}
          and a.status in ('draft','published','revoked')
          and not exists (
            select 1 from ${deletionJobs} j where j.apology_id = a.id
          )
        for update
      )
      update ${apologies} a
      set status = 'published',
          private_token_hash = ${tokenHash},
          published_at = coalesce(a.published_at, now()),
          expires_at = now() + (${days} || ' days')::interval,
          link_duration_days = ${days},
          updated_at = now()
      where a.id in (select id from locked)
      returning a.id,
                a.owner_key_hash as "ownerKeyHash",
                a.recipient_name as "recipientName",
                a.sender_name as "senderName",
                a.situation,
                a.situation_custom as "situationCustom",
                a.language,
                a.messages,
                a.personal_note as "personalNote",
                a.theme_id as "themeId",
                a.sticker_pack_id as "stickerPackId",
                a.customization,
                a.link_duration_days as "linkDurationDays",
                a.status,
                a.created_at as "createdAt",
                a.updated_at as "updatedAt",
                a.published_at as "publishedAt",
                a.expires_at as "expiresAt"
    `);

    const [raw] = rowsOf(result);
    if (!raw) throw await this.explainWriteFailure(id, ownerKeyHash);
    return rowToRecord(raw as unknown as ApologyRow, token);
  }

  async revoke(id: string, ownerKeyHash: string): Promise<ApologyRecord> {
    const [row] = await this.db
      .update(apologies)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(apologies.id, id),
          eq(apologies.ownerKeyHash, ownerKeyHash),
          eq(apologies.status, "published"),
        ),
      )
      .returning();

    if (row) return rowToRecord(row);
    throw await this.explainWriteFailure(id, ownerKeyHash);
  }

  /**
   * Manual deletion intent. One statement: the job and its key snapshot are
   * written before the status changes, and the status change only happens for
   * ids the upsert returned.
   */
  async remove(id: string, ownerKeyHash: string): Promise<void> {
    await this.requestDeletion(id, ownerKeyHash);
  }

  async requestDeletionByOwner(id: string, ownerKeyHash: string): Promise<boolean> {
    return this.requestDeletion(id, ownerKeyHash);
  }

  private async requestDeletion(id: string, ownerKeyHash: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      with locked as (
        select a.id, a.owner_key_hash from ${apologies} a
        where a.id = ${id} and a.owner_key_hash = ${ownerKeyHash}
        for update
      ),
      keys as (
        select coalesce(jsonb_agg(x.object_key), '[]'::jsonb) as k
        from ${apologyAssets} x
        where x.apology_id = (select id from locked)
      ),
      intent as (
        insert into ${deletionJobs} (apology_id, owner_key_hash, object_keys, state, reason)
        select locked.id, locked.owner_key_hash, keys.k, 'pending', 'manual'
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

  async isDeletionPending(apologyId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: deletionJobs.id })
      .from(deletionJobs)
      .where(eq(deletionJobs.apologyId, apologyId))
      .limit(1);
    return Boolean(row);
  }

  /**
   * Creator listing.
   *
   * Rows written before Neon Auth are matched by the legacy hash the caller
   * still holds. That branch is added only when the hash is present, so a
   * missing cookie cannot widen the query, and a claimed row (which carries a
   * `user_id`) stops matching it.
   */
  async listByOwner(ownerKeyHash: string, legacyKeyHash?: string): Promise<ApologyDraft[]> {
    const scope = legacyKeyHash
      ? or(
          eq(apologies.ownerKeyHash, ownerKeyHash),
          and(isNull(apologies.userId), eq(apologies.ownerKeyHash, legacyKeyHash)),
        )
      : eq(apologies.ownerKeyHash, ownerKeyHash);

    const rows = await this.db
      .select()
      .from(apologies)
      .where(scope)
      .orderBy(desc(apologies.updatedAt))
      .limit(100);

    return rows.map((row) => toCreatorDraft(rowToRecord(row)));
  }

  async claimLegacyRecords(input: {
    userId: string;
    scopeKey: string;
    legacyKeyHash: string;
  }): Promise<number> {
    const claimed = await this.db
      .update(apologies)
      .set({ userId: input.userId, ownerKeyHash: input.scopeKey })
      .where(
        and(isNull(apologies.userId), eq(apologies.ownerKeyHash, input.legacyKeyHash)),
      )
      .returning({ id: apologies.id });

    return claimed.length;
  }

  async saveExperienceContent(
    id: string,
    ownerKeyHash: string,
    content: unknown,
    names: { recipientName: string; senderName: string },
  ): Promise<ApologyRecord | null> {
    const [row] = await this.db
      .update(apologies)
      .set({
        content,
        recipientName: names.recipientName,
        senderName: names.senderName,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(apologies.id, id),
          eq(apologies.ownerKeyHash, ownerKeyHash),
          sql`${apologies.status} <> 'deleted'`,
        ),
      )
      .returning();

    return row ? rowToRecord(row) : null;
  }

  async getByToken(token: string): Promise<ApologyRecord | undefined> {
    if (!/^[A-Za-z0-9_-]{10,96}$/.test(token)) return undefined;
    const [row] = await this.db
      .select()
      .from(apologies)
      .where(eq(apologies.privateTokenHash, hashLinkToken(token)))
      .limit(1);
    return row ? rowToRecord(row) : undefined;
  }

  async getPublishedByToken(token: string): Promise<PublishedApology | undefined> {
    const record = await this.getByToken(token);
    if (!record) return undefined;
    // Expired, revoked, deleted and never-published are indistinguishable.
    if (!isLinkLive(record.status, record.expiresAt)) return undefined;
    return toPublished(record);
  }

  /* ---- assets ------------------------------------------------------- */

  async reserveAsset(input: ReserveAssetInput): Promise<AssetRecord | null> {
    const result = await this.db.execute(sql`
      with locked as (
        select a.id from ${apologies} a
        where a.id = ${input.apologyId}
          and a.owner_key_hash = ${input.ownerKeyHash}
          and a.status in ('draft','published')
          and not exists (
            select 1 from ${deletionJobs} j where j.apology_id = a.id
          )
          and (
            select count(*) from ${apologyAssets} x
            where x.apology_id = a.id and x.state <> 'failed'
          ) < ${input.maxAssets}
        for update
      )
      insert into ${apologyAssets}
        (apology_id, object_key, kind, content_type, size_bytes, state)
      select locked.id, ${input.objectKey}, ${input.kind},
             ${input.contentType}, ${input.sizeBytes}, 'pending'
      from locked
      returning id,
                apology_id as "apologyId",
                state,
                object_key as "objectKey",
                kind,
                content_type as "contentType",
                size_bytes as "sizeBytes",
                created_at as "createdAt"
    `);

    const [raw] = rowsOf(result);
    return raw ? rowToAsset(raw as unknown as ApologyAssetRow) : null;
  }

  async completeAsset(
    assetId: string,
    apologyId: string,
    ownerKeyHash: string,
  ): Promise<AssetRecord | null> {
    const result = await this.db.execute(sql`
      update ${apologyAssets} x
      set state = 'uploaded', updated_at = now()
      where x.id = ${assetId}
        and x.apology_id = ${apologyId}
        and x.state = 'pending'
        and exists (
          select 1 from ${apologies} a
          where a.id = x.apology_id
            and a.owner_key_hash = ${ownerKeyHash}
            and a.status in ('draft','published')
            and not exists (
              select 1 from ${deletionJobs} j where j.apology_id = a.id
            )
        )
      returning x.id,
                x.apology_id as "apologyId",
                x.state,
                x.object_key as "objectKey",
                x.kind,
                x.content_type as "contentType",
                x.size_bytes as "sizeBytes",
                x.created_at as "createdAt"
    `);

    const [raw] = rowsOf(result);
    return raw ? rowToAsset(raw as unknown as ApologyAssetRow) : null;
  }

  async failAsset(assetId: string): Promise<void> {
    await this.db
      .update(apologyAssets)
      .set({ state: "failed", updatedAt: new Date() })
      .where(and(eq(apologyAssets.id, assetId), eq(apologyAssets.state, "pending")));
  }

  async listAssets(apologyId: string): Promise<AssetRecord[]> {
    const rows = await this.db
      .select()
      .from(apologyAssets)
      .where(and(eq(apologyAssets.apologyId, apologyId), eq(apologyAssets.state, "uploaded")));
    return rows.map(rowToAsset);
  }

  async getAssetForServing(assetId: string): Promise<ServingAsset | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) return undefined;
    const [row] = await this.db
      .select({
        asset: apologyAssets,
        ownerKeyHash: apologies.ownerKeyHash,
        status: apologies.status,
        expiresAt: apologies.expiresAt,
      })
      .from(apologyAssets)
      .innerJoin(apologies, eq(apologies.id, apologyAssets.apologyId))
      .where(and(eq(apologyAssets.id, assetId), eq(apologyAssets.state, "uploaded")))
      .limit(1);

    if (!row) return undefined;
    return {
      ...rowToAsset(row.asset),
      ownerKeyHash: row.ownerKeyHash ?? "",
      apologyStatus: row.status,
      expiresAt: iso(row.expiresAt) ?? null,
    };
  }

  async tombstonesForOwner(ownerKeyHash: string): Promise<DeletionTombstone[]> {
    const rows = await this.db
      .select()
      .from(deletionTombstones)
      .where(eq(deletionTombstones.ownerKeyHash, ownerKeyHash))
      .orderBy(desc(deletionTombstones.deletedAt))
      .limit(100);

    return rows.map((row) => ({
      apologyId: row.apologyId,
      ownerKeyHash: row.ownerKeyHash,
      deletedAt: row.deletedAt.toISOString(),
      assetsDeleted: row.assetsDeleted,
      reason: row.reason as DeletionTombstone["reason"],
    }));
  }

  /* ------------------------------------------------------------------ */

  /**
   * Turns a zero-row write into the specific reason. Runs only on the failure
   * path, so the happy path stays one statement.
   */
  private async explainWriteFailure(id: string, ownerKeyHash: string): Promise<Error> {
    const existing = await this.getDraft(id);
    if (!existing) return new Error("NOT_FOUND");
    if (existing.ownerKeyHash !== ownerKeyHash) return new Error("FORBIDDEN");
    if (existing.status === "deleted") return new Error("DELETED");
    if (await this.isDeletionPending(id)) return new Error("DELETED");
    return new Error("NOT_EDITABLE");
  }
}
