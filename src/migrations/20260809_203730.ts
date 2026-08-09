import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_research_queue_ai_runs_status" ADD VALUE 'complete-with-warning' BEFORE 'failed';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Reviewer S3 — the same hardening as migration 20260809_185901: an env
  // that has rows carrying 'complete-with-warning' must downgrade cleanly.
  // Remap those rows to 'complete' before the enum is recreated (a bare
  // `USING status::enum` cast would throw on the unknown label).
  await db.execute(sql`
   UPDATE "research_queue_ai_runs" SET "status" = 'complete' WHERE "status" = 'complete-with-warning';
  ALTER TABLE "research_queue_ai_runs" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "research_queue_ai_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_research_queue_ai_runs_status";
  CREATE TYPE "public"."enum_research_queue_ai_runs_status" AS ENUM('pending', 'complete', 'failed');
  ALTER TABLE "research_queue_ai_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_research_queue_ai_runs_status";
  ALTER TABLE "research_queue_ai_runs" ALTER COLUMN "status" SET DATA TYPE "public"."enum_research_queue_ai_runs_status" USING "status"::"public"."enum_research_queue_ai_runs_status";`)
}
