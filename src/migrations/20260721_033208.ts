import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "homepage_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "homepage_sample_operators" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"market" varchar NOT NULL,
  	"score" numeric NOT NULL,
  	"evidence_note" varchar NOT NULL
  );
  
  CREATE TABLE "homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar DEFAULT 'Commission-blind casino reviews',
  	"hero_headline" varchar DEFAULT 'The review site that isn''t secretly working for the casinos.',
  	"hero_subhead" varchar DEFAULT 'Every score traces back to logged evidence. Every bonus term is spelled out exactly — wagering, withdrawal caps, expiry, all of it. No "terms apply."',
  	"hero_primary_cta_label" varchar DEFAULT 'See how we grade',
  	"hero_primary_cta_href" varchar DEFAULT '/#method',
  	"hero_secondary_cta_label" varchar DEFAULT 'Read the wall',
  	"hero_secondary_cta_href" varchar DEFAULT '/#wall',
  	"cta_heading" varchar DEFAULT 'This is the foundation. The reviews come next.',
  	"cta_subtext" varchar DEFAULT 'Playerside — commission-blind, evidence-logged, exact about the terms that matter.',
  	"cta_button_label" varchar DEFAULT 'Get notified at launch',
  	"cta_button_href" varchar DEFAULT '/#reviews',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "homepage_stats" ADD CONSTRAINT "homepage_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "homepage_sample_operators" ADD CONSTRAINT "homepage_sample_operators_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "homepage_stats_order_idx" ON "homepage_stats" USING btree ("_order");
  CREATE INDEX "homepage_stats_parent_id_idx" ON "homepage_stats" USING btree ("_parent_id");
  CREATE INDEX "homepage_sample_operators_order_idx" ON "homepage_sample_operators" USING btree ("_order");
  CREATE INDEX "homepage_sample_operators_parent_id_idx" ON "homepage_sample_operators" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "homepage_stats" CASCADE;
  DROP TABLE "homepage_sample_operators" CASCADE;
  DROP TABLE "homepage" CASCADE;`)
}
