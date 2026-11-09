CREATE TABLE "apologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_key_hash" text NOT NULL,
	"recipient_name" text NOT NULL,
	"sender_name" text NOT NULL,
	"situation" text NOT NULL,
	"situation_custom" text,
	"language" text DEFAULT 'en' NOT NULL,
	"messages" jsonb NOT NULL,
	"personal_note" text DEFAULT '' NOT NULL,
	"theme_id" text NOT NULL,
	"sticker_pack_id" text NOT NULL,
	"customization" jsonb NOT NULL,
	"link_duration_days" smallint DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"private_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "apologies_status_check" CHECK ("apologies"."status" in ('draft','published','revoked','deleted')),
	CONSTRAINT "apologies_duration_check" CHECK ("apologies"."link_duration_days" between 1 and 7),
	CONSTRAINT "apologies_published_complete" CHECK ("apologies"."status" <> 'published' or ("apologies"."expires_at" is not null and "apologies"."published_at" is not null and "apologies"."private_token_hash" is not null))
);
--> statement-breakpoint
CREATE TABLE "apology_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apology_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"object_key" text NOT NULL,
	"kind" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apology_assets_state_check" CHECK ("apology_assets"."state" in ('pending','uploaded','failed')),
	CONSTRAINT "apology_assets_kind_check" CHECK ("apology_assets"."kind" in ('photo','audio')),
	CONSTRAINT "apology_assets_size_check" CHECK ("apology_assets"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apology_id" uuid NOT NULL,
	"owner_key_hash" text,
	"object_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deletion_jobs_state_check" CHECK ("deletion_jobs"."state" in ('pending','processing','failed','completed')),
	CONSTRAINT "deletion_jobs_reason_check" CHECK ("deletion_jobs"."reason" in ('expired','manual'))
);
--> statement-breakpoint
CREATE TABLE "deletion_tombstones" (
	"apology_id" uuid PRIMARY KEY NOT NULL,
	"owner_key_hash" text NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assets_deleted" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apology_assets" ADD CONSTRAINT "apology_assets_apology_id_apologies_id_fk" FOREIGN KEY ("apology_id") REFERENCES "public"."apologies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apologies_owner_updated_idx" ON "apologies" USING btree ("owner_key_hash","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "apologies_expiry_idx" ON "apologies" USING btree ("expires_at") WHERE "apologies"."status" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "apologies_token_idx" ON "apologies" USING btree ("private_token_hash");--> statement-breakpoint
CREATE INDEX "apology_assets_apology_state_idx" ON "apology_assets" USING btree ("apology_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "apology_assets_object_key_idx" ON "apology_assets" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "deletion_jobs_apology_idx" ON "deletion_jobs" USING btree ("apology_id");--> statement-breakpoint
CREATE INDEX "deletion_jobs_state_updated_idx" ON "deletion_jobs" USING btree ("state","updated_at");