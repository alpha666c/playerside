import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_trad_casino_reviews_markets" AS ENUM('nl', 'se', 'de', 'uk');
  CREATE TYPE "public"."trad_license_authority" AS ENUM('KSA', 'Spelinspektionen', 'GGL', 'UKGC');
  CREATE TYPE "public"."enum_trad_casino_reviews_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__trad_casino_reviews_v_version_markets" AS ENUM('nl', 'se', 'de', 'uk');
  CREATE TYPE "public"."enum__trad_casino_reviews_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_crypto_casino_reviews_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__crypto_casino_reviews_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_wagering_bonuses_wagering_applies_to" AS ENUM('bonus_only', 'bonus_plus_deposit');
  CREATE TYPE "public"."enum_wagering_bonuses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__wagering_bonuses_v_version_wagering_applies_to" AS ENUM('bonus_only', 'bonus_plus_deposit');
  CREATE TYPE "public"."enum__wagering_bonuses_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_no_wagering_bonuses_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__no_wagering_bonuses_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "trad_casino_reviews_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_trad_casino_reviews_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "trad_casino_reviews_verdict_whats_good" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "trad_casino_reviews_verdict_whats_bad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "trad_casino_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"compliance_license_number" varchar,
  	"compliance_license_authority" "trad_license_authority",
  	"scores_withdrawals_score" numeric,
  	"scores_withdrawals_evidence" varchar,
  	"scores_withdrawals_narrative" varchar,
  	"scores_promotions_score" numeric,
  	"scores_promotions_evidence" varchar,
  	"scores_promotions_narrative" varchar,
  	"scores_support_score" numeric,
  	"scores_support_evidence" varchar,
  	"scores_support_narrative" varchar,
  	"scores_licensing_score" numeric,
  	"scores_licensing_evidence" varchar,
  	"scores_licensing_narrative" varchar,
  	"scores_kyc_score" numeric,
  	"scores_kyc_evidence" varchar,
  	"scores_kyc_narrative" varchar,
  	"scores_game_variety_score" numeric,
  	"scores_game_variety_evidence" varchar,
  	"scores_game_variety_narrative" varchar,
  	"scores_live_casino_score" numeric,
  	"scores_live_casino_evidence" varchar,
  	"scores_live_casino_narrative" varchar,
  	"scores_deposits_score" numeric,
  	"scores_deposits_evidence" varchar,
  	"scores_deposits_narrative" varchar,
  	"scores_community_sentiment_score" numeric,
  	"scores_community_sentiment_evidence" varchar,
  	"scores_community_sentiment_narrative" varchar,
  	"summary" varchar,
  	"verdict_narrative" varchar,
  	"overall_score" numeric,
  	"is_illustrative_sample" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_trad_casino_reviews_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_trad_casino_reviews_v_version_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__trad_casino_reviews_v_version_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_trad_casino_reviews_v_version_verdict_whats_good" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_trad_casino_reviews_v_version_verdict_whats_bad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_trad_casino_reviews_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_compliance_license_number" varchar,
  	"version_compliance_license_authority" "trad_license_authority",
  	"version_scores_withdrawals_score" numeric,
  	"version_scores_withdrawals_evidence" varchar,
  	"version_scores_withdrawals_narrative" varchar,
  	"version_scores_promotions_score" numeric,
  	"version_scores_promotions_evidence" varchar,
  	"version_scores_promotions_narrative" varchar,
  	"version_scores_support_score" numeric,
  	"version_scores_support_evidence" varchar,
  	"version_scores_support_narrative" varchar,
  	"version_scores_licensing_score" numeric,
  	"version_scores_licensing_evidence" varchar,
  	"version_scores_licensing_narrative" varchar,
  	"version_scores_kyc_score" numeric,
  	"version_scores_kyc_evidence" varchar,
  	"version_scores_kyc_narrative" varchar,
  	"version_scores_game_variety_score" numeric,
  	"version_scores_game_variety_evidence" varchar,
  	"version_scores_game_variety_narrative" varchar,
  	"version_scores_live_casino_score" numeric,
  	"version_scores_live_casino_evidence" varchar,
  	"version_scores_live_casino_narrative" varchar,
  	"version_scores_deposits_score" numeric,
  	"version_scores_deposits_evidence" varchar,
  	"version_scores_deposits_narrative" varchar,
  	"version_scores_community_sentiment_score" numeric,
  	"version_scores_community_sentiment_evidence" varchar,
  	"version_scores_community_sentiment_narrative" varchar,
  	"version_summary" varchar,
  	"version_verdict_narrative" varchar,
  	"version_overall_score" numeric,
  	"version_is_illustrative_sample" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__trad_casino_reviews_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "crypto_casino_reviews_verdict_whats_good" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "crypto_casino_reviews_verdict_whats_bad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar
  );
  
  CREATE TABLE "crypto_casino_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"compliance_license_number" varchar,
  	"compliance_license_authority" varchar,
  	"compliance_not_licensed_in_regulated_markets" boolean DEFAULT false,
  	"compliance_provably_fair_info" varchar,
  	"scores_license_legitimacy_score" numeric,
  	"scores_license_legitimacy_evidence" varchar,
  	"scores_license_legitimacy_narrative" varchar,
  	"scores_promotions_score" numeric,
  	"scores_promotions_evidence" varchar,
  	"scores_promotions_narrative" varchar,
  	"scores_withdrawals_score" numeric,
  	"scores_withdrawals_evidence" varchar,
  	"scores_withdrawals_narrative" varchar,
  	"scores_provably_fair_score" numeric,
  	"scores_provably_fair_evidence" varchar,
  	"scores_provably_fair_narrative" varchar,
  	"scores_support_score" numeric,
  	"scores_support_evidence" varchar,
  	"scores_support_narrative" varchar,
  	"scores_deposits_score" numeric,
  	"scores_deposits_evidence" varchar,
  	"scores_deposits_narrative" varchar,
  	"scores_game_variety_score" numeric,
  	"scores_game_variety_evidence" varchar,
  	"scores_game_variety_narrative" varchar,
  	"scores_kyc_approach_score" numeric,
  	"scores_kyc_approach_evidence" varchar,
  	"scores_kyc_approach_narrative" varchar,
  	"scores_geo_compliance_score" numeric,
  	"scores_geo_compliance_evidence" varchar,
  	"scores_geo_compliance_narrative" varchar,
  	"scores_community_sentiment_score" numeric,
  	"scores_community_sentiment_evidence" varchar,
  	"scores_community_sentiment_narrative" varchar,
  	"summary" varchar,
  	"verdict_narrative" varchar,
  	"overall_score" numeric,
  	"is_illustrative_sample" boolean DEFAULT false,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_crypto_casino_reviews_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_crypto_casino_reviews_v_version_verdict_whats_good" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_crypto_casino_reviews_v_version_verdict_whats_bad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"point" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_crypto_casino_reviews_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_compliance_license_number" varchar,
  	"version_compliance_license_authority" varchar,
  	"version_compliance_not_licensed_in_regulated_markets" boolean DEFAULT false,
  	"version_compliance_provably_fair_info" varchar,
  	"version_scores_license_legitimacy_score" numeric,
  	"version_scores_license_legitimacy_evidence" varchar,
  	"version_scores_license_legitimacy_narrative" varchar,
  	"version_scores_promotions_score" numeric,
  	"version_scores_promotions_evidence" varchar,
  	"version_scores_promotions_narrative" varchar,
  	"version_scores_withdrawals_score" numeric,
  	"version_scores_withdrawals_evidence" varchar,
  	"version_scores_withdrawals_narrative" varchar,
  	"version_scores_provably_fair_score" numeric,
  	"version_scores_provably_fair_evidence" varchar,
  	"version_scores_provably_fair_narrative" varchar,
  	"version_scores_support_score" numeric,
  	"version_scores_support_evidence" varchar,
  	"version_scores_support_narrative" varchar,
  	"version_scores_deposits_score" numeric,
  	"version_scores_deposits_evidence" varchar,
  	"version_scores_deposits_narrative" varchar,
  	"version_scores_game_variety_score" numeric,
  	"version_scores_game_variety_evidence" varchar,
  	"version_scores_game_variety_narrative" varchar,
  	"version_scores_kyc_approach_score" numeric,
  	"version_scores_kyc_approach_evidence" varchar,
  	"version_scores_kyc_approach_narrative" varchar,
  	"version_scores_geo_compliance_score" numeric,
  	"version_scores_geo_compliance_evidence" varchar,
  	"version_scores_geo_compliance_narrative" varchar,
  	"version_scores_community_sentiment_score" numeric,
  	"version_scores_community_sentiment_evidence" varchar,
  	"version_scores_community_sentiment_narrative" varchar,
  	"version_summary" varchar,
  	"version_verdict_narrative" varchar,
  	"version_overall_score" numeric,
  	"version_is_illustrative_sample" boolean DEFAULT false,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__crypto_casino_reviews_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "wagering_bonuses_contributing_games" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"game_category" varchar,
  	"contribution_percent" numeric
  );
  
  CREATE TABLE "wagering_bonuses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"operator_id" integer,
  	"summary" varchar,
  	"eligibility" varchar,
  	"expiry" varchar,
  	"max_withdrawal" varchar,
  	"is_illustrative_sample" boolean DEFAULT false,
  	"wagering_multiplier" numeric,
  	"wagering_applies_to" "enum_wagering_bonuses_wagering_applies_to",
  	"wagering_time_limit" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_wagering_bonuses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_wagering_bonuses_v_version_contributing_games" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"game_category" varchar,
  	"contribution_percent" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_wagering_bonuses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_operator_id" integer,
  	"version_summary" varchar,
  	"version_eligibility" varchar,
  	"version_expiry" varchar,
  	"version_max_withdrawal" varchar,
  	"version_is_illustrative_sample" boolean DEFAULT false,
  	"version_wagering_multiplier" numeric,
  	"version_wagering_applies_to" "enum__wagering_bonuses_v_version_wagering_applies_to",
  	"version_wagering_time_limit" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__wagering_bonuses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "no_wagering_bonuses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"operator_id" integer,
  	"summary" varchar,
  	"eligibility" varchar,
  	"expiry" varchar,
  	"max_withdrawal" varchar,
  	"is_illustrative_sample" boolean DEFAULT false,
  	"bonus_amount" varchar,
  	"withdrawal_conditions" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_no_wagering_bonuses_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_no_wagering_bonuses_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_operator_id" integer,
  	"version_summary" varchar,
  	"version_eligibility" varchar,
  	"version_expiry" varchar,
  	"version_max_withdrawal" varchar,
  	"version_is_illustrative_sample" boolean DEFAULT false,
  	"version_bonus_amount" varchar,
  	"version_withdrawal_conditions" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__no_wagering_bonuses_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "trad_casino_reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "crypto_casino_reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wagering_bonuses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "no_wagering_bonuses_id" integer;
  ALTER TABLE "trad_casino_reviews_markets" ADD CONSTRAINT "trad_casino_reviews_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trad_casino_reviews_verdict_whats_good" ADD CONSTRAINT "trad_casino_reviews_verdict_whats_good_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "trad_casino_reviews_verdict_whats_bad" ADD CONSTRAINT "trad_casino_reviews_verdict_whats_bad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_trad_casino_reviews_v_version_markets" ADD CONSTRAINT "_trad_casino_reviews_v_version_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_trad_casino_reviews_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_trad_casino_reviews_v_version_verdict_whats_good" ADD CONSTRAINT "_trad_casino_reviews_v_version_verdict_whats_good_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_trad_casino_reviews_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_trad_casino_reviews_v_version_verdict_whats_bad" ADD CONSTRAINT "_trad_casino_reviews_v_version_verdict_whats_bad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_trad_casino_reviews_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_trad_casino_reviews_v" ADD CONSTRAINT "_trad_casino_reviews_v_parent_id_trad_casino_reviews_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crypto_casino_reviews_verdict_whats_good" ADD CONSTRAINT "crypto_casino_reviews_verdict_whats_good_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crypto_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "crypto_casino_reviews_verdict_whats_bad" ADD CONSTRAINT "crypto_casino_reviews_verdict_whats_bad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."crypto_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_crypto_casino_reviews_v_version_verdict_whats_good" ADD CONSTRAINT "_crypto_casino_reviews_v_version_verdict_whats_good_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_crypto_casino_reviews_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_crypto_casino_reviews_v_version_verdict_whats_bad" ADD CONSTRAINT "_crypto_casino_reviews_v_version_verdict_whats_bad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_crypto_casino_reviews_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_crypto_casino_reviews_v" ADD CONSTRAINT "_crypto_casino_reviews_v_parent_id_crypto_casino_reviews_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."crypto_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wagering_bonuses_contributing_games" ADD CONSTRAINT "wagering_bonuses_contributing_games_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wagering_bonuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "wagering_bonuses" ADD CONSTRAINT "wagering_bonuses_operator_id_trad_casino_reviews_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wagering_bonuses_v_version_contributing_games" ADD CONSTRAINT "_wagering_bonuses_v_version_contributing_games_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_wagering_bonuses_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_wagering_bonuses_v" ADD CONSTRAINT "_wagering_bonuses_v_parent_id_wagering_bonuses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wagering_bonuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_wagering_bonuses_v" ADD CONSTRAINT "_wagering_bonuses_v_version_operator_id_trad_casino_reviews_id_fk" FOREIGN KEY ("version_operator_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "no_wagering_bonuses" ADD CONSTRAINT "no_wagering_bonuses_operator_id_trad_casino_reviews_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_no_wagering_bonuses_v" ADD CONSTRAINT "_no_wagering_bonuses_v_parent_id_no_wagering_bonuses_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."no_wagering_bonuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_no_wagering_bonuses_v" ADD CONSTRAINT "_no_wagering_bonuses_v_version_operator_id_trad_casino_reviews_id_fk" FOREIGN KEY ("version_operator_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "trad_casino_reviews_markets_order_idx" ON "trad_casino_reviews_markets" USING btree ("order");
  CREATE INDEX "trad_casino_reviews_markets_parent_idx" ON "trad_casino_reviews_markets" USING btree ("parent_id");
  CREATE INDEX "trad_casino_reviews_verdict_whats_good_order_idx" ON "trad_casino_reviews_verdict_whats_good" USING btree ("_order");
  CREATE INDEX "trad_casino_reviews_verdict_whats_good_parent_id_idx" ON "trad_casino_reviews_verdict_whats_good" USING btree ("_parent_id");
  CREATE INDEX "trad_casino_reviews_verdict_whats_bad_order_idx" ON "trad_casino_reviews_verdict_whats_bad" USING btree ("_order");
  CREATE INDEX "trad_casino_reviews_verdict_whats_bad_parent_id_idx" ON "trad_casino_reviews_verdict_whats_bad" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "trad_casino_reviews_slug_idx" ON "trad_casino_reviews" USING btree ("slug");
  CREATE INDEX "trad_casino_reviews_updated_at_idx" ON "trad_casino_reviews" USING btree ("updated_at");
  CREATE INDEX "trad_casino_reviews_created_at_idx" ON "trad_casino_reviews" USING btree ("created_at");
  CREATE INDEX "trad_casino_reviews__status_idx" ON "trad_casino_reviews" USING btree ("_status");
  CREATE INDEX "_trad_casino_reviews_v_version_markets_order_idx" ON "_trad_casino_reviews_v_version_markets" USING btree ("order");
  CREATE INDEX "_trad_casino_reviews_v_version_markets_parent_idx" ON "_trad_casino_reviews_v_version_markets" USING btree ("parent_id");
  CREATE INDEX "_trad_casino_reviews_v_version_verdict_whats_good_order_idx" ON "_trad_casino_reviews_v_version_verdict_whats_good" USING btree ("_order");
  CREATE INDEX "_trad_casino_reviews_v_version_verdict_whats_good_parent_id_idx" ON "_trad_casino_reviews_v_version_verdict_whats_good" USING btree ("_parent_id");
  CREATE INDEX "_trad_casino_reviews_v_version_verdict_whats_bad_order_idx" ON "_trad_casino_reviews_v_version_verdict_whats_bad" USING btree ("_order");
  CREATE INDEX "_trad_casino_reviews_v_version_verdict_whats_bad_parent_id_idx" ON "_trad_casino_reviews_v_version_verdict_whats_bad" USING btree ("_parent_id");
  CREATE INDEX "_trad_casino_reviews_v_parent_idx" ON "_trad_casino_reviews_v" USING btree ("parent_id");
  CREATE INDEX "_trad_casino_reviews_v_version_version_slug_idx" ON "_trad_casino_reviews_v" USING btree ("version_slug");
  CREATE INDEX "_trad_casino_reviews_v_version_version_updated_at_idx" ON "_trad_casino_reviews_v" USING btree ("version_updated_at");
  CREATE INDEX "_trad_casino_reviews_v_version_version_created_at_idx" ON "_trad_casino_reviews_v" USING btree ("version_created_at");
  CREATE INDEX "_trad_casino_reviews_v_version_version__status_idx" ON "_trad_casino_reviews_v" USING btree ("version__status");
  CREATE INDEX "_trad_casino_reviews_v_created_at_idx" ON "_trad_casino_reviews_v" USING btree ("created_at");
  CREATE INDEX "_trad_casino_reviews_v_updated_at_idx" ON "_trad_casino_reviews_v" USING btree ("updated_at");
  CREATE INDEX "_trad_casino_reviews_v_latest_idx" ON "_trad_casino_reviews_v" USING btree ("latest");
  CREATE INDEX "crypto_casino_reviews_verdict_whats_good_order_idx" ON "crypto_casino_reviews_verdict_whats_good" USING btree ("_order");
  CREATE INDEX "crypto_casino_reviews_verdict_whats_good_parent_id_idx" ON "crypto_casino_reviews_verdict_whats_good" USING btree ("_parent_id");
  CREATE INDEX "crypto_casino_reviews_verdict_whats_bad_order_idx" ON "crypto_casino_reviews_verdict_whats_bad" USING btree ("_order");
  CREATE INDEX "crypto_casino_reviews_verdict_whats_bad_parent_id_idx" ON "crypto_casino_reviews_verdict_whats_bad" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "crypto_casino_reviews_slug_idx" ON "crypto_casino_reviews" USING btree ("slug");
  CREATE INDEX "crypto_casino_reviews_updated_at_idx" ON "crypto_casino_reviews" USING btree ("updated_at");
  CREATE INDEX "crypto_casino_reviews_created_at_idx" ON "crypto_casino_reviews" USING btree ("created_at");
  CREATE INDEX "crypto_casino_reviews__status_idx" ON "crypto_casino_reviews" USING btree ("_status");
  CREATE INDEX "_crypto_casino_reviews_v_version_verdict_whats_good_order_idx" ON "_crypto_casino_reviews_v_version_verdict_whats_good" USING btree ("_order");
  CREATE INDEX "_crypto_casino_reviews_v_version_verdict_whats_good_parent_id_idx" ON "_crypto_casino_reviews_v_version_verdict_whats_good" USING btree ("_parent_id");
  CREATE INDEX "_crypto_casino_reviews_v_version_verdict_whats_bad_order_idx" ON "_crypto_casino_reviews_v_version_verdict_whats_bad" USING btree ("_order");
  CREATE INDEX "_crypto_casino_reviews_v_version_verdict_whats_bad_parent_id_idx" ON "_crypto_casino_reviews_v_version_verdict_whats_bad" USING btree ("_parent_id");
  CREATE INDEX "_crypto_casino_reviews_v_parent_idx" ON "_crypto_casino_reviews_v" USING btree ("parent_id");
  CREATE INDEX "_crypto_casino_reviews_v_version_version_slug_idx" ON "_crypto_casino_reviews_v" USING btree ("version_slug");
  CREATE INDEX "_crypto_casino_reviews_v_version_version_updated_at_idx" ON "_crypto_casino_reviews_v" USING btree ("version_updated_at");
  CREATE INDEX "_crypto_casino_reviews_v_version_version_created_at_idx" ON "_crypto_casino_reviews_v" USING btree ("version_created_at");
  CREATE INDEX "_crypto_casino_reviews_v_version_version__status_idx" ON "_crypto_casino_reviews_v" USING btree ("version__status");
  CREATE INDEX "_crypto_casino_reviews_v_created_at_idx" ON "_crypto_casino_reviews_v" USING btree ("created_at");
  CREATE INDEX "_crypto_casino_reviews_v_updated_at_idx" ON "_crypto_casino_reviews_v" USING btree ("updated_at");
  CREATE INDEX "_crypto_casino_reviews_v_latest_idx" ON "_crypto_casino_reviews_v" USING btree ("latest");
  CREATE INDEX "wagering_bonuses_contributing_games_order_idx" ON "wagering_bonuses_contributing_games" USING btree ("_order");
  CREATE INDEX "wagering_bonuses_contributing_games_parent_id_idx" ON "wagering_bonuses_contributing_games" USING btree ("_parent_id");
  CREATE INDEX "wagering_bonuses_operator_idx" ON "wagering_bonuses" USING btree ("operator_id");
  CREATE UNIQUE INDEX "wagering_bonuses_slug_idx" ON "wagering_bonuses" USING btree ("slug");
  CREATE INDEX "wagering_bonuses_updated_at_idx" ON "wagering_bonuses" USING btree ("updated_at");
  CREATE INDEX "wagering_bonuses_created_at_idx" ON "wagering_bonuses" USING btree ("created_at");
  CREATE INDEX "wagering_bonuses__status_idx" ON "wagering_bonuses" USING btree ("_status");
  CREATE INDEX "_wagering_bonuses_v_version_contributing_games_order_idx" ON "_wagering_bonuses_v_version_contributing_games" USING btree ("_order");
  CREATE INDEX "_wagering_bonuses_v_version_contributing_games_parent_id_idx" ON "_wagering_bonuses_v_version_contributing_games" USING btree ("_parent_id");
  CREATE INDEX "_wagering_bonuses_v_parent_idx" ON "_wagering_bonuses_v" USING btree ("parent_id");
  CREATE INDEX "_wagering_bonuses_v_version_version_operator_idx" ON "_wagering_bonuses_v" USING btree ("version_operator_id");
  CREATE INDEX "_wagering_bonuses_v_version_version_slug_idx" ON "_wagering_bonuses_v" USING btree ("version_slug");
  CREATE INDEX "_wagering_bonuses_v_version_version_updated_at_idx" ON "_wagering_bonuses_v" USING btree ("version_updated_at");
  CREATE INDEX "_wagering_bonuses_v_version_version_created_at_idx" ON "_wagering_bonuses_v" USING btree ("version_created_at");
  CREATE INDEX "_wagering_bonuses_v_version_version__status_idx" ON "_wagering_bonuses_v" USING btree ("version__status");
  CREATE INDEX "_wagering_bonuses_v_created_at_idx" ON "_wagering_bonuses_v" USING btree ("created_at");
  CREATE INDEX "_wagering_bonuses_v_updated_at_idx" ON "_wagering_bonuses_v" USING btree ("updated_at");
  CREATE INDEX "_wagering_bonuses_v_latest_idx" ON "_wagering_bonuses_v" USING btree ("latest");
  CREATE INDEX "no_wagering_bonuses_operator_idx" ON "no_wagering_bonuses" USING btree ("operator_id");
  CREATE UNIQUE INDEX "no_wagering_bonuses_slug_idx" ON "no_wagering_bonuses" USING btree ("slug");
  CREATE INDEX "no_wagering_bonuses_updated_at_idx" ON "no_wagering_bonuses" USING btree ("updated_at");
  CREATE INDEX "no_wagering_bonuses_created_at_idx" ON "no_wagering_bonuses" USING btree ("created_at");
  CREATE INDEX "no_wagering_bonuses__status_idx" ON "no_wagering_bonuses" USING btree ("_status");
  CREATE INDEX "_no_wagering_bonuses_v_parent_idx" ON "_no_wagering_bonuses_v" USING btree ("parent_id");
  CREATE INDEX "_no_wagering_bonuses_v_version_version_operator_idx" ON "_no_wagering_bonuses_v" USING btree ("version_operator_id");
  CREATE INDEX "_no_wagering_bonuses_v_version_version_slug_idx" ON "_no_wagering_bonuses_v" USING btree ("version_slug");
  CREATE INDEX "_no_wagering_bonuses_v_version_version_updated_at_idx" ON "_no_wagering_bonuses_v" USING btree ("version_updated_at");
  CREATE INDEX "_no_wagering_bonuses_v_version_version_created_at_idx" ON "_no_wagering_bonuses_v" USING btree ("version_created_at");
  CREATE INDEX "_no_wagering_bonuses_v_version_version__status_idx" ON "_no_wagering_bonuses_v" USING btree ("version__status");
  CREATE INDEX "_no_wagering_bonuses_v_created_at_idx" ON "_no_wagering_bonuses_v" USING btree ("created_at");
  CREATE INDEX "_no_wagering_bonuses_v_updated_at_idx" ON "_no_wagering_bonuses_v" USING btree ("updated_at");
  CREATE INDEX "_no_wagering_bonuses_v_latest_idx" ON "_no_wagering_bonuses_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_traditional_casino_reviews_fk" FOREIGN KEY ("trad_casino_reviews_id") REFERENCES "public"."trad_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crypto_casino_reviews_fk" FOREIGN KEY ("crypto_casino_reviews_id") REFERENCES "public"."crypto_casino_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wagering_bonuses_fk" FOREIGN KEY ("wagering_bonuses_id") REFERENCES "public"."wagering_bonuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_no_wagering_bonuses_fk" FOREIGN KEY ("no_wagering_bonuses_id") REFERENCES "public"."no_wagering_bonuses"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_trad_casino_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("trad_casino_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_crypto_casino_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("crypto_casino_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_wagering_bonuses_id_idx" ON "payload_locked_documents_rels" USING btree ("wagering_bonuses_id");
  CREATE INDEX "payload_locked_documents_rels_no_wagering_bonuses_id_idx" ON "payload_locked_documents_rels" USING btree ("no_wagering_bonuses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "trad_casino_reviews_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trad_casino_reviews_verdict_whats_good" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trad_casino_reviews_verdict_whats_bad" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trad_casino_reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_trad_casino_reviews_v_version_markets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_trad_casino_reviews_v_version_verdict_whats_good" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_trad_casino_reviews_v_version_verdict_whats_bad" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_trad_casino_reviews_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crypto_casino_reviews_verdict_whats_good" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crypto_casino_reviews_verdict_whats_bad" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crypto_casino_reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_crypto_casino_reviews_v_version_verdict_whats_good" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_crypto_casino_reviews_v_version_verdict_whats_bad" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_crypto_casino_reviews_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "wagering_bonuses_contributing_games" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "wagering_bonuses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_wagering_bonuses_v_version_contributing_games" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_wagering_bonuses_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "no_wagering_bonuses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_no_wagering_bonuses_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "trad_casino_reviews_markets" CASCADE;
  DROP TABLE "trad_casino_reviews_verdict_whats_good" CASCADE;
  DROP TABLE "trad_casino_reviews_verdict_whats_bad" CASCADE;
  DROP TABLE "trad_casino_reviews" CASCADE;
  DROP TABLE "_trad_casino_reviews_v_version_markets" CASCADE;
  DROP TABLE "_trad_casino_reviews_v_version_verdict_whats_good" CASCADE;
  DROP TABLE "_trad_casino_reviews_v_version_verdict_whats_bad" CASCADE;
  DROP TABLE "_trad_casino_reviews_v" CASCADE;
  DROP TABLE "crypto_casino_reviews_verdict_whats_good" CASCADE;
  DROP TABLE "crypto_casino_reviews_verdict_whats_bad" CASCADE;
  DROP TABLE "crypto_casino_reviews" CASCADE;
  DROP TABLE "_crypto_casino_reviews_v_version_verdict_whats_good" CASCADE;
  DROP TABLE "_crypto_casino_reviews_v_version_verdict_whats_bad" CASCADE;
  DROP TABLE "_crypto_casino_reviews_v" CASCADE;
  DROP TABLE "wagering_bonuses_contributing_games" CASCADE;
  DROP TABLE "wagering_bonuses" CASCADE;
  DROP TABLE "_wagering_bonuses_v_version_contributing_games" CASCADE;
  DROP TABLE "_wagering_bonuses_v" CASCADE;
  DROP TABLE "no_wagering_bonuses" CASCADE;
  DROP TABLE "_no_wagering_bonuses_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_traditional_casino_reviews_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crypto_casino_reviews_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wagering_bonuses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_no_wagering_bonuses_fk";
  
  DROP INDEX "payload_locked_documents_rels_trad_casino_reviews_id_idx";
  DROP INDEX "payload_locked_documents_rels_crypto_casino_reviews_id_idx";
  DROP INDEX "payload_locked_documents_rels_wagering_bonuses_id_idx";
  DROP INDEX "payload_locked_documents_rels_no_wagering_bonuses_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "trad_casino_reviews_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "crypto_casino_reviews_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "wagering_bonuses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "no_wagering_bonuses_id";
  DROP TYPE "public"."enum_trad_casino_reviews_markets";
  DROP TYPE "public"."trad_license_authority";
  DROP TYPE "public"."enum_trad_casino_reviews_status";
  DROP TYPE "public"."enum__trad_casino_reviews_v_version_markets";
  DROP TYPE "public"."enum__trad_casino_reviews_v_version_status";
  DROP TYPE "public"."enum_crypto_casino_reviews_status";
  DROP TYPE "public"."enum__crypto_casino_reviews_v_version_status";
  DROP TYPE "public"."enum_wagering_bonuses_wagering_applies_to";
  DROP TYPE "public"."enum_wagering_bonuses_status";
  DROP TYPE "public"."enum__wagering_bonuses_v_version_wagering_applies_to";
  DROP TYPE "public"."enum__wagering_bonuses_v_version_status";
  DROP TYPE "public"."enum_no_wagering_bonuses_status";
  DROP TYPE "public"."enum__no_wagering_bonuses_v_version_status";`)
}
