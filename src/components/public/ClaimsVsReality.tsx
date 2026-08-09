import React from 'react'

import {
  buildClaimsRows,
  UNTESTED_TEXT,
  type ClaimVerdict,
  type ClaimsInput,
} from '@/lib/claimsVsReality'

/**
 * MASTER-BLUEPRINT.md §6 — the Claims vs Reality table, the first scored
 * section on every published review page (before the category breakdown).
 *
 * What the operator claims vs what our standardized hands-on tests actually
 * measured. Verdicts are DERIVED from the numbers by src/lib/claimsVsReality.ts
 * — never hand-set. Anything untested renders the fixed §6 cell: "Not yet
 * tested — pending hands-on verification." No guessing, no estimating.
 */
export const ClaimsVsReality: React.FC<{
  claims: ClaimsInput | null | undefined
  /** Illustrative sample reviews (isIllustrativeSample) render an honest footer. */
  sample?: boolean | null
}> = ({ claims, sample }) => {
  const rows = buildClaimsRows(claims)
  const anyMeasured = rows.some((row) => row.verdict !== 'untested')

  const footer = sample
    ? 'Illustrative sample data — pending real hands-on verification. These numbers are placeholders until a real operator is onboarded and actually tested.'
    : anyMeasured
      ? 'Measured by our review team in the standardized hands-on suite — exact timestamps and evidence logged per test.'
      : 'None of these claims have been hands-on tested yet — scores below are desk-research assessments only.'

  return (
    <section
      aria-label="Claims vs reality"
      className="rounded-[var(--radius)] border border-line bg-dusk p-5 sm:p-6"
      id="claims"
    >
      <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-evidence">
        Claims vs reality
      </p>
      <h2 className="mb-1 text-[19px] font-semibold text-paper sm:text-[22px]">
        What they say vs what we measured.
      </h2>
      <p className="mb-5 text-[13px] leading-relaxed text-paper-dim">
        Every operator claims fast withdrawals and quick support. We run the same standardized
        tests on every one of them — the table below is the operator&rsquo;s own claim next to
        what we actually measured. Lower is better for every row.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2.5 pr-4 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70" scope="col">
                Claim
              </th>
              <th className="py-2.5 pr-4 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70" scope="col">
                What they say
              </th>
              <th className="py-2.5 pr-4 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70" scope="col">
                What we measured
              </th>
              <th className="py-2.5 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70" scope="col">
                Verdict
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-line/60 last:border-0" key={row.key}>
                <td className="py-3 pr-4 align-top">
                  <span className="block text-[13.5px] text-paper">{row.label}</span>
                  <span className="block font-mono text-[10px] text-paper-dim/60">
                    {row.measuredLabel} · {row.claimedLabel}
                  </span>
                </td>
                <td className="py-3 pr-4 align-top font-mono text-[13.5px] text-paper">
                  {row.claimedValue ?? '—'}
                </td>
                <td className="py-3 pr-4 align-top text-[13.5px]">
                  {row.measuredValue ? (
                    <span className="font-mono text-paper">{row.measuredValue}</span>
                  ) : (
                    <span className="italic text-paper-dim">{UNTESTED_TEXT}</span>
                  )}
                </td>
                <td className="py-3 align-top">
                  <VerdictBadge verdict={row.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mb-0 mt-4 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-paper-dim">
        {footer}{' '}
        <span className="text-paper-dim/70">
          Affiliate terms never influence a measurement.
        </span>
      </p>
    </section>
  )
}

const VerdictBadge: React.FC<{ verdict: ClaimVerdict }> = ({ verdict }) => {
  if (verdict === 'untested') {
    return <span className="font-mono text-[11px] uppercase tracking-[1px] text-paper-dim/70">Pending</span>
  }
  const [symbol, label, className] =
    verdict === 'met'
      ? ['✓', 'Met', 'text-success']
      : verdict === 'partial'
        ? ['~', 'Partial', 'text-gold']
        : ['✗', 'Not met', 'text-coral']
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] ${className}`}>
      <span aria-hidden="true">{symbol}</span>
      {label}
    </span>
  )
}
