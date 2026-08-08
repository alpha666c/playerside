import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * MASTER-BLUEPRINT.md §6 — Claims vs Reality.
 *
 * Adds the `claimsVsReality` group (claimed vs measured pairs for the four
 * standardized hands-on tests) to both review collections AND their draft
 * version tables. All columns are nullable: a field that has not been
 * hands-on tested stays NULL and the public page renders "Not yet tested —
 * pending hands-on verification." No guessing, no estimating (§6).
 *
 * Column naming follows the existing Payload group convention seen in
 * 20260721_162047 (group `compliance` + field `licenseNumber` →
 * `compliance_license_number`); version tables prefix with `version_`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trad_casino_reviews"
      ADD COLUMN "claims_vs_reality_withdrawal_claimed_hours" numeric,
      ADD COLUMN "claims_vs_reality_withdrawal_measured_hours" numeric,
      ADD COLUMN "claims_vs_reality_support_claimed_minutes" numeric,
      ADD COLUMN "claims_vs_reality_support_measured_minutes" numeric,
      ADD COLUMN "claims_vs_reality_kyc_claimed_days" numeric,
      ADD COLUMN "claims_vs_reality_kyc_measured_days" numeric,
      ADD COLUMN "claims_vs_reality_bonus_claimed_wager" numeric,
      ADD COLUMN "claims_vs_reality_bonus_measured_wager" numeric;
    ALTER TABLE "crypto_casino_reviews"
      ADD COLUMN "claims_vs_reality_withdrawal_claimed_hours" numeric,
      ADD COLUMN "claims_vs_reality_withdrawal_measured_hours" numeric,
      ADD COLUMN "claims_vs_reality_support_claimed_minutes" numeric,
      ADD COLUMN "claims_vs_reality_support_measured_minutes" numeric,
      ADD COLUMN "claims_vs_reality_kyc_claimed_days" numeric,
      ADD COLUMN "claims_vs_reality_kyc_measured_days" numeric,
      ADD COLUMN "claims_vs_reality_bonus_claimed_wager" numeric,
      ADD COLUMN "claims_vs_reality_bonus_measured_wager" numeric;
    ALTER TABLE "_trad_casino_reviews_v"
      ADD COLUMN "version_claims_vs_reality_withdrawal_claimed_hours" numeric,
      ADD COLUMN "version_claims_vs_reality_withdrawal_measured_hours" numeric,
      ADD COLUMN "version_claims_vs_reality_support_claimed_minutes" numeric,
      ADD COLUMN "version_claims_vs_reality_support_measured_minutes" numeric,
      ADD COLUMN "version_claims_vs_reality_kyc_claimed_days" numeric,
      ADD COLUMN "version_claims_vs_reality_kyc_measured_days" numeric,
      ADD COLUMN "version_claims_vs_reality_bonus_claimed_wager" numeric,
      ADD COLUMN "version_claims_vs_reality_bonus_measured_wager" numeric;
    ALTER TABLE "_crypto_casino_reviews_v"
      ADD COLUMN "version_claims_vs_reality_withdrawal_claimed_hours" numeric,
      ADD COLUMN "version_claims_vs_reality_withdrawal_measured_hours" numeric,
      ADD COLUMN "version_claims_vs_reality_support_claimed_minutes" numeric,
      ADD COLUMN "version_claims_vs_reality_support_measured_minutes" numeric,
      ADD COLUMN "version_claims_vs_reality_kyc_claimed_days" numeric,
      ADD COLUMN "version_claims_vs_reality_kyc_measured_days" numeric,
      ADD COLUMN "version_claims_vs_reality_bonus_claimed_wager" numeric,
      ADD COLUMN "version_claims_vs_reality_bonus_measured_wager" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "trad_casino_reviews"
      DROP COLUMN "claims_vs_reality_withdrawal_claimed_hours",
      DROP COLUMN "claims_vs_reality_withdrawal_measured_hours",
      DROP COLUMN "claims_vs_reality_support_claimed_minutes",
      DROP COLUMN "claims_vs_reality_support_measured_minutes",
      DROP COLUMN "claims_vs_reality_kyc_claimed_days",
      DROP COLUMN "claims_vs_reality_kyc_measured_days",
      DROP COLUMN "claims_vs_reality_bonus_claimed_wager",
      DROP COLUMN "claims_vs_reality_bonus_measured_wager";
    ALTER TABLE "crypto_casino_reviews"
      DROP COLUMN "claims_vs_reality_withdrawal_claimed_hours",
      DROP COLUMN "claims_vs_reality_withdrawal_measured_hours",
      DROP COLUMN "claims_vs_reality_support_claimed_minutes",
      DROP COLUMN "claims_vs_reality_support_measured_minutes",
      DROP COLUMN "claims_vs_reality_kyc_claimed_days",
      DROP COLUMN "claims_vs_reality_kyc_measured_days",
      DROP COLUMN "claims_vs_reality_bonus_claimed_wager",
      DROP COLUMN "claims_vs_reality_bonus_measured_wager";
    ALTER TABLE "_trad_casino_reviews_v"
      DROP COLUMN "version_claims_vs_reality_withdrawal_claimed_hours",
      DROP COLUMN "version_claims_vs_reality_withdrawal_measured_hours",
      DROP COLUMN "version_claims_vs_reality_support_claimed_minutes",
      DROP COLUMN "version_claims_vs_reality_support_measured_minutes",
      DROP COLUMN "version_claims_vs_reality_kyc_claimed_days",
      DROP COLUMN "version_claims_vs_reality_kyc_measured_days",
      DROP COLUMN "version_claims_vs_reality_bonus_claimed_wager",
      DROP COLUMN "version_claims_vs_reality_bonus_measured_wager";
    ALTER TABLE "_crypto_casino_reviews_v"
      DROP COLUMN "version_claims_vs_reality_withdrawal_claimed_hours",
      DROP COLUMN "version_claims_vs_reality_withdrawal_measured_hours",
      DROP COLUMN "version_claims_vs_reality_support_claimed_minutes",
      DROP COLUMN "version_claims_vs_reality_support_measured_minutes",
      DROP COLUMN "version_claims_vs_reality_kyc_claimed_days",
      DROP COLUMN "version_claims_vs_reality_kyc_measured_days",
      DROP COLUMN "version_claims_vs_reality_bonus_claimed_wager",
      DROP COLUMN "version_claims_vs_reality_bonus_measured_wager";
  `)
}
