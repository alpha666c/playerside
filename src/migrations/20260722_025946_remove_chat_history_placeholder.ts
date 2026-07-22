import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "research_queue_chat_history" CASCADE;
  DROP TYPE "public"."enum_research_queue_chat_history_role";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_research_queue_chat_history_role" AS ENUM('user', 'assistant');
  CREATE TABLE "research_queue_chat_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_research_queue_chat_history_role" NOT NULL,
  	"message" varchar NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "research_queue_chat_history" ADD CONSTRAINT "research_queue_chat_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."research_queue"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "research_queue_chat_history_order_idx" ON "research_queue_chat_history" USING btree ("_order");
  CREATE INDEX "research_queue_chat_history_parent_id_idx" ON "research_queue_chat_history" USING btree ("_parent_id");`)
}
