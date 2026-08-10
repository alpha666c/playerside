import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'delegation_approved';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'delegation_rejected';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'delegation_conflict';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'delegation_error';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'review_published';
  ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'publish_error';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   -- Harden (reviewer S3, same pattern as 20260809_203730): remap the G.6
   -- values back into the pre-G.6 enum before the type change, so a downgrade
   -- never casts a row carrying the new values onto an enum without them.
   UPDATE "agent_logs" SET "event" = 'publish' WHERE "event" IN ('review_published', 'publish_error');
  UPDATE "agent_logs" SET "event" = 'tool_call' WHERE "event" IN ('delegation_approved', 'delegation_rejected', 'delegation_conflict', 'delegation_error');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_agent_logs_event";
  CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck', 'case_created', 'status_transition', 'case_updated', 'llm_call', 'ticket_created', 'ticket_updated', 'ticket_status_change', 'tool_call');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE "public"."enum_agent_logs_event" USING "event"::"public"."enum_agent_logs_event";`)
}
