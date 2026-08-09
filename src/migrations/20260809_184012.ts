import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DATA TYPE varchar;
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DEFAULT 'cofounder';
  DROP TYPE "public"."enum_cofounder_sessions_delegation_queue_source";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cofounder_sessions_delegation_queue_source" AS ENUM('cofounder');
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DEFAULT 'cofounder'::"public"."enum_cofounder_sessions_delegation_queue_source";
  ALTER TABLE "cofounder_sessions_delegation_queue" ALTER COLUMN "source" SET DATA TYPE "public"."enum_cofounder_sessions_delegation_queue_source" USING "source"::"public"."enum_cofounder_sessions_delegation_queue_source";`)
}
