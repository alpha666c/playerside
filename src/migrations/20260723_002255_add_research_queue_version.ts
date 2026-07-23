import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // NOT NULL is required, not just a nicety: enforceOptimisticVersion.ts's
  // `WHERE version = $2` check would never match a NULL version (SQL NULL
  // is never equal to anything), permanently blocking any concurrency-aware
  // write against such a row. Safe to add directly (not backfill-then-
  // constrain) — research_queue has 0 rows in every environment as of this
  // migration (docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md).
  await db.execute(sql`
   ALTER TABLE "research_queue" ADD COLUMN "version" numeric DEFAULT 1 NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "research_queue" DROP COLUMN "version";`)
}
