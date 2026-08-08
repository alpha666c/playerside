/**
 * Seed illustrative ResearchQueue cases for the Phase 5 pipeline board.
 *
 * Case numbers use the blueprint's seed format #PS-2026-SNN (§2: "Seed
 * reviews use the format #PS-YYYY-SNN — the S flag marks them as non-live").
 * #PS-2026-S01..S03 are already taken by the published seed reviews (Aurora
 * Bay, Northlight, Ferrous), so the queue demo starts at S04.
 *
 * Every transition goes through the REAL stage contract: enforceStatusTransition
 * (one stage at a time, no skipping) + STAGE_ENTRY_GATES (each stage requires
 * the previous stage's exit condition to exist). Advancing a case therefore
 * proves the board is showing data that the pipeline itself would allow.
 *
 * Naming note: the blueprint's §2 registry already assigns S01-S03 to the
 * published seed reviews (Aurora Bay, Northlight, Ferrous). Their queue
 * records in this demo carry S09/S10 — the registry predates the queue
 * collection and the numbers are not duplicated; S04-S08 are new
 * illustrative operators.
 *
 * Idempotent: existing cases are resumed from their current stage, never
 * reset or re-created.
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import { PIPELINE_STAGES } from '../src/lib/pipeline'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const payload = await getPayload({ config: configPromise })

const FIND = { depth: 0, overrideAccess: true as const }

/** Minimal valid Lexical richText doc for the editorialDraft field. */
const draft = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        text,
        children: [{ type: 'text', text, format: 0, version: 1, detail: 0, mode: 'normal', style: '' }],
      },
    ],
  },
})

const deskResearchOutput = {
  licenseVerified: true,
  licenseAuthority: 'Sample Regulator (illustrative)',
  complaintPattern: 'No material complaints found in sample sweep.',
  sourcing: 'regulator-register',
  verifiedAt: new Date().toISOString(),
}

const handsOnResults = {
  withdrawalActualHours: 18,
  supportActualMinutes: 42,
  kycActualDays: 1,
  bonusActualWager: 30,
  supportQualityScore: '3',
  emailQualityScore: '3',
  emailPolicyAccuracyFlag: 'match',
}

const evidenceRegister = [
  {
    label: 'License register entry',
    claimKey: 'licenseNumber',
    claimSummary: 'License number matches the regulator register.',
    sourceType: 'regulator-register',
    verificationStatus: 'verified',
    accessDate: new Date().toISOString().slice(0, 10),
    isCurrent: true,
  },
]

const ensureCase = async (caseNumber: string) => {
  const existing = await payload.find({
    ...FIND,
    collection: 'research-queue',
    where: { caseNumber: { equals: caseNumber } },
  })
  return existing.docs[0] ?? null
}

const advance = async (id: string | number, status: string, extra: Record<string, unknown> = {}) => {
  const updated = await payload.update({
    ...FIND,
    collection: 'research-queue',
    id,
    data: { status, ...extra },
  })
  return updated
}

const createCase = async (caseNumber: string, operatorName: string, casinoType: 'traditional' | 'crypto') => {
  const created = await payload.create({
    ...FIND,
    collection: 'research-queue',
    data: { caseNumber, operatorName, casinoType },
  })
  return created
}

const run = async () => {
  const target = [
    { caseNumber: '#PS-2026-S04', operatorName: 'Halcyon Dunes Casino', casinoType: 'traditional' as const, to: 'queued' },
    { caseNumber: '#PS-2026-S05', operatorName: 'Cinder Ridge Casino', casinoType: 'traditional' as const, to: 'desk-research' },
    { caseNumber: '#PS-2026-S06', operatorName: 'Meridian Sands Casino', casinoType: 'traditional' as const, to: 'hands-on-testing' },
    { caseNumber: '#PS-2026-S07', operatorName: 'Vanta Reef Casino', casinoType: 'traditional' as const, to: 'editorial' },
    { caseNumber: '#PS-2026-S08', operatorName: 'Ochre Vale Casino', casinoType: 'crypto' as const, to: 'integrity-check' },
    { caseNumber: '#PS-2026-S09', operatorName: 'Aurora Bay Casino', casinoType: 'traditional' as const, to: 'published' },
    { caseNumber: '#PS-2026-S10', operatorName: 'Northlight Casino', casinoType: 'traditional' as const, to: 'monitoring' },
  ]

  const aurora = await payload.find({
    ...FIND,
    collection: 'traditional-casino-reviews',
    where: { slug: { equals: 'aurora-bay-casino' } },
  })
  const northlight = await payload.find({
    ...FIND,
    collection: 'traditional-casino-reviews',
    where: { slug: { equals: 'northlight-casino' } },
  })
  const auroraId = aurora.docs[0]?.id
  const northlightId = northlight.docs[0]?.id

  for (const spec of target) {
    const existing = await ensureCase(spec.caseNumber)
    const created = existing ?? (await createCase(spec.caseNumber, spec.operatorName, spec.casinoType))
    const currentStatus = existing ? String(existing.status) : 'queued'
    if (existing) payload.logger.info(`Resuming ${spec.caseNumber} from ${currentStatus}`)
    else payload.logger.info(`Created ${spec.caseNumber} at queued`)

    // Advance one stage at a time to the target, carrying the gate-satisfying
    // data along at the exact transition that needs it.
    const steps: Array<{ status: string; extra?: Record<string, unknown> }> = []
    if (spec.to !== 'queued') {
      steps.push({ status: 'desk-research' })
    }
    if (['hands-on-testing', 'editorial', 'integrity-check', 'published', 'monitoring'].includes(spec.to)) {
      steps.push({ status: 'hands-on-testing', extra: { deskResearchOutput } })
    }
    if (['editorial', 'integrity-check', 'published', 'monitoring'].includes(spec.to)) {
      steps.push({ status: 'editorial', extra: { handsOnResults, evidenceRegister } })
    }
    if (['integrity-check', 'published', 'monitoring'].includes(spec.to)) {
      steps.push({
        status: 'integrity-check',
        extra: { editorialDraft: draft(`${spec.operatorName} — full editorial draft (illustrative).`) },
      })
    }
    if (spec.to === 'published' && auroraId) {
      steps.push({
        status: 'published',
        extra: {
          integritySignOff: true,
          publishedReviewId: { relationTo: 'traditional-casino-reviews', value: auroraId },
        },
      })
    } else if (spec.to === 'published') {
      steps.push({ status: 'published', extra: { integritySignOff: true } })
    }
    if (spec.to === 'monitoring') {
      if (!northlightId) {
        payload.logger.warn(`${spec.caseNumber}: no northlight review to link — stopping at published`)
        steps.push({ status: 'published', extra: { integritySignOff: true } })
      } else {
        steps.push({ status: 'published', extra: { integritySignOff: true } })
        steps.push({
          status: 'monitoring',
          extra: {
            publishedReviewId: { relationTo: 'traditional-casino-reviews', value: northlightId },
            monitorLog: [
              {
                date: new Date().toISOString().slice(0, 10),
                flagType: 'none',
                summary: 'Initial post-publish sweep — no material changes (illustrative).',
              },
            ],
          },
        })
      }
    }

    const currentIndex = PIPELINE_STAGES.indexOf(currentStatus as never)
    for (const step of steps) {
      const stepIndex = PIPELINE_STAGES.indexOf(step.status as never)
      if (stepIndex <= currentIndex) continue
      await advance(created.id, step.status, step.extra ?? {})
      payload.logger.info(`  ${spec.caseNumber} -> ${step.status}`)
    }
  }

  const all = await payload.find({ ...FIND, collection: 'research-queue', limit: 100 })
  const byStatus = new Map<string, number>()
  for (const c of all.docs) {
    byStatus.set(String(c.status), (byStatus.get(String(c.status)) ?? 0) + 1)
  }
  payload.logger.info('Board now:', Object.fromEntries(byStatus))
}

await run()

// Payload keeps the DB pool open after a successful run — exit explicitly so
// the script terminates (a crash earlier would have exited on its own).
process.exit(0)
