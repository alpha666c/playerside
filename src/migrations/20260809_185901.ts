import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_agent_logs_event" ADD VALUE 'tool_call';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Harden against dev-pushed prod DBs (same protection as 20260809_182227):
  // the enum may not exist there, so drop IF EXISTS. Rows holding 'tool_call'
  // (true on prod after the first real chat) must be remapped to an existing
  // enum value or the text→enum cast fails (reviewer S2) — same CASE-map
  // treatment the 182227 down migration got for 'openrouter'.
  await db.execute(sql`
   ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE IF EXISTS "public"."enum_agent_logs_event";
  CREATE TYPE "public"."enum_agent_logs_event" AS ENUM('research_fetch', 'draft_created', 'draft_edited', 'grade_assigned', 'qa_check', 'publish', 'unpublish', 'license_recheck', 'case_created', 'status_transition', 'case_updated', 'llm_call', 'ticket_created', 'ticket_updated', 'ticket_status_change');
  ALTER TABLE "agent_logs" ALTER COLUMN "event" SET DATA TYPE "public"."enum_agent_logs_event" USING CASE WHEN "event" = 'tool_call' THEN 'ticket_updated'::"public"."enum_agent_logs_event" ELSE "event"::"public"."enum_agent_logs_event" END;`)
}
