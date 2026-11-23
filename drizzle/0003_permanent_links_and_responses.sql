-- 1. Temporary compatibility trigger: forces expires_at to NULL on insert/update during deployment
CREATE OR REPLACE FUNCTION suppress_published_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    NEW.expires_at := NULL;
    NEW.link_duration_days := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_suppress_published_expiry ON apologies;
--> statement-breakpoint
CREATE TRIGGER trg_suppress_published_expiry
BEFORE INSERT OR UPDATE ON apologies
FOR EACH ROW
EXECUTE FUNCTION suppress_published_expiry();
--> statement-breakpoint

-- 2. Explicit migration of existing published records to permanent links
UPDATE apologies
SET expires_at = NULL,
    link_duration_days = NULL
WHERE status = 'published';
--> statement-breakpoint

-- 3. Cancel legacy expiry deletion jobs so they do not delete live records
UPDATE deletion_jobs
SET state = 'completed',
    last_error = 'legacy_expiry_cancelled'
WHERE reason = 'expired' AND state IN ('pending', 'failed', 'processing');
--> statement-breakpoint

-- 4. Alter apologies constraints: relax duration check, remove expires_at requirement from published check
ALTER TABLE "apologies" ALTER COLUMN "link_duration_days" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "apologies" DROP CONSTRAINT IF EXISTS "apologies_duration_check";
--> statement-breakpoint
ALTER TABLE "apologies" ADD CONSTRAINT "apologies_duration_check" CHECK ("apologies"."link_duration_days" IS NULL OR ("apologies"."link_duration_days" BETWEEN 1 AND 7));
--> statement-breakpoint
ALTER TABLE "apologies" DROP CONSTRAINT IF EXISTS "apologies_published_complete";
--> statement-breakpoint
ALTER TABLE "apologies" ADD CONSTRAINT "apologies_published_complete" CHECK ("apologies"."status" <> 'published' OR ("apologies"."published_at" IS NOT NULL AND "apologies"."private_token_hash" IS NOT NULL));
--> statement-breakpoint
DROP INDEX IF EXISTS "apologies_expiry_idx";
--> statement-breakpoint

-- 5. Upgrade deletion_jobs to support multi-resource cleanup and worker fencing
ALTER TABLE "deletion_jobs" RENAME COLUMN "apology_id" TO "resource_id";
--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD COLUMN IF NOT EXISTS "resource_type" text DEFAULT 'apology' NOT NULL;
--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD COLUMN IF NOT EXISTS "fencing_token" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "deletion_jobs_apology_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "deletion_jobs_resource_idx" ON "deletion_jobs" USING btree ("resource_type", "resource_id");
--> statement-breakpoint
ALTER TABLE "deletion_jobs" DROP CONSTRAINT IF EXISTS "deletion_jobs_reason_check";
--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_reason_check" CHECK ("deletion_jobs"."reason" IN ('expired', 'manual', 'abandoned_draft'));
--> statement-breakpoint
ALTER TABLE "deletion_jobs" DROP CONSTRAINT IF EXISTS "deletion_jobs_resource_type_check";
--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_resource_type_check" CHECK ("deletion_jobs"."resource_type" IN ('apology', 'response'));
--> statement-breakpoint

-- 6. Create responses table
CREATE TABLE IF NOT EXISTS "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apology_id" uuid NOT NULL,
	"response_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"public_token_hash" text,
	"manage_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "responses_type_check" CHECK ("responses"."response_type" in ('quick', 'experience')),
	CONSTRAINT "responses_status_check" CHECK ("responses"."status" in ('draft', 'published', 'revoked', 'deleted')),
	CONSTRAINT "responses_published_complete" CHECK ("responses"."status" <> 'published' or ("responses"."published_at" is not null and "responses"."public_token_hash" is not null and "responses"."manage_token_hash" is not null))
);
--> statement-breakpoint

-- 7. Create response_assets table
CREATE TABLE IF NOT EXISTS "response_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"object_key" text NOT NULL,
	"kind" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "response_assets_state_check" CHECK ("response_assets"."state" in ('pending', 'uploaded', 'failed')),
	CONSTRAINT "response_assets_kind_check" CHECK ("response_assets"."kind" in ('photo', 'audio')),
	CONSTRAINT "response_assets_size_check" CHECK ("response_assets"."size_bytes" > 0)
);
--> statement-breakpoint

ALTER TABLE "responses" ADD CONSTRAINT "responses_apology_id_apologies_id_fk" FOREIGN KEY ("apology_id") REFERENCES "public"."apologies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "response_assets" ADD CONSTRAINT "response_assets_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "responses_apology_idx" ON "responses" USING btree ("apology_id", "created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "responses_public_token_idx" ON "responses" USING btree ("public_token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "responses_manage_token_idx" ON "responses" USING btree ("manage_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "response_assets_response_state_idx" ON "response_assets" USING btree ("response_id", "state");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "response_assets_object_key_idx" ON "response_assets" USING btree ("object_key");
