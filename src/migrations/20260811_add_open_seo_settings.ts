import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase I2 — SystemSettings gains the OpenSEO / DataForSEO integration fields:
 * `openSeoUrl`, `openSeoProjectId`, `dataForSeoApiKey` (all nullable varchar)
 * and `seoRowCapPerDay` (nullable integer, default 500). Existing rows are
 * untouched; safe on any host. Column names are Payload's snake_case
 * conversion of the config fields — same pattern as
 * 20260810_add_system_settings_keys.
 *
 * Also extends the `agent-logs` event enum with `seo_call` (the DataForSEO
 * billable-row counter, mirroring `llm_call`). ADD VALUE IF NOT EXISTS is
 * idempotent (the DROP TYPE hardening lesson) and safe inside the migration
 * transaction on PG 12+; the new value is only USED at runtime, after commit.
 * PG does not support removing an enum value, so `down` no-ops the enum.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "open_seo_url" varchar;
  ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "open_seo_project_id" varchar;
  ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "data_for_seo_api_key" varchar;
  ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "seo_row_cap_per_day" integer;
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE IF NOT EXISTS 'seo_call';
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "seo_row_cap_per_day";
  ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "data_for_seo_api_key";
  ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "open_seo_project_id";
  ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "open_seo_url";
  -- enum value cannot be dropped in Postgres; the enum keeps 'seo_call'
`)
}
