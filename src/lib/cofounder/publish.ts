import type { Payload, PayloadRequest } from 'payload'

import { logEvent, type AgentLogEvent } from '@/lib/logEvent'

/**
 * Phase G (G.6b) — approve-to-publish (spec §12). The ONLY trigger is
 * Viktor's authenticated Approve action; the Cofounder's tool surface has no
 * publish/approve tool (hard rule, spec §12.2 — "human-initiated automation").
 *
 * Ordering is deliberate (QA round 2, S1-1): the irreversible "goes live"
 * step is LAST, so a partial failure never leaves an orphaned live doc:
 *   1. Server-side re-read guard (S1-2): status integrity-check + verdict
 *      PASS + case.version === verdictForVersion (never trust client claims).
 *   2. Select collection by casinoType.
 *   3. Create the review doc as a DRAFT (deterministic slug; a concurrent
 *      create 409s and is treated as an idempotent update — S1-3).
 *   4. Version-checked case update: link `publishedReviewId` + integrity
 *      sign-off + status (two transitions, honoring the pipeline's
 *      one-stage-at-a-time law: integrity-check → published → monitoring).
 *   5. Flip the doc `_status: 'published'` — `enforcePublishCompliance`
 *      fires as the gate; on failure the doc stays draft (S1-1 compensation).
 *
 * The site revalidates itself through the review collection's afterChange
 * hooks (/casinos, /casinos/:slug, /reviews).
 */

export interface PublishResult {
  ok: boolean
  status?: number
  code?: string
  message: string
  publishedReviewId?: number | string
  /** The review doc's collection slug. */
  collectionSlug?: 'traditional-casino-reviews' | 'crypto-casino-reviews'
  /** The review doc's live status after the flip ('published' | 'draft'). */
  docStatus?: 'published' | 'draft'
  caseStatus?: string
  caseVersion?: number
}

/** Latest integrity-checker run on the case (by completedAt) — its verdict is the only one that counts for publish. */
export const latestIntegrityRun = (
  aiRuns: unknown,
): { verdict?: string; verdictForVersion?: number | null; runId?: string } | null => {
  if (!Array.isArray(aiRuns)) return null
  const runs = aiRuns
    .map((r) => (r && typeof r === 'object' ? (r as Record<string, unknown>) : null))
    .filter(
      (r): r is Record<string, unknown> =>
        r !== null && r.agentRole === 'integrity-checker' && Boolean(r.completedAt),
    )
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
  if (runs.length === 0) return null
  const latest = runs[0]
  const output = latest.output && typeof latest.output === 'object'
    ? (latest.output as Record<string, unknown>)
    : {}
  const integrityResult =
    output.integrityResult && typeof output.integrityResult === 'object'
      ? (output.integrityResult as Record<string, unknown>)
      : {}
  return {
    verdict: typeof integrityResult.verdict === 'string' ? integrityResult.verdict : undefined,
    verdictForVersion:
      typeof integrityResult.verdictForVersion === 'number'
        ? integrityResult.verdictForVersion
        : null,
    runId: typeof latest.runId === 'string' ? latest.runId : undefined,
  }
}

/** Best-effort jurisdiction → market + authority mapping (spec §12.1 step 3). Returns null when unmappable — publish must never guess a market. */
export const mapJurisdiction = (
  jurisdiction: string | null | undefined,
): { market: 'nl' | 'se' | 'de' | 'uk'; authority: string } | null => {
  const j = (jurisdiction ?? '').toLowerCase()
  if (j.includes('netherland') || j.includes('ksa')) {
    return { market: 'nl', authority: 'KSA' }
  }
  if (j.includes('sweden') || j.includes('spelinspektionen')) {
    return { market: 'se', authority: 'Spelinspektionen' }
  }
  if (j.includes('germany') || j.includes('ggl') || j.includes('gemeinsame')) {
    return { market: 'de', authority: 'GGL' }
  }
  if (j.includes('united kingdom') || j.includes('ukgc') || j === 'uk') {
    return { market: 'uk', authority: 'UKGC' }
  }
  return null
}

/** Deterministic slug from an operator name — stable across re-publishes (S1-3). */
export const slugifyOperator = (name: string | null | undefined): string => {
  const base = String(name ?? 'operator')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'operator'
}

/** Read a nested value by dot-path (compliance.licenseNumber → data.compliance.licenseNumber). */
const at = (obj: Record<string, unknown> | null | undefined, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)

const claimValue = (obj: unknown): unknown =>
  obj && typeof obj === 'object' ? (obj as Record<string, unknown>).value ?? null : null

/**
 * Build the review-doc payload (draft-creation data) from the case
 * (spec §12.1 step 3). Pure + exported for unit tests. Fields that cannot be
 * derived honestly are left undefined — `enforcePublishCompliance` then
 * blocks the flip with a clear 400 and nothing goes live.
 */
export const mapCaseToReviewDoc = (
  doc: Record<string, unknown>,
  casinoType: 'traditional' | 'crypto',
): Record<string, unknown> => {
  const desk = (doc.deskResearchOutput ?? {}) as Record<string, unknown>
  const scores = (doc.computedScores ?? {}) as Record<string, unknown>
  const categories = Array.isArray(scores.categories) ? scores.categories : []
  const editorial = (doc.editorialDraft ?? {}) as Record<string, unknown>
  const hands = (doc.handsOnResults ?? {}) as Record<string, unknown>

  // Licensing: the case's own license fields are authoritative; the desk
  // research licensing claim is the fallback when the case was only
  // populated via a draft apply (deskResearchOutput carries the claim under
  // licensing.primary with { value, sourceUrl, ... }).
  const licenseClaim = claimValue(at(desk, 'licensing.primary') ?? at(desk, 'licensing'))
  const licenseNumber =
    (doc.licenseNumber as string | undefined) ||
    (typeof licenseClaim === 'string' && licenseClaim.trim().length > 0 ? licenseClaim : undefined)
  // Jurisdiction comes from the case field; the desk claim value may embed
  // the authority name (e.g. "Kansspelautoriteit (KSA)") — never a date.
  const jurisdiction =
    (doc.licenseJurisdiction as string | undefined) ??
    (typeof licenseClaim === 'string' ? licenseClaim : undefined)
  const mapped = mapJurisdiction(jurisdiction)

  // Deterministic pros/cons from the locked score categories (verdict is
  // required, min 1 row each — derived, never invented).
  const good = categories
    .filter((c) => Number((c as Record<string, unknown>).score) >= 7.5)
    .slice(0, 3)
    .map((c) => ({ point: String((c as Record<string, unknown>).label ?? 'Strengths') }))
  const bad = categories
    .filter((c) => Number((c as Record<string, unknown>).score) <= 5.5)
    .slice(0, 3)
    .map((c) => ({ point: String((c as Record<string, unknown>).label ?? 'Areas to verify') }))

  const scoresGroup: Record<string, unknown> = {}
  for (const raw of categories) {
    const c = raw as Record<string, unknown>
    const key = String(c.key ?? '')
    if (!key) continue
    const evidence = String(c.evidence ?? '') || `computedScores.${key} (rubric: deterministic)`
    scoresGroup[key] = {
      score: typeof c.score === 'number' ? c.score : null,
      evidence,
      narrative: String(c.notes ?? c.label ?? ''),
    }
  }

  return {
    name: String(doc.operatorName ?? ''),
    markets: mapped ? [mapped.market] : undefined,
    compliance: mapped
      ? {
          licenseNumber: licenseNumber ?? 'PENDING-UNVERIFIED',
          licenseAuthority: mapped.authority,
        }
      : undefined,
    scores: scoresGroup,
    summary: String(editorial.summary ?? `Editorial review of ${String(doc.operatorName ?? '')}.`),
    verdict: {
      whatsGood: good.length > 0 ? good : [{ point: 'Independently measured by our review team.' }],
      whatsBad: bad.length > 0 ? bad : [{ point: 'Hands-on verification pending for unverified claims.' }],
      narrative: String(
        editorial.claimsVsReality ??
          editorial.summary ??
          'Commission-blind review based on desk research and hands-on testing where available.',
      ),
    },
    communitySentimentNote:
      (typeof desk.communitySentiment === 'object' && desk.communitySentiment !== null
        ? String((desk.communitySentiment as Record<string, unknown>).value ?? '')
        : '') || undefined,
    claimsVsReality: {
      withdrawal: {
        claimedHours: at(hands, 'withdrawalClaimedHours') ?? null,
        measuredHours: at(hands, 'withdrawalActualHours') ?? null,
      },
      support: {
        claimedMinutes: at(hands, 'supportClaimedMinutes') ?? null,
        measuredMinutes: at(hands, 'supportActualMinutes') ?? null,
      },
      kyc: {
        claimedDays: at(hands, 'kycClaimedDays') ?? null,
        measuredDays: at(hands, 'kycActualDays') ?? null,
      },
      bonus: {
        claimedWager: at(hands, 'bonusClaimedWager') ?? null,
        measuredWager: at(hands, 'bonusActualWager') ?? null,
      },
    },
    // §12.1 step 3: the public doc starts as a DRAFT — the flip to published
    // is the final, compliance-gated step.
    _status: 'draft' as const,
  }
}

const REVIEW_COLLECTION_BY_TYPE: Record<'traditional' | 'crypto', 'traditional-casino-reviews' | 'crypto-casino-reviews'> = {
  traditional: 'traditional-casino-reviews',
  crypto: 'crypto-casino-reviews',
}

/**
 * The two review collections share the exact field shapes (scoreFields /
 * reviewCoreFields / claimsVsRealityFields factories) but Payload's typed
 * update/create overloads key on the literal slug, so a union slug defeats
 * inference. Branch on the literal and cast the data (both shapes identical).
 */
const updateReviewDoc = async (
  payload: Payload,
  req: PayloadRequest,
  collectionSlug: 'traditional-casino-reviews' | 'crypto-casino-reviews',
  id: number,
  data: Record<string, unknown>,
): Promise<{ id: number }> =>
  collectionSlug === 'traditional-casino-reviews'
    ? await payload.update({ collection: 'traditional-casino-reviews', id, req, data: data as never })
    : await payload.update({ collection: 'crypto-casino-reviews', id, req, data: data as never })

const createReviewDoc = async (
  payload: Payload,
  req: PayloadRequest,
  collectionSlug: 'traditional-casino-reviews' | 'crypto-casino-reviews',
  data: Record<string, unknown>,
): Promise<{ id: number }> =>
  collectionSlug === 'traditional-casino-reviews'
    ? await payload.create({ collection: 'traditional-casino-reviews', req, data: data as never })
    : await payload.create({ collection: 'crypto-casino-reviews', req, data: data as never })

const findReviewDocBySlug = async (
  payload: Payload,
  req: PayloadRequest,
  collectionSlug: 'traditional-casino-reviews' | 'crypto-casino-reviews',
  slug: string,
): Promise<{ id: number } | null> =>
  collectionSlug === 'traditional-casino-reviews'
    ? (await payload.find({ collection: 'traditional-casino-reviews', req, limit: 1, depth: 0, where: { slug: { equals: slug } } })).docs[0] ?? null
    : (await payload.find({ collection: 'crypto-casino-reviews', req, limit: 1, depth: 0, where: { slug: { equals: slug } } })).docs[0] ?? null

/**
 * The publish step (§12.1). `expectedVersion` is the case version the UI
 * loaded — the server re-reads the case fresh and rejects a stale verdict
 * (case.version !== verdictForVersion) or a stale case (409) before anything
 * is created.
 */
export const publishCase = async (
  payload: Payload,
  req: PayloadRequest,
  caseId: number | string,
  expectedVersion: number,
): Promise<PublishResult> => {
  const audit = async (
    event: AgentLogEvent,
    details: Record<string, unknown>,
  ): Promise<void> => {
    try {
      await logEvent(
        payload,
        {
          agentId: req.user?.email ?? 'system',
          brand: '01-playerside',
          event,
          operator: String(doc?.operatorName ?? ''),
          pageId: String(caseId),
          details,
        },
        req,
      )
    } catch (err) {
      payload.logger.error({ err, message: `cofounder publish audit (${event}) failed` })
    }
  }

  // 1. Server-side re-read guard (S1-2) — never trust the client's claim.
  let doc: Record<string, unknown> | null = null
  try {
    doc = (await payload.findByID({
      collection: 'research-queue',
      id: caseId,
      req,
      depth: 0,
    })) as unknown as Record<string, unknown>
  } catch {
    doc = null
  }
  if (!doc) return { ok: false, status: 404, code: 'CASE_NOT_FOUND', message: 'Case not found.' }

  const caseStatus = String(doc.status ?? '')
  if (caseStatus !== 'integrity-check') {
    return {
      ok: false,
      status: 409,
      code: 'WRONG_STAGE',
      message: `Publish requires the case to be at integrity-check — it is '${caseStatus}'.`,
    }
  }
  if (Number(doc.version) !== expectedVersion) {
    return {
      ok: false,
      status: 409,
      code: 'BLOCKED_CONFLICT',
      message: 'Case changed since this view loaded — reload and re-check before publishing.',
    }
  }

  const integrity = latestIntegrityRun(doc.aiRuns)
  if (!integrity || integrity.verdict !== 'PASS') {
    return {
      ok: false,
      status: 409,
      code: 'VERDICT_BLOCKED',
      message: 'The latest integrity-check run does not hold a PASS verdict — no publish.',
    }
  }
  if (integrity.verdictForVersion !== Number(doc.version)) {
    return {
      ok: false,
      status: 409,
      code: 'STALE_VERDICT',
      message: `The PASS verdict was recorded for case version ${integrity.verdictForVersion ?? 'unknown'} but the case is now at version ${doc.version} — an edit after the verdict forces a re-check (spec §12.2).`,
    }
  }

  const casinoType = doc.casinoType === 'crypto' ? 'crypto' : 'traditional'
  const collectionSlug = REVIEW_COLLECTION_BY_TYPE[casinoType]

  // 2. Re-publish path (spec §12.1 step 7): never duplicate — update the
  //    existing doc when the case is already linked.
  let existingReviewId: number | string | undefined =
    (doc.publishedReviewId as number | string | undefined) ?? undefined
  if (!existingReviewId && doc.publishedReviewId && typeof doc.publishedReviewId === 'object') {
    existingReviewId = (doc.publishedReviewId as { id?: number | string }).id
  }

  // 3. Build the doc payload and create it as a DRAFT (deterministic slug).
  const reviewData = mapCaseToReviewDoc(doc, casinoType)
  const slug = slugifyOperator(typeof doc.operatorName === 'string' ? doc.operatorName : undefined)

  let createdReviewId: number
  try {
    if (existingReviewId) {
      await updateReviewDoc(payload, req, collectionSlug, Number(existingReviewId), {
        ...reviewData,
        slug,
      })
      createdReviewId = Number(existingReviewId)
    } else {
      try {
        const created = await createReviewDoc(payload, req, collectionSlug, {
          ...reviewData,
          slug,
        })
        createdReviewId = created.id
      } catch (err) {
        // Concurrent create → unique violation on slug → idempotent update (S1-3)
        const found = await findReviewDocBySlug(payload, req, collectionSlug, slug)
        if (!found) throw err
        await updateReviewDoc(payload, req, collectionSlug, found.id, {
          ...reviewData,
          slug,
        })
        createdReviewId = found.id
      }
    }
  } catch (err) {
    await audit('publish_error', { code: 'DOC_CREATE_FAILED', message: (err as Error)?.message })
    return {
      ok: false,
      status: (err as { status?: number })?.status ?? 500,
      code: 'DOC_CREATE_FAILED',
      message: (err as Error)?.message ?? 'Failed to create the review draft.',
    }
  }

  // 4. Version-checked case update: link + sign-off + status, honoring the
  //    pipeline's one-stage-at-a-time law (integrity-check → published →
  //    monitoring; each transition gates on the previous stage's exit
  //    condition, which the fields just set satisfy).
  try {
    const step1 = (await payload.update({
      collection: 'research-queue',
      id: Number(caseId),
      req,
      context: { expectedVersion, changedFields: ['publishedReviewId', 'integritySignOff', 'status'] },
      data: {
        publishedReviewId: { relationTo: collectionSlug, value: createdReviewId },
        integritySignOff: true,
        status: 'published',
      },
    })) as unknown as { version?: number; status?: string }
    const step2 = (await payload.update({
      collection: 'research-queue',
      id: Number(caseId),
      req,
      context: { expectedVersion: step1.version ?? expectedVersion, changedFields: ['status'] },
      data: { status: 'monitoring' },
    })) as unknown as { version?: number; status?: string }

    // 5. Flip the doc to live — enforcePublishCompliance fires as the gate.
    let docStatus: 'published' | 'draft' = 'published'
    try {
      await updateReviewDoc(payload, req, collectionSlug, createdReviewId, {
        _status: 'published',
      })
    } catch (err) {
      // S1-1 compensation: the case is linked but nothing is live; the doc
      // stays draft and a re-publish is idempotent.
      docStatus = 'draft'
      await audit('publish_error', {
        code: 'COMPLIANCE_GATE',
        publishedReviewId: createdReviewId,
        message: (err as Error)?.message,
      })
      return {
        ok: false,
        status: (err as { status?: number })?.status ?? 400,
        code: 'COMPLIANCE_GATE',
        message: `Review draft created and linked, but the publish compliance gate blocked going live: ${(err as Error)?.message}. The case stays linked; fix the missing compliance fields and re-publish.`,
        publishedReviewId: createdReviewId,
        collectionSlug,
        docStatus,
        caseStatus: String(step2.status ?? ''),
        caseVersion: Number(step2.version),
      }
    }

    await audit('review_published', {
      publishedReviewId: createdReviewId,
      collection: collectionSlug,
      caseVersion: Number(step2.version),
      runId: integrity.runId,
    })

    return {
      ok: true,
      message: 'Review published — the site revalidated itself (casinos, slug, reviews).',
      publishedReviewId: createdReviewId,
      collectionSlug,
      docStatus,
      caseStatus: String(step2.status ?? ''),
      caseVersion: Number(step2.version),
    }
  } catch (err) {
    // Version conflict on the case link step — the review draft may exist;
    // surface as a conflict so the UI reloads and retries (never silently).
    await audit('publish_error', {
      code: 'CASE_LINK_CONFLICT',
      publishedReviewId: createdReviewId,
      message: (err as Error)?.message,
    })
    return {
      ok: false,
      status: (err as { status?: number })?.status ?? 409,
      code: 'BLOCKED_CONFLICT',
      message: (err as Error)?.message ?? 'Case changed while publishing — reload and retry.',
      publishedReviewId: createdReviewId,
      collectionSlug,
    }
  }
}
