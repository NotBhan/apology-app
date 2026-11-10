import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Schema.
 *
 * Conventions:
 * - every timestamp is `timestamptz` and written in UTC;
 * - statuses are `text` with an explicit CHECK, so an invalid value cannot be
 *   written even by a build that forgets to validate;
 * - `apology_assets.apology_id` is `RESTRICT`, not `CASCADE`: deleting an
 *   apology must fail loudly rather than silently orphan objects in Filebase;
 * - `deletion_jobs.apology_id` is deliberately **not** a foreign key, so the
 *   job survives the row it describes and can still retry.
 */

export const apologies = pgTable(
  "apologies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Neon Auth user id. Authoritative when set.
     *
     * `owner_key_hash` below is the pre-auth, device-scoped identity. It stays
     * as a separate nullable column rather than being repurposed: a verified
     * user id and an unverified cookie hash are not interchangeable, and rows
     * written before Neon Auth existed keep their original binding until a
     * signed-in holder of that cookie explicitly claims them.
     */
    userId: text("user_id"),
    ownerKeyHash: text("owner_key_hash"),

    /**
     * Experience module id. Existing rows take the apology module by default,
     * so the column is additive and needs no backfill.
     */
    experienceType: text("experience_type").notNull().default("apology"),
    /** Module-owned content document; null means "read the legacy columns". */
    content: jsonb("content"),

    recipientName: text("recipient_name").notNull(),
    senderName: text("sender_name").notNull(),
    situation: text("situation").notNull(),
    situationCustom: text("situation_custom"),
    language: text("language").notNull().default("en"),

    messages: jsonb("messages").notNull(),
    personalNote: text("personal_note").notNull().default(""),
    themeId: text("theme_id").notNull(),
    stickerPackId: text("sticker_pack_id").notNull(),
    customization: jsonb("customization").notNull(),

    linkDurationDays: smallint("link_duration_days").notNull().default(3),
    status: text("status").notNull().default("draft"),

    /** SHA-256 of the 32-byte link token. The token itself is never stored. */
    privateTokenHash: text("private_token_hash"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("apologies_owner_updated_idx").on(table.ownerKeyHash, table.updatedAt.desc()),
    index("apologies_user_updated_idx").on(table.userId, table.updatedAt.desc()),
    index("apologies_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'published'`),
    uniqueIndex("apologies_token_idx").on(table.privateTokenHash),
    check(
      "apologies_status_check",
      sql`${table.status} in ('draft','published','revoked','deleted')`,
    ),
    check(
      "apologies_duration_check",
      sql`${table.linkDurationDays} between 1 and 7`,
    ),
    /**
     * A published record must carry everything a recipient link needs. This is
     * what makes "missing expiry" structurally impossible for new rows, without
     * relying on application code.
     */
    check(
      "apologies_published_complete",
      sql`${table.status} <> 'published' or (${table.expiresAt} is not null and ${table.publishedAt} is not null and ${table.privateTokenHash} is not null)`,
    ),
  ],
);

export const apologyAssets = pgTable(
  "apology_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apologyId: uuid("apology_id")
      .notNull()
      .references(() => apologies.id, { onDelete: "restrict" }),
    /**
     * A `pending` row exists *before* the object does. That ordering is what
     * guarantees every object that can ever exist is inside a deletion
     * snapshot.
     */
    state: text("state").notNull().default("pending"),
    objectKey: text("object_key").notNull(),
    kind: text("kind").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("apology_assets_apology_state_idx").on(table.apologyId, table.state),
    uniqueIndex("apology_assets_object_key_idx").on(table.objectKey),
    check(
      "apology_assets_state_check",
      sql`${table.state} in ('pending','uploaded','failed')`,
    ),
    check("apology_assets_kind_check", sql`${table.kind} in ('photo','audio')`),
    check("apology_assets_size_check", sql`${table.sizeBytes} > 0`),
  ],
);

export const deletionJobs = pgTable(
  "deletion_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** No FK on purpose: the job must outlive the apology row. */
    apologyId: uuid("apology_id").notNull(),
    /** Hash only, so a tombstone can be written after the row is gone. */
    ownerKeyHash: text("owner_key_hash"),
    objectKeys: jsonb("object_keys").notNull().default(sql`'[]'::jsonb`),
    state: text("state").notNull().default("pending"),
    reason: text("reason").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("deletion_jobs_apology_idx").on(table.apologyId),
    index("deletion_jobs_state_updated_idx").on(table.state, table.updatedAt),
    check(
      "deletion_jobs_state_check",
      sql`${table.state} in ('pending','processing','failed','completed')`,
    ),
    check("deletion_jobs_reason_check", sql`${table.reason} in ('expired','manual')`),
  ],
);

export const deletionTombstones = pgTable("deletion_tombstones", {
  apologyId: uuid("apology_id").primaryKey(),
  ownerKeyHash: text("owner_key_hash").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  assetsDeleted: integer("assets_deleted").notNull().default(0),
  reason: text("reason").notNull(),
});

/**
 * Durable rate-limit counters. Replaces the in-memory limiter, which was
 * per-instance and therefore useless on serverless.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type ApologyRow = typeof apologies.$inferSelect;
export type ApologyAssetRow = typeof apologyAssets.$inferSelect;
export type DeletionJobRow = typeof deletionJobs.$inferSelect;
export type DeletionTombstoneRow = typeof deletionTombstones.$inferSelect;
