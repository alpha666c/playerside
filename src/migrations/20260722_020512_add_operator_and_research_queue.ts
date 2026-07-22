import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_research_queue_casino_type" AS ENUM('traditional', 'crypto');
  CREATE TYPE "public"."enum_research_queue_status" AS ENUM('queued', 'desk-research', 'hands-on-testing', 'editorial', 'integrity-check', 'published', 'monitoring');
  CREATE TYPE "public"."enum_research_queue_hands_on_results_support_quality_score" AS ENUM('0', '1', '2', '3');
  CREATE TYPE "public"."enum_research_queue_hands_on_results_email_quality_score" AS ENUM('0', '1', '2', '3');
  CREATE TYPE "public"."enum_research_queue_hands_on_results_email_policy_accuracy_flag" AS ENUM('match', 'conflict', 'not-checked');
  CREATE TABLE "operators" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"jurisdiction" varchar,
  	"incorporation_country" varchar,
  	"internal_notes" jsonb,
  	"regulatory_watch_flag" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "operators_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"research_queue_id" integer
  );
  
  CREATE TABLE "research_queue_monitor_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"flag_type" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"agent_ref" varchar
  );
  
  CREATE TABLE "research_queue" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"case_number" varchar NOT NULL,
  	"operator_name" varchar NOT NULL,
  	"operator_url" varchar,
  	"casino_type" "enum_research_queue_casino_type" NOT NULL,
  	"parent_company_id" integer,
  	"license_jurisdiction" varchar,
  	"license_number" varchar,
  	"status" "enum_research_queue_status" DEFAULT 'queued' NOT NULL,
  	"assigned_reviewer" varchar DEFAULT 'Viktor',
  	"desk_research_output" jsonb,
  	"hands_on_results_withdrawal_claimed_hours" numeric,
  	"hands_on_results_withdrawal_actual_hours" numeric,
  	"hands_on_results_withdrawal_evidence_ref_id" integer,
  	"hands_on_results_support_claimed_minutes" numeric,
  	"hands_on_results_support_actual_minutes" numeric,
  	"hands_on_results_support_evidence_ref_id" integer,
  	"hands_on_results_support_quality_score" "enum_research_queue_hands_on_results_support_quality_score",
  	"hands_on_results_support_empathy_flag" boolean DEFAULT false,
  	"hands_on_results_support_r_g_resources_flag" boolean DEFAULT false,
  	"hands_on_results_email_support_actual_hours" numeric,
  	"hands_on_results_email_quality_score" "enum_research_queue_hands_on_results_email_quality_score",
  	"hands_on_results_email_g_d_p_r_flag" boolean DEFAULT false,
  	"hands_on_results_email_policy_accuracy_flag" "enum_research_queue_hands_on_results_email_policy_accuracy_flag",
  	"hands_on_results_kyc_claimed_days" numeric,
  	"hands_on_results_kyc_actual_days" numeric,
  	"hands_on_results_kyc_evidence_ref_id" integer,
  	"hands_on_results_bonus_claimed_wager" numeric,
  	"hands_on_results_bonus_actual_wager" numeric,
  	"hands_on_results_bonus_evidence_ref_id" integer,
  	"computed_scores" jsonb,
  	"editorial_draft" jsonb,
  	"integrity_sign_off" boolean DEFAULT false,
  	"internal_notes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "research_queue_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"trad_casino_reviews_id" integer,
  	"crypto_casino_reviews_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "operators_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "research_queue_id" integer;
  ALTER TABLE "operators_rels" ADD CONSTRAINT "operators_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "operators_rels" ADD CONSTRAINT "operators_rels_research_queue_fk" FOREIGN KEY ("research_queue_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue_monitor_log" ADD CONSTRAINT "research_queue_monitor_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_parent_company_id_operators_id_fk" FOREIGN KEY ("parent_company_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_hands_on_results_withdrawal_evidence_ref_id_media_id_fk" FOREIGN KEY ("hands_on_results_withdrawal_evidence_ref_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_hands_on_results_support_evidence_ref_id_media_id_fk" FOREIGN KEY ("hands_on_results_support_evidence_ref_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_hands_on_results_kyc_evidence_ref_id_media_id_fk" FOREIGN KEY ("hands_on_results_kyc_evidence_ref_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_hands_on_results_bonus_evidence_ref_id_media_id_fk" FOREIGN KEY ("hands_on_results_bonus_evidence_ref_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "research_queue_rels" ADD CONSTRAINT "research_queue_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue_rels" ADD CONSTRAINT "research_queue_rels_traditional_casino_reviews_fk" FOREIGN KEY ("trad_casino_reviews_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "research_queue_rels" ADD CONSTRAINT "research_queue_rels_crypto_casino_reviews_fk" FOREIGN KEY ("crypto_casino_reviews_id") REFERENCES "public"."crypto_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "operators_slug_idx" ON "operators" USING btree ("slug");
  CREATE INDEX "operators_updated_at_idx" ON "operators" USING btree ("updated_at");
  CREATE INDEX "operators_created_at_idx" ON "operators" USING btree ("created_at");
  CREATE INDEX "operators_rels_order_idx" ON "operators_rels" USING btree ("order");
  CREATE INDEX "operators_rels_parent_idx" ON "operators_rels" USING btree ("parent_id");
  CREATE INDEX "operators_rels_path_idx" ON "operators_rels" USING btree ("path");
  CREATE INDEX "operators_rels_research_queue_id_idx" ON "operators_rels" USING btree ("research_queue_id");
  CREATE INDEX "research_queue_monitor_log_order_idx" ON "research_queue_monitor_log" USING btree ("_order");
  CREATE INDEX "research_queue_monitor_log_parent_id_idx" ON "research_queue_monitor_log" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "research_queue_case_number_idx" ON "research_queue" USING btree ("case_number");
  CREATE INDEX "research_queue_parent_company_idx" ON "research_queue" USING btree ("parent_company_id");
  CREATE INDEX "research_queue_hands_on_results_hands_on_results_withdra_idx" ON "research_queue" USING btree ("hands_on_results_withdrawal_evidence_ref_id");
  CREATE INDEX "research_queue_hands_on_results_hands_on_results_support_idx" ON "research_queue" USING btree ("hands_on_results_support_evidence_ref_id");
  CREATE INDEX "research_queue_hands_on_results_hands_on_results_kyc_evi_idx" ON "research_queue" USING btree ("hands_on_results_kyc_evidence_ref_id");
  CREATE INDEX "research_queue_hands_on_results_hands_on_results_bonus_e_idx" ON "research_queue" USING btree ("hands_on_results_bonus_evidence_ref_id");
  CREATE INDEX "research_queue_updated_at_idx" ON "research_queue" USING btree ("updated_at");
  CREATE INDEX "research_queue_created_at_idx" ON "research_queue" USING btree ("created_at");
  CREATE INDEX "research_queue_rels_order_idx" ON "research_queue_rels" USING btree ("order");
  CREATE INDEX "research_queue_rels_parent_idx" ON "research_queue_rels" USING btree ("parent_id");
  CREATE INDEX "research_queue_rels_path_idx" ON "research_queue_rels" USING btree ("path");
  CREATE INDEX "research_queue_rels_trad_casino_reviews_id_idx" ON "research_queue_rels" USING btree ("trad_casino_reviews_id");
  CREATE INDEX "research_queue_rels_crypto_casino_reviews_id_idx" ON "research_queue_rels" USING btree ("crypto_casino_reviews_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_operators_fk" FOREIGN KEY ("operators_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_research_queue_fk" FOREIGN KEY ("research_queue_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_operators_id_idx" ON "payload_locked_documents_rels" USING btree ("operators_id");
  CREATE INDEX "payload_locked_documents_rels_research_queue_id_idx" ON "payload_locked_documents_rels" USING btree ("research_queue_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "operators" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "operators_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "research_queue_monitor_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "research_queue" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "research_queue_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "operators" CASCADE;
  DROP TABLE "operators_rels" CASCADE;
  DROP TABLE "research_queue_monitor_log" CASCADE;
  DROP TABLE "research_queue" CASCADE;
  DROP TABLE "research_queue_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_operators_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_research_queue_fk";
  
  DROP INDEX "payload_locked_documents_rels_operators_id_idx";
  DROP INDEX "payload_locked_documents_rels_research_queue_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "operators_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "research_queue_id";
  DROP TYPE "public"."enum_research_queue_casino_type";
  DROP TYPE "public"."enum_research_queue_status";
  DROP TYPE "public"."enum_research_queue_hands_on_results_support_quality_score";
  DROP TYPE "public"."enum_research_queue_hands_on_results_email_quality_score";
  DROP TYPE "public"."enum_research_queue_hands_on_results_email_policy_accuracy_flag";`)
}
