import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase H1 — SystemSettings gains two optional API-key fields:
 * `elevenLabsApiKey` (Vex voice lines) and `geminiApiKey` (Google AI
 * Studio — Imagen/Veo asset generation). Both are nullable varchar, so
 * existing rows are untouched and the migration is safe on any host.
 * Column names are Payload's snake_case conversion of the config fields.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "system_settings" ADD COLUMN "eleven_labs_api_key" varchar;
  ALTER TABLE "system_settings" ADD COLUMN "gemini_api_key" varchar;
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "gemini_api_key";
  ALTER TABLE "system_settings" DROP COLUMN IF EXISTS "eleven_labs_api_key";
`)
}
