-- Hand-written. IDEMPOTENT: runs on every container start (src/db/migrate.ts).
-- Enums are created behind DO $$ guards; tables/indexes use IF NOT EXISTS.
DO $$ BEGIN
 CREATE TYPE "priority" AS ENUM ('high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "workstream_status" AS ENUM ('active', 'waiting', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "task_status" AS ENUM ('open', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "households" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "email" text NOT NULL UNIQUE CHECK ("email" = lower("email")),
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "timezone" text DEFAULT 'America/New_York' NOT NULL,
  "digest_enabled" boolean DEFAULT true NOT NULL,
  "last_digest_date" date,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_household_idx" ON "users" ("household_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_idx" ON "password_reset_tokens" ("user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workstreams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "status" "workstream_status" DEFAULT 'active' NOT NULL,
  "priority" "priority" DEFAULT 'medium' NOT NULL,
  "owner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "next_step" text,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workstreams_household_idx" ON "workstreams" ("household_id", "status");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "workstream_id" uuid NOT NULL REFERENCES "workstreams"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "notes" text,
  "due_date" date,
  "priority" "priority" DEFAULT 'medium' NOT NULL,
  "status" "task_status" DEFAULT 'open' NOT NULL,
  "assignee_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "done_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_workstream_idx" ON "tasks" ("workstream_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_household_open_due_idx" ON "tasks" ("household_id", "status", "due_date");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workstream_id" uuid NOT NULL REFERENCES "workstreams"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE SET NULL,
  "title" text,
  "url" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "links_workstream_idx" ON "links" ("workstream_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stage" text NOT NULL CHECK ("stage" IN ('7', '1', '0', 'overdue')),
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_reminders_task_user_stage_unique" UNIQUE ("task_id", "user_id", "stage")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_reminders_sent_at_idx" ON "task_reminders" ("sent_at");
