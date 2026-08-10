import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Harden against dev-pushed prod DBs (same protection as 20260809_182227):
  // on prod the enum was never created — 20260809_183111 got baselined when
  // its CREATE TABLE hit duplicates and the whole transaction (incl. the
  // CREATE TYPEs) rolled back, so a bare DROP TYPE fails with 42704 and
  // ci-migrate exits 1, killing every deploy. IF EXISTS converges both ways.
  await db.execute(sql`
   ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DATA TYPE varchar;
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DEFAULT 'cofounder';
  DROP TYPE IF EXISTS "public"."enum_cofounder_sessions_delegation_queue_source";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cofounder_sessions_delegation_queue_source" AS ENUM('cofounder');
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DEFAULT 'cofounder'::"public"."enum_cofounder_sessions_delegation_queue_source";
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DATA TYPE "public"."enum_cofounder_sessions_delegation_queue_source" USING "source"::"public"."enum_cofounder_sessions_delegation_queue_source";`)
}
