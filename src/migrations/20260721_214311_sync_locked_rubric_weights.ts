import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "trad_casino_reviews" ADD COLUMN "community_sentiment_note" varchar;
  ALTER TABLE "_trad_casino_reviews_v" ADD COLUMN "version_community_sentiment_note" varchar;
  ALTER TABLE "crypto_casino_reviews" ADD COLUMN "community_sentiment_note" varchar;
  ALTER TABLE "_crypto_casino_reviews_v" ADD COLUMN "version_community_sentiment_note" varchar;
  ALTER TABLE "trad_casino_reviews" DROP COLUMN "scores_community_sentiment_score";
  ALTER TABLE "trad_casino_reviews" DROP COLUMN "scores_community_sentiment_evidence";
  ALTER TABLE "trad_casino_reviews" DROP COLUMN "scores_community_sentiment_narrative";
  ALTER TABLE "_trad_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_score";
  ALTER TABLE "_trad_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_evidence";
  ALTER TABLE "_trad_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_narrative";
  ALTER TABLE "crypto_casino_reviews" DROP COLUMN "scores_community_sentiment_score";
  ALTER TABLE "crypto_casino_reviews" DROP COLUMN "scores_community_sentiment_evidence";
  ALTER TABLE "crypto_casino_reviews" DROP COLUMN "scores_community_sentiment_narrative";
  ALTER TABLE "_crypto_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_score";
  ALTER TABLE "_crypto_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_evidence";
  ALTER TABLE "_crypto_casino_reviews_v" DROP COLUMN "version_scores_community_sentiment_narrative";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "trad_casino_reviews" ADD COLUMN "scores_community_sentiment_score" numeric;
  ALTER TABLE "trad_casino_reviews" ADD COLUMN "scores_community_sentiment_evidence" varchar;
  ALTER TABLE "trad_casino_reviews" ADD COLUMN "scores_community_sentiment_narrative" varchar;
  ALTER TABLE "_trad_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_score" numeric;
  ALTER TABLE "_trad_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_evidence" varchar;
  ALTER TABLE "_trad_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_narrative" varchar;
  ALTER TABLE "crypto_casino_reviews" ADD COLUMN "scores_community_sentiment_score" numeric;
  ALTER TABLE "crypto_casino_reviews" ADD COLUMN "scores_community_sentiment_evidence" varchar;
  ALTER TABLE "crypto_casino_reviews" ADD COLUMN "scores_community_sentiment_narrative" varchar;
  ALTER TABLE "_crypto_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_score" numeric;
  ALTER TABLE "_crypto_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_evidence" varchar;
  ALTER TABLE "_crypto_casino_reviews_v" ADD COLUMN "version_scores_community_sentiment_narrative" varchar;
  ALTER TABLE "trad_casino_reviews" DROP COLUMN "community_sentiment_note";
  ALTER TABLE "_trad_casino_reviews_v" DROP COLUMN "version_community_sentiment_note";
  ALTER TABLE "crypto_casino_reviews" DROP COLUMN "community_sentiment_note";
  ALTER TABLE "_crypto_casino_reviews_v" DROP COLUMN "version_community_sentiment_note";`)
}
