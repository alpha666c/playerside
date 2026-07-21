import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { IllustrativeBanner } from '@/components/IllustrativeBanner/IllustrativeBanner'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const bonuses = await payload.find({
    collection: 'no-wagering-bonuses',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return bonuses.docs.map(({ slug }) => ({ slug: slug as string }))
}

type Args = { params: Promise<{ slug?: string }> }

export default async function NoWageringBonusPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const bonus = await queryBySlug(decodeURIComponent(slug))
  const { isEnabled: draft } = await draftMode()

  if (!bonus) return notFound()
  const operator = typeof bonus.operator === 'object' ? bonus.operator : null

  return (
    <article className="pb-24 pt-16 sm:pt-20">
      {draft && <LivePreviewListener />}
      <div className="container max-w-[720px]">
        {bonus.isIllustrativeSample ? (
          <div className="mb-6">
            <IllustrativeBanner subject="offer" />
          </div>
        ) : null}
        {operator ? (
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[1.5px] text-paper-dim">
            <Link className="text-evidence underline" href={`/casinos/${operator.slug}`}>
              {operator.name}
            </Link>
          </p>
        ) : null}
        <h1 className="mb-4 text-[28px] leading-[1.1] sm:text-[34px] lg:text-[40px]">
          {bonus.title}
        </h1>
        <p className="mb-8 text-base text-paper-dim sm:text-lg">{bonus.summary}</p>

        <dl className="m-0 grid gap-x-6 gap-y-5 rounded-[var(--radius)] border border-line bg-dusk p-6 font-mono text-[13px] sm:grid-cols-2 sm:p-7">
          <div>
            <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Bonus amount
            </dt>
            <dd className="m-0 text-lg text-gold">{bonus.bonusAmount}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Max withdrawal
            </dt>
            <dd className="m-0 text-paper">{bonus.maxWithdrawal}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Eligibility
            </dt>
            <dd className="m-0 text-paper">{bonus.eligibility}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Expiry
            </dt>
            <dd className="m-0 text-paper">{bonus.expiry}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10.5px] uppercase tracking-[1.5px] text-paper-dim/70">
              Withdrawal conditions
            </dt>
            <dd className="m-0 text-paper">{bonus.withdrawalConditions}</dd>
          </div>
        </dl>

        <p className="mt-6 text-[12px] italic text-paper-dim">
          18+. Gambling can be addictive — play responsibly. Affiliate link — see the operator
          review for full compliance information.
        </p>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const bonus = await queryBySlug(decodeURIComponent(slug))
  if (!bonus) return {}
  return { description: bonus.summary, title: `${bonus.title} — Playerside` }
}

const queryBySlug = cache(async (slug: string) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'no-wagering-bonuses',
    depth: 1,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return result.docs?.[0] || null
})
