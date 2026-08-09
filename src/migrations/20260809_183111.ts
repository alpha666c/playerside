import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cofounder_sessions_plan_kind" AS ENUM('casino-review', 'no-deposit-bonus', 'research', 'delegation', 'ops');
  CREATE TYPE "public"."enum_cofounder_sessions_plan_status" AS ENUM('todo', 'in-progress', 'blocked', 'done');
  CREATE TYPE "public"."enum_cofounder_sessions_thread_role" AS ENUM('user', 'assistant', 'system');
  CREATE TYPE "public"."enum_cofounder_sessions_delegation_queue_role" AS ENUM('qa', 'reviewer', 'researcher', 'content-writer', 'desk-researcher', 'score-analyst', 'editorial-writer', 'integrity-checker', 'monitor');
  CREATE TYPE "public"."enum_cofounder_sessions_delegation_queue_source" AS ENUM('cofounder');
  CREATE TYPE "public"."enum_cofounder_sessions_delegation_queue_status" AS ENUM('QUEUED', 'APPROVED', 'RUNNING', 'DONE', 'REJECTED');
  CREATE TYPE "public"."enum_cofounder_sessions_session_type" AS ENUM('review-run', 'research-brief', 'ops');
  CREATE TYPE "public"."enum_cofounder_sessions_status" AS ENUM('open', 'active', 'paused', 'done');
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'ticket_created';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'ticket_updated';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'ticket_status_change';
  CREATE TABLE "cofounder_sessions_plan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_cofounder_sessions_plan_kind" NOT NULL,
  	"target" varchar,
  	"case_id_id" integer,
  	"status" "enum_cofounder_sessions_plan_status" DEFAULT 'todo',
  	"delegation_ref" varchar,
  	"notes" varchar
  );
  
  CREATE TABLE "cofounder_sessions_thread" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_cofounder_sessions_thread_role" NOT NULL,
  	"content" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cofounder_sessions_delegation_queue" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"job_id" varchar NOT NULL,
  	"role" "enum_cofounder_sessions_delegation_queue_role" NOT NULL,
  	"brief" varchar NOT NULL,
  	"source" "enum_cofounder_sessions_delegation_queue_source" DEFAULT 'cofounder',
  	"status" "enum_cofounder_sessions_delegation_queue_status" DEFAULT 'QUEUED',
  	"case_id_id" integer,
  	"output_ref" varchar,
  	"created_at" timestamp(3) with time zone,
  	"approved_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "cofounder_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ticket_number" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"session_type" "enum_cofounder_sessions_session_type" DEFAULT 'review-run',
  	"status" "enum_cofounder_sessions_status" DEFAULT 'open',
  	"last_active_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"version" numeric DEFAULT 1,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cofounder_sessions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"research_queue_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cofounder_sessions_id" integer;
  ALTER TABLE "cofounder_sessions_plan" ADD CONSTRAINT "cofounder_sessions_plan_case_id_id_research_queue_id_fk" FOREIGN KEY ("case_id_id") REFERENCES "public"."research_queue"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_plan" ADD CONSTRAINT "cofounder_sessions_plan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cofounder_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_thread" ADD CONSTRAINT "cofounder_sessions_thread_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cofounder_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_delegation_queue" ADD CONSTRAINT "cofounder_sessions_delegation_queue_case_id_id_research_queue_id_fk" FOREIGN KEY ("case_id_id") REFERENCES "public"."research_queue"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_delegation_queue" ADD CONSTRAINT "cofounder_sessions_delegation_queue_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cofounder_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cofounder_sessions" ADD CONSTRAINT "cofounder_sessions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_rels" ADD CONSTRAINT "cofounder_sessions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cofounder_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cofounder_sessions_rels" ADD CONSTRAINT "cofounder_sessions_rels_research_queue_fk" FOREIGN KEY ("research_queue_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "cofounder_sessions_plan_order_idx" ON "cofounder_sessions_plan" USING btree ("_order");
  CREATE INDEX "cofounder_sessions_plan_parent_id_idx" ON "cofounder_sessions_plan" USING btree ("_parent_id");
  CREATE INDEX "cofounder_sessions_plan_case_id_idx" ON "cofounder_sessions_plan" USING btree ("case_id_id");
  CREATE INDEX "cofounder_sessions_thread_order_idx" ON "cofounder_sessions_thread" USING btree ("_order");
  CREATE INDEX "cofounder_sessions_thread_parent_id_idx" ON "cofounder_sessions_thread" USING btree ("_parent_id");
  CREATE INDEX "cofounder_sessions_delegation_queue_order_idx" ON "cofounder_sessions_delegation_queue" USING btree ("_order");
  CREATE INDEX "cofounder_sessions_delegation_queue_parent_id_idx" ON "cofounder_sessions_delegation_queue" USING btree ("_parent_id");
  CREATE INDEX "cofounder_sessions_delegation_queue_case_id_idx" ON "cofounder_sessions_delegation_queue" USING btree ("case_id_id");
  CREATE UNIQUE INDEX "cofounder_sessions_ticket_number_idx" ON "cofounder_sessions" USING btree ("ticket_number");
  CREATE INDEX "cofounder_sessions_created_by_idx" ON "cofounder_sessions" USING btree ("created_by_id");
  CREATE INDEX "cofounder_sessions_updated_at_idx" ON "cofounder_sessions" USING btree ("updated_at");
  CREATE INDEX "cofounder_sessions_created_at_idx" ON "cofounder_sessions" USING btree ("created_at");
  CREATE INDEX "cofounder_sessions_rels_order_idx" ON "cofounder_sessions_rels" USING btree ("order");
  CREATE INDEX "cofounder_sessions_rels_parent_idx" ON "cofounder_sessions_rels" USING btree ("parent_id");
  CREATE INDEX "cofounder_sessions_rels_path_idx" ON "cofounder_sessions_rels" USING btree ("path");
  CREATE INDEX "cofounder_sessions_rels_research_queue_id_idx" ON "cofounder_sessions_rels" USING btree ("research_queue_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cofounder_sessions_fk" FOREIGN KEY ("cofounder_sessions_id") REFERENCES "public"."cofounder_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cofounder_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("cofounder_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cofounder_sessions_plan" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cofounder_sessions_thread" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cofounder_sessions_delegation_queue" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cofounder_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cofounder_sessions_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cofounder_sessions_plan" CASCADE;
  DROP TABLE "cofounder_sessions_thread" CASCADE;
  DROP TABLE "cofounder_sessions_delegation_queue" CASCADE;
  DROP TABLE "cofounder_sessions" CASCADE;
  DROP TABLE "cofounder_sessions_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cofounder_sessions_fk";
  
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_agent_logs_event";
  CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck', 'case_created', 'status_transition', 'case_updated', 'llm_call');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE "public"."enum_agent_logs_event" USING "event"::"public"."enum_agent_logs_event";
  DROP INDEX "payload_locked_documents_rels_cofounder_sessions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cofounder_sessions_id";
  DROP TYPE "public"."enum_cofounder_sessions_plan_kind";
  DROP TYPE "public"."enum_cofounder_sessions_plan_status";
  DROP TYPE "public"."enum_cofounder_sessions_thread_role";
  DROP TYPE "public"."enum_cofounder_sessions_delegation_queue_role";
  DROP TYPE "public"."enum_cofounder_sessions_delegation_queue_source";
  DROP TYPE "public"."enum_cofounder_sessions_delegation_queue_status";
  DROP TYPE "public"."enum_cofounder_sessions_session_type";
  DROP TYPE "public"."enum_cofounder_sessions_status";`)
}
