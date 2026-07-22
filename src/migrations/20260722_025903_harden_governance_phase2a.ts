import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_research_queue_evidence_register_source_type" AS ENUM('regulator-register', 'operator-primary', 'community-source', 'hands-on-test', 'other');
  CREATE TYPE "public"."enum_research_queue_ai_runs_messages_role" AS ENUM('user', 'assistant', 'system');
  CREATE TYPE "public"."enum_research_queue_ai_runs_agent_role" AS ENUM('desk-researcher', 'score-analyst', 'editorial-writer', 'integrity-checker', 'monitor', 'chat');
  CREATE TYPE "public"."enum_research_queue_ai_runs_status" AS ENUM('pending', 'complete', 'failed');
  ALTER TYPE "public"."enum_research_queue_evidence_register_verification_status" ADD VALUE 'corroborated' BEFORE 'unverified';
  CREATE TABLE "research_queue_ai_runs_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_research_queue_ai_runs_messages_role" NOT NULL,
  	"content" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "research_queue_ai_runs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"run_id" varchar NOT NULL,
  	"agent_role" "enum_research_queue_ai_runs_agent_role" NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"status" "enum_research_queue_ai_runs_status" DEFAULT 'pending' NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"input" jsonb,
  	"output" jsonb
  );
  
  ALTER TABLE "agent_logs" ADD COLUMN "corrects_event_id" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "claim_key" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "claim_summary" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "source_type" "enum_research_queue_evidence_register_source_type";
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "archive_ref" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "content_hash" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "captured_at" timestamp(3) with time zone;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "captured_by" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "is_current" boolean DEFAULT true;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "supersedes_evidence_id" varchar;
  ALTER TABLE "research_queue_evidence_register" ADD COLUMN "retraction_reason" varchar;
  ALTER TABLE "research_queue_ai_runs_messages" ADD CONSTRAINT "research_queue_ai_runs_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue_ai_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue_ai_runs" ADD CONSTRAINT "research_queue_ai_runs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "research_queue_ai_runs_messages_order_idx" ON "research_queue_ai_runs_messages" USING btree ("_order");
  CREATE INDEX "research_queue_ai_runs_messages_parent_id_idx" ON "research_queue_ai_runs_messages" USING btree ("_parent_id");
  CREATE INDEX "research_queue_ai_runs_order_idx" ON "research_queue_ai_runs" USING btree ("_order");
  CREATE INDEX "research_queue_ai_runs_parent_id_idx" ON "research_queue_ai_runs" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "research_queue_ai_runs_messages" CASCADE;
  DROP TABLE "research_queue_ai_runs" CASCADE;
  ALTER TABLE "research_queue_evidence_register" ALTER COLUMN "verification_status" SET DATA TYPE text;
  ALTER TABLE "research_queue_evidence_register" ALTER COLUMN "verification_status" SET DEFAULT 'unverified'::text;
  DROP TYPE "public"."enum_research_queue_evidence_register_verification_status";
  CREATE TYPE "public"."enum_research_queue_evidence_register_verification_status" AS ENUM('verified', 'unverified');
  ALTER TABLE "research_queue_evidence_register" ALTER COLUMN "verification_status" SET DEFAULT 'unverified'::"public"."enum_research_queue_evidence_register_verification_status";
  ALTER TABLE "research_queue_evidence_register" ALTER COLUMN "verification_status" SET DATA TYPE "public"."enum_research_queue_evidence_register_verification_status" USING "verification_status"::"public"."enum_research_queue_evidence_register_verification_status";
  ALTER TABLE "agent_logs" DROP COLUMN "corrects_event_id";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "claim_key";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "claim_summary";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "source_type";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "archive_ref";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "content_hash";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "captured_at";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "captured_by";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "is_current";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "supersedes_evidence_id";
  ALTER TABLE "research_queue_evidence_register" DROP COLUMN "retraction_reason";
  DROP TYPE "public"."enum_research_queue_evidence_register_source_type";
  DROP TYPE "public"."enum_research_queue_ai_runs_messages_role";
  DROP TYPE "public"."enum_research_queue_ai_runs_agent_role";
  DROP TYPE "public"."enum_research_queue_ai_runs_status";`)
}
