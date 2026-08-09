import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { cryptoRubric } from '@/rubrics/crypto'
import { traditionalRubric } from '@/rubrics/traditional'
import {
  buildCompareUrl,
  parseCompareSlugs,
  pickCompareGroup,
  type CompareCategory,
  type CompareEntry,
  type CompareRubricCategory,
  type CompareScore,
} from '@/lib/compare'

/**
 * Casino comparison — Phase 3 (F3.2). Shareable via ?slugs=a,b (up to 4).
 * The table is honest by construction: Traditional and Crypto rubrics differ,
 * so a mixed selection is never rendered as one table (pickCompareGroup picks
 * the category that can be compared and the page says why).
 */
export const dynamic = 'force-dynamic'

type Args = { searchParams: Promise<{ slugs?: string }> }

export default async function ComparePage({ searchParams: searchParamsPromise }: Args) {
  const { slugs: rawSlugs } = await searchParamsPromise
  const slugs = parseCompareSlugs(rawSlugs)
  const payload = await getPayload({ config: configPromise })

  const entries: CompareEntry[] = []
  for (const [collection, category] of [
    ['traditional-casino-reviews', 'traditional'],
    ['crypto-casino-reviews', 'crypto'],
  ] as const) {
    const docs = await payload.find({
      collection,
      depth: 1,
      limit: MAX_DOCS,
      overrideAccess: false,
      select: {
        name: true,
        slug: true,
        summary: true,
        overallScore: true,
        isIllustrativeSample: true,
        compliance: true,
        markets: true,
        verdict: true,
        scores: true,
      },
      where: {
        and: [{ _status: { equals: 'published' } }, { slug: { in: slugs } }],
      },
    })
    for (const doc of docs.docs as never[]) {
      const d = doc as {
        id: string | number
        name: string
        slug: string
        overallScore?: number | null
        isIllustrativeSample?: boolean | null
        compliance?: { licenseAuthority?: string | null; licenseNumber?: string | null } | null
        markets?: string[] | null
        verdict?: {
          whatsGood?: { point?: string }[] | null
          whatsBad?: { point?: string }[] | null
          narrative?: string | null
        } | null
        scores?: Record<string, { score?: number | null } | null> | null
      }
      const rubric = category === 'crypto' ? cryptoRubric : traditionalRubric
      entries.push({
        id: d.id,
        slug: d.slug,
        name: d.name,
        href: category === 'crypto' ? `/crypto-casinos/${d.slug}` : `/casinos/${d.slug}`,
        category: category as CompareCategory,
        overallScore: d.overallScore,
        rubric: rubric as CompareRubricCategory[],
        scores: (d.scores ?? {}) as Record<string, CompareScore | null>,
        licenseAuthority: d.compliance?.licenseAuthority,
        licenseNumber: d.compliance?.licenseNumber,
        markets: d.markets,
        whatsGood: (d.verdict?.whatsGood ?? []).map((p) => p.point ?? ''),
        whatsBad: (d.verdict?.whatsBad ?? []).map((p) => p.point ?? ''),
        narrative: d.verdict?.narrative,
        isSample: d.isIllustrativeSample,
      })
    }
  }

  const { group, mixed } = pickCompareGroup(entries)
  const foundSlugs = new Set(entries.map((e) => e.slug))
  const notFound = slugs.filter((s) => !foundSlugs.has(s))

  return (
    <div className="pb-24 pt-16 sm:pt-20">
      <div className="container mb-10 max-w-[760px] sm:mb-12">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
          Compare
        </p>
        <h1 className="mb-4 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
          {group.length >= 2
            ? `${group.map((g) => g.name).join(' vs ')}.`
            : 'Compare casinos, honestly.'}
        </h1>
        <p className="text-base text-paper-dim sm:text-lg">
          The same rubric categories, side by side, straight from the published reviews — every
          score evidence-backed, never influenced by commission. Pick up to four casinos with the
          Compare button on any listing card, or edit the slugs in this page&rsquo;s URL.
        </p>
      </div>

      {mixed ? (
        <div className="container mb-8 max-w-[760px]">
          <div className="rounded-[var(--radius)] border border-gold/40 bg-gold/5 p-4 text-[13px] leading-relaxed text-paper">
            <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-gold">
              Rubrics differ —&nbsp;
            </span>
            Traditional and Crypto casinos are scored on different category sets and cannot share
            one table. Only the Traditional selection is compared here; Crypto entries are excluded
            from the table below.
          </div>
        </div>
      ) : null}

      {notFound.length > 0 ? (
        <div className="container mb-8 max-w-[760px]">
          <p className="text-[13px] text-coral">
            Not found or not published: {notFound.join(', ')}.
          </p>
        </div>
      ) : null}

      <div className="container">
        {group.length < 2 ? (
          <div className="rounded-[var(--radius)] border border-line bg-dusk p-8 text-center">
            <p className="mb-1 text-[15px] text-paper">
              {group.length === 1
                ? `“${group[0].name}” is selected — add at least one more to compare.`
                : 'Pick two or more casinos to compare.'}
            </p>
            <p className="mb-5 text-[13.5px] leading-relaxed text-paper-dim">
              Use the Compare button on any review card — a floating bar follows you around the
              site — or jump straight to the lists.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                className="rounded-full border border-line px-4 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href="/casinos"
              >
                Traditional casino reviews
              </Link>
              <Link
                className="rounded-full border border-line px-4 py-2 font-mono text-[12px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href="/crypto-casinos"
              >
                Crypto casino reviews
              </Link>
            </div>
          </div>
        ) : (
          <CompareTable group={group} />
        )}
      </div>

      <p className="container mt-14 max-w-[760px] text-[12px] italic text-paper-dim">
        18+. Gambling can be addictive — play responsibly. Comparison data is commission-blind and
        derived from live, evidence-backed review scores.
      </p>
    </div>
  )
}

const MAX_DOCS = 50

const CompareTable: React.FC<{ group: CompareEntry[] }> = ({ group }) => {
  const rubric = group[0].rubric
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-dusk">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th
                className="sticky left-0 z-10 bg-dusk p-4 pl-5 font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70"
                scope="col"
              >
                Category
              </th>
              {group.map((entry) => (
                <th className="p-4 align-top" key={entry.slug} scope="col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="block truncate text-[14.5px] font-medium text-paper transition-colors duration-200 hover:text-gold"
                        href={entry.href}
                      >
                        {entry.name}
                      </Link>
                      {entry.isSample ? (
                        <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[1px] text-coral">
                          Illustrative sample
                        </span>
                      ) : null}
                    </div>
                    <Link
                      aria-label={`Remove ${entry.name} from comparison`}
                      className="mt-0.5 font-mono text-[13px] text-paper-dim transition-colors duration-200 hover:text-coral"
                      href={buildCompareUrl(group.filter((g) => g.slug !== entry.slug).map((g) => g.slug))}
                      title="Remove from comparison"
                    >
                      ×
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            <ScoreRow group={group} />
            <LicenseRow group={group} />
            <MarketsRow group={group} />
            {rubric.map((category) => (
              <RubricRow category={category} group={group} key={category.key} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {group.map((entry) => (
          <div
            className="rounded-[var(--radius)] border border-line bg-dusk p-5 sm:p-6"
            key={entry.slug}
          >
            <h2 className="mb-3 text-[16px] sm:text-[18px]">{entry.name}</h2>
            {(entry.whatsGood ?? []).length > 0 ? (
              <div className="mb-3">
                <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-evidence">
                  What&rsquo;s good
                </p>
                <ul className="m-0 list-disc space-y-1 pl-[16px] text-[13px] leading-relaxed text-paper-dim">
                  {(entry.whatsGood ?? []).slice(0, 3).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(entry.whatsBad ?? []).length > 0 ? (
              <div>
                <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[1.5px] text-coral">
                  The catch
                </p>
                <ul className="m-0 list-disc space-y-1 pl-[16px] text-[13px] leading-relaxed text-paper-dim">
                  {(entry.whatsBad ?? []).slice(0, 2).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link
              className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[1.5px] text-evidence underline decoration-evidence/40 underline-offset-2 transition-colors hover:decoration-evidence"
              href={entry.href}
            >
              Read the full review →
            </Link>
          </div>
        ))}
      </div>
    </>
  )
}

const LabelCell: React.FC<{ label: string; sub?: string }> = ({ label, sub }) => (
  <th className="sticky left-0 z-10 whitespace-nowrap border-t border-line bg-dusk p-4 pl-5 text-left align-top font-normal" scope="row">
    <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
      {label}
    </span>
    {sub ? (
      <span className="block font-mono text-[9.5px] text-paper-dim/50">{sub}</span>
    ) : null}
  </th>
)

const ScoreRow: React.FC<{ group: CompareEntry[] }> = ({ group }) => (
  <tr>
    <LabelCell label="Overall score" sub="weighted, 0–10" />
    {group.map((entry) => (
      <td className="border-t border-line p-4 align-top" key={entry.slug}>
        <span className="font-mono text-2xl text-gold">
          {typeof entry.overallScore === 'number' ? entry.overallScore.toFixed(1) : '—'}
        </span>
        <span className="font-mono text-[11px] text-paper-dim"> / 10</span>
      </td>
    ))}
  </tr>
)

const LicenseRow: React.FC<{ group: CompareEntry[] }> = ({ group }) => (
  <tr>
    <LabelCell label="License" />
    {group.map((entry) => {
      const verified = Boolean(entry.licenseAuthority && entry.licenseNumber)
      return (
        <td className="border-t border-line p-4 align-top" key={entry.slug}>
          <span className={verified ? 'text-success' : 'text-coral'}>
            {verified ? 'Verified' : 'Not verified'}
          </span>
          {entry.licenseAuthority ? (
            <span className="mt-0.5 block text-paper-dim">{entry.licenseAuthority}</span>
          ) : null}
          {entry.licenseNumber ? (
            <span className="block font-mono text-[11px] text-paper-dim/60">
              {entry.licenseNumber}
            </span>
          ) : null}
        </td>
      )
    })}
  </tr>
)

const MarketsRow: React.FC<{ group: CompareEntry[] }> = ({ group }) => (
  <tr>
    <LabelCell label="Licensed in" />
    {group.map((entry) => (
      <td className="border-t border-line p-4 align-top" key={entry.slug}>
        <div className="flex flex-wrap gap-1.5">
          {(entry.markets ?? []).length > 0 ? (
            entry.markets!.map((market) => (
              <Link
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[1px] text-paper-dim transition-colors duration-200 hover:border-evidence hover:text-paper"
                href={`/markets/${market}`}
                key={market}
              >
                {market.toUpperCase()}
              </Link>
            ))
          ) : (
            <span className="text-paper-dim/60">—</span>
          )}
        </div>
      </td>
    ))}
  </tr>
)

const RubricRow: React.FC<{ category: CompareRubricCategory; group: CompareEntry[] }> = ({
  category,
  group,
}) => {
  const scores = group.map((entry) => entry.scores?.[category.key]?.score ?? null)
  const best = Math.max(...scores.filter((s): s is number => typeof s === 'number'), -1)
  return (
    <tr>
      <LabelCell label={category.label} sub={`${category.weight}% of overall`} />
      {group.map((entry, i) => {
        const score = scores[i]
        return (
          <td
            className={`border-t border-line p-4 align-top font-mono ${
              score === best && best >= 0 ? 'text-gold' : 'text-paper-dim'
            }`}
            key={entry.slug}
          >
            {typeof score === 'number' ? score.toFixed(1) : '—'}
          </td>
        )
      })}
    </tr>
  )
}

export function generateMetadata(): Metadata {
  return {
    description:
      'Compare casino reviews side by side — the same evidence-backed rubric categories, never an apples-to-oranges mix.',
    robots: { index: false, follow: true },
    title: 'Compare casinos — Playerside',
  }
}
