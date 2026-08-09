import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase G — SystemSettings global + the agent-logs `llm_call` event.
 *
 * NOTE (2026-08-09): `payload migrate:create` also emitted claims_vs_reality
 * ALTERs because the local dev DB is behind migration 20260808 (its .json
 * snapshot predates the claims columns). Those ALTERs were REMOVED here on
 * purpose: they belong to `20260808_add_claims_vs_reality.ts`, which runs
 * before this migration on any clean environment — duplicating them would
 * fail fresh deploys with "column already exists". See DECISION-LOG 2026-08-09.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_system_settings_llm_provider" AS ENUM('deepseek');
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'llm_call';
  CREATE TABLE "system_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"llm_provider" "enum_system_settings_llm_provider" DEFAULT 'deepseek',
  	"llm_model" varchar DEFAULT 'deepseek-v4-flash',
  	"llm_deep_seek_api_key" varchar,
  	"llm_base_url" varchar DEFAULT 'https://api.deepseek.com',
  	"llm_max_tokens" numeric DEFAULT 4000,
  	"llm_spend_cap_per_day" numeric DEFAULT 1000,
  	"exa_api_key" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "system_settings" CASCADE;
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_agent_logs_event";
  CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck', 'case_created', 'status_transition', 'case_updated');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE "public"."enum_agent_logs_event" USING "event"::"public"."enum_agent_logs_event";
  DROP TYPE "public"."enum_system_settings_llm_provider";
`)
}
