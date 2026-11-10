ALTER TABLE "apologies" ADD COLUMN "experience_type" text DEFAULT 'apology' NOT NULL;--> statement-breakpoint
ALTER TABLE "apologies" ADD COLUMN "content" jsonb;