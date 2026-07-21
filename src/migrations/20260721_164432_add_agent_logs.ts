import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck');
  CREATE TYPE "public"."enum_agent_logs_retention_class" AS ENUM('compliance', 'operational');
  CREATE TABLE "agent_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event" "enum_agent_logs_event" NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"agent_id" varchar NOT NULL,
  	"brand" varchar NOT NULL,
  	"site_category" varchar,
  	"operator" varchar,
  	"page_id" varchar,
  	"rubric_category" varchar,
  	"score" numeric,
  	"evidence_ref" varchar,
  	"details" jsonb,
  	"retention_class" "enum_agent_logs_retention_class",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_logs_id" integer;
  CREATE INDEX "agent_logs_timestamp_idx" ON "agent_logs" USING btree ("timestamp");
  CREATE INDEX "agent_logs_brand_idx" ON "agent_logs" USING btree ("brand");
  CREATE INDEX "agent_logs_site_category_idx" ON "agent_logs" USING btree ("site_category");
  CREATE INDEX "agent_logs_operator_idx" ON "agent_logs" USING btree ("operator");
  CREATE INDEX "agent_logs_retention_class_idx" ON "agent_logs" USING btree ("retention_class");
  CREATE INDEX "agent_logs_updated_at_idx" ON "agent_logs" USING btree ("updated_at");
  CREATE INDEX "agent_logs_created_at_idx" ON "agent_logs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_logs_fk" FOREIGN KEY ("agent_logs_id") REFERENCES "public"."agent_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_agent_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_logs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "agent_logs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "agent_logs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_logs_fk";
  
  DROP INDEX "payload_locked_documents_rels_agent_logs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_logs_id";
  DROP TYPE "public"."enum_agent_logs_event";
  DROP TYPE "public"."enum_agent_logs_retention_class";`)
}
