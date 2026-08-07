import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_quests_page_target" AS ENUM('casino-review', 'crypto-review', 'homepage');
  CREATE TYPE "public"."enum_quests_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__quests_v_version_page_target" AS ENUM('casino-review', 'crypto-review', 'homepage');
  CREATE TYPE "public"."enum__quests_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_user_quests_status" AS ENUM('offered', 'active', 'completed');
  CREATE TYPE "public"."enum_xp_events_reason" AS ENUM('mission_completed', 'badge_granted');
  CREATE TABLE "quests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mission_id" varchar,
  	"title" varchar,
  	"brief" varchar,
  	"reward_xp" numeric DEFAULT 60,
  	"page_target" "enum_quests_page_target" DEFAULT 'casino-review',
  	"enabled" boolean DEFAULT false,
  	"steps" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_quests_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_quests_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_mission_id" varchar,
  	"version_title" varchar,
  	"version_brief" varchar,
  	"version_reward_xp" numeric DEFAULT 60,
  	"version_page_target" "enum__quests_v_version_page_target" DEFAULT 'casino-review',
  	"version_enabled" boolean DEFAULT false,
  	"version_steps" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__quests_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "gamification_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"player_key" varchar NOT NULL,
  	"total_xp" numeric DEFAULT 0 NOT NULL,
  	"level" numeric DEFAULT 1 NOT NULL,
  	"rank_title" varchar DEFAULT 'Street Scout',
  	"completed_missions" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "user_quests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"player_key" varchar NOT NULL,
  	"quest_id" integer NOT NULL,
  	"status" "enum_user_quests_status" DEFAULT 'active' NOT NULL,
  	"step_index" numeric DEFAULT 0,
  	"last_evidence_id" varchar,
  	"completed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "xp_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"player_key" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"reason" "enum_xp_events_reason" DEFAULT 'mission_completed' NOT NULL,
  	"quest_id" integer,
  	"evidence_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "research_queue" ALTER COLUMN "version" DROP NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gamification_profiles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "user_quests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "xp_events_id" integer;
  ALTER TABLE "_quests_v" ADD CONSTRAINT "_quests_v_parent_id_quests_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "user_quests" ADD CONSTRAINT "user_quests_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "quests_mission_id_idx" ON "quests" USING btree ("mission_id");
  CREATE INDEX "quests_updated_at_idx" ON "quests" USING btree ("updated_at");
  CREATE INDEX "quests_created_at_idx" ON "quests" USING btree ("created_at");
  CREATE INDEX "quests__status_idx" ON "quests" USING btree ("_status");
  CREATE INDEX "_quests_v_parent_idx" ON "_quests_v" USING btree ("parent_id");
  CREATE INDEX "_quests_v_version_version_mission_id_idx" ON "_quests_v" USING btree ("version_mission_id");
  CREATE INDEX "_quests_v_version_version_updated_at_idx" ON "_quests_v" USING btree ("version_updated_at");
  CREATE INDEX "_quests_v_version_version_created_at_idx" ON "_quests_v" USING btree ("version_created_at");
  CREATE INDEX "_quests_v_version_version__status_idx" ON "_quests_v" USING btree ("version__status");
  CREATE INDEX "_quests_v_created_at_idx" ON "_quests_v" USING btree ("created_at");
  CREATE INDEX "_quests_v_updated_at_idx" ON "_quests_v" USING btree ("updated_at");
  CREATE INDEX "_quests_v_latest_idx" ON "_quests_v" USING btree ("latest");
  CREATE UNIQUE INDEX "gamification_profiles_player_key_idx" ON "gamification_profiles" USING btree ("player_key");
  CREATE INDEX "gamification_profiles_updated_at_idx" ON "gamification_profiles" USING btree ("updated_at");
  CREATE INDEX "gamification_profiles_created_at_idx" ON "gamification_profiles" USING btree ("created_at");
  CREATE INDEX "user_quests_quest_idx" ON "user_quests" USING btree ("quest_id");
  CREATE INDEX "user_quests_updated_at_idx" ON "user_quests" USING btree ("updated_at");
  CREATE INDEX "user_quests_created_at_idx" ON "user_quests" USING btree ("created_at");
  CREATE UNIQUE INDEX "playerKey_quest_idx" ON "user_quests" USING btree ("player_key","quest_id");
  CREATE INDEX "xp_events_quest_idx" ON "xp_events" USING btree ("quest_id");
  CREATE INDEX "xp_events_updated_at_idx" ON "xp_events" USING btree ("updated_at");
  CREATE INDEX "xp_events_created_at_idx" ON "xp_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "playerKey_evidenceId_idx" ON "xp_events" USING btree ("player_key","evidence_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gamification_profiles_fk" FOREIGN KEY ("gamification_profiles_id") REFERENCES "public"."gamification_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_quests_fk" FOREIGN KEY ("user_quests_id") REFERENCES "public"."user_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_xp_events_fk" FOREIGN KEY ("xp_events_id") REFERENCES "public"."xp_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_quests_id_idx" ON "payload_locked_documents_rels" USING btree ("quests_id");
  CREATE INDEX "payload_locked_documents_rels_gamification_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("gamification_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_user_quests_id_idx" ON "payload_locked_documents_rels" USING btree ("user_quests_id");
  CREATE INDEX "payload_locked_documents_rels_xp_events_id_idx" ON "payload_locked_documents_rels" USING btree ("xp_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quests_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gamification_profiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "user_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "xp_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quests" CASCADE;
  DROP TABLE "_quests_v" CASCADE;
  DROP TABLE "gamification_profiles" CASCADE;
  DROP TABLE "user_quests" CASCADE;
  DROP TABLE "xp_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_quests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gamification_profiles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_user_quests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_xp_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_quests_id_idx";
  DROP INDEX "payload_locked_documents_rels_gamification_profiles_id_idx";
  DROP INDEX "payload_locked_documents_rels_user_quests_id_idx";
  DROP INDEX "payload_locked_documents_rels_xp_events_id_idx";
  ALTER TABLE "research_queue" ALTER COLUMN "version" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gamification_profiles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "user_quests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "xp_events_id";
  DROP TYPE "public"."enum_quests_page_target";
  DROP TYPE "public"."enum_quests_status";
  DROP TYPE "public"."enum__quests_v_version_page_target";
  DROP TYPE "public"."enum__quests_v_version_status";
  DROP TYPE "public"."enum_user_quests_status";
  DROP TYPE "public"."enum_xp_events_reason";`)
}
