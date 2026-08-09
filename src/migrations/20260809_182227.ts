import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * BUG FIX (2026-08-09) — saving the admin System Settings failed with the
 * generic "Something went wrong".
 *
 * Root cause: `llmProvider` was a `select` field, so migration
 * 20260809_162628 created a Postgres enum `enum_system_settings_llm_provider`
 * containing ONLY 'deepseek'. A later config change added the 'openrouter'
 * option + default WITHOUT a migration, so every save rejected:
 *   invalid input value for enum "enum_system_settings_llm_provider": "openrouter"
 *
 * Fix: llmProvider became a `text` field in config (informational per QA S2-1;
 * routing is decided by baseUrl+model), so this migration converts the column
 * to varchar, drops the enum, and refreshes the stale DB defaults (llm_model /
 * llm_base_url) to match the current config.
 *
 * `DROP TYPE IF EXISTS` (reviewer S2): prod was bootstrapped via dev-mode
 * schema push with a broken payload_migrations chain — if a pushed schema
 * never created the enum, a bare DROP TYPE would fail the build.
 *
 * Data note: lossless — the failed saves meant no row ever persisted.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "system_settings" ALTER COLUMN "llm_provider" SET DATA TYPE varchar;
  ALTER TABLE "system_settings" ALTER COLUMN "llm_provider" SET DEFAULT 'openrouter';
  ALTER TABLE "system_settings" ALTER COLUMN "llm_model" SET DEFAULT 'deepseek/deepseek-v4-flash';
  ALTER TABLE "system_settings" ALTER COLUMN "llm_base_url" SET DEFAULT 'https://openrouter.ai/api/v1';
  DROP TYPE IF EXISTS "public"."enum_system_settings_llm_provider";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_system_settings_llm_provider" AS ENUM('deepseek');
  ALTER TABLE "system_settings" ALTER COLUMN "llm_provider" SET DEFAULT 'deepseek'::"public"."enum_system_settings_llm_provider";
  -- Reviewer S2: the column may already hold 'openrouter' (the very state this
  -- fix enables) — map it, or the cast fails with "invalid input value for enum".
  ALTER TABLE "system_settings" ALTER COLUMN "llm_provider" SET DATA TYPE "public"."enum_system_settings_llm_provider" USING CASE WHEN "llm_provider" = 'openrouter' THEN 'deepseek'::"public"."enum_system_settings_llm_provider" ELSE "llm_provider"::"public"."enum_system_settings_llm_provider" END;
  ALTER TABLE "system_settings" ALTER COLUMN "llm_model" SET DEFAULT 'deepseek-v4-flash';
  ALTER TABLE "system_settings" ALTER COLUMN "llm_base_url" SET DEFAULT 'https://api.deepseek.com';`)
}
