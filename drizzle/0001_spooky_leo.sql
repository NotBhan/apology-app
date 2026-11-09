ALTER TABLE "apologies" ALTER COLUMN "owner_key_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "apologies" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "apologies_user_updated_idx" ON "apologies" USING btree ("user_id","updated_at" DESC NULLS LAST);