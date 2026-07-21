/**
 * The real grading rubric — brands/01-playerside/categories/traditional/grading-rubric.md
 * (Traditional Casino category, v1 [DRAFT]). Categories are locked; weights are
 * explicitly open for revision per that file, used as-is here. Kept as a code
 * constant rather than a CMS field on purpose: it's the grading methodology
 * itself, sourced from a confidential, access-restricted spec file, not
 * day-to-day marketing copy — it should only change when the rubric does.
 *
 * Two columns, ordered by weight within each column (matches the reference
 * concept's layout), summing to 100%.
 */
export const methodologyColumns: { label: string; weight: number }[][] = [
  [
    { label: 'Withdrawals', weight: 15 },
    { label: 'Promotions & bonus transparency', weight: 15 },
    { label: 'Support', weight: 12 },
    { label: 'Licensing & regulatory standing', weight: 12 },
    { label: 'KYC process', weight: 12 },
  ],
  [
    { label: 'Game variety', weight: 10 },
    { label: 'Live casino quality', weight: 8 },
    { label: 'Deposits', weight: 8 },
    { label: 'Community sentiment', weight: 8 },
  ],
]
