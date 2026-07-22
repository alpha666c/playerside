import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_research_queue_evidence_register_verification_status" AS ENUM('verified', 'unverified');
  CREATE TYPE "public"."enum_research_queue_chat_history_role" AS ENUM('user', 'assistant');
  CREATE TYPE "public"."enum_research_queue_account_profile_account_status" AS ENUM('active', 'suspended', 'closed', 'not-created');
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'case_created';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'status_transition';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'case_updated';
  CREATE TABLE "research_queue_evidence_register" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"media_ref_id" integer,
  	"source_url" varchar,
  	"access_date" timestamp(3) with time zone,
  	"verification_status" "enum_research_queue_evidence_register_verification_status" DEFAULT 'unverified' NOT NULL,
  	"notes" varchar
  );
  
  CREATE TABLE "research_queue_chat_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_research_queue_chat_history_role" NOT NULL,
  	"message" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "research_queue" ADD COLUMN "account_profile_live_chat_account_label" varchar;
  ALTER TABLE "research_queue" ADD COLUMN "account_profile_email_test_address" varchar;
  ALTER TABLE "research_queue" ADD COLUMN "account_profile_account_status" "enum_research_queue_account_profile_account_status" DEFAULT 'not-created';
  ALTER TABLE "research_queue" ADD COLUMN "account_profile_notes" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD CONSTRAINT "research_queue_evidence_register_media_ref_id_media_id_fk" FOREIGN KEY ("media_ref_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue_evidence_register" ADD CONSTRAINT "research_queue_evidence_register_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue_chat_history" ADD CONSTRAINT "research_queue_chat_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "research_queue_evidence_register_order_idx" ON "research_queue_evidence_register" USING btree ("_order");
  CREATE INDEX "research_queue_evidence_register_parent_id_idx" ON "research_queue_evidence_register" USING btree ("_parent_id");
  CREATE INDEX "research_queue_evidence_register_media_ref_idx" ON "research_queue_evidence_register" USING btree ("media_ref_id");
  CREATE INDEX "research_queue_chat_history_order_idx" ON "research_queue_chat_history" USING btree ("_order");
  CREATE INDEX "research_queue_chat_history_parent_id_idx" ON "research_queue_chat_history" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "research_queue_evidence_register" CASCADE;
  DROP TABLE "research_queue_chat_history" CASCADE;
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_agent_logs_event";
  CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE "public"."enum_agent_logs_event" USING "event"::"public"."enum_agent_logs_event";
  ALTER TABLE "research_queue" DROP COLUMN "account_profile_live_chat_account_label";
  ALTER TABLE "research_queue" DROP COLUMN "account_profile_email_test_address";
  ALTER TABLE "research_queue" DROP COLUMN "account_profile_account_status";
  ALTER TABLE "research_queue" DROP COLUMN "account_profile_notes";
  DROP TYPE "public"."enum_research_queue_evidence_register_verification_status";
  DROP TYPE "public"."enum_research_queue_chat_history_role";
  DROP TYPE "public"."enum_research_queue_account_profile_account_status";`)
}
