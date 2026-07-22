import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_visibility" AS ENUM('public', 'internal');
  ALTER TABLE "media" ADD COLUMN "visibility" "enum_media_visibility" DEFAULT 'public' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "visibility";
  DROP TYPE "public"."enum_media_visibility";`)
}
