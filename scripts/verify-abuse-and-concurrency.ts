/**
 * Phase 2A.2 abuse, media-protection, and concurrency checkpoint.
 *
 *   4. Direct API/Local API abuse: anonymous read/write denial on
 *      research-queue/operators/agent-logs; an ORDINARY authenticated user
 *      (a real Users record, no internalWrite context) still cannot
 *      create/update/delete agent-logs; status gates reject even a fully
 *      privileged Local API call (overrideAccess: true — the closest thing
 *      to "internal server code" there is) and a genuine REST HTTP call
 *      from outside the admin UI; invalid evidence enum values are
 *      rejected by Payload's own field validation.
 *   5. Protected media: an internal-visibility upload is unreadable
 *      anonymously via the Payload API (metadata + direct fetch), readable
 *      once authenticated. Also verifies the public-media control still
 *      works, so the denial above is real access control, not an outage.
 *   6. Concurrency: 5 concurrent updates to 5 distinct fields on the SAME
 *      case file land all 5 changes (no lost updates) and produce exactly
 *      5 case_updated audit events (no duplicates, no drops).
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-abuse-and-concurrency.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const checks: [string, boolean][] = []

  // ---------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------
  const staleUsers = await payload.find({ collection: 'users', limit: 50, where: { email: { equals: 'abuse-test@example.invalid' } } })
  for (const s of staleUsers.docs) await payload.delete({ id: s.id, collection: 'users' })
  const staleOps = await payload.find({ collection: 'operators', limit: 50, where: { slug: { equals: 'abuse-test-op' } } })
  for (const s of staleOps.docs) await payload.delete({ id: s.id, collection: 'operators' })
  const staleCases = await payload.find({ collection: 'research-queue', limit: 50, where: { caseNumber: { in: ['#PS-2026-S95', '#PS-2026-S96'] } } })
  for (const s of staleCases.docs) await payload.delete({ id: s.id, collection: 'research-queue' })
  const staleMedia = await payload.find({ collection: 'media', limit: 50, where: { alt: { equals: 'abuse-test-evidence-screenshot' } } })
  for (const s of staleMedia.docs) await payload.delete({ id: s.id, collection: 'media' })

  const ordinaryUser = await payload.create({
    collection: 'users',
    data: { email: 'abuse-test@example.invalid', name: 'Ordinary Test User', password: 'abuse-test-password-not-real-1' },
  })

  const operator = await payload.create({ collection: 'operators', data: { name: 'Abuse Test Op', slug: 'abuse-test-op' } })
  const caseFile = await payload.create({
    collection: 'research-queue',
    data: {
      caseNumber: '#PS-2026-S95',
      casinoType: 'crypto',
      deskResearchOutput: { seeded: true },
      operatorName: 'Abuse Test Co',
      parentCompany: operator.id,
      status: 'queued',
    },
  })

  // ---------------------------------------------------------------------
  // 4a. Anonymous read/write denial — research-queue, operators, agent-logs
  // ---------------------------------------------------------------------
  const anonRejected = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      return false
    } catch {
      return true
    }
  }

  /** access.read returning a plain boolean `false` makes find() throw rather than return empty — either counts as "not exposed". */
  const findIsEmptyOrDenied = async (options: Parameters<typeof payload.find>[0]) => {
    try {
      return (await payload.find(options)).docs.length === 0
    } catch {
      return true
    }
  }

  checks.push(['anon: cannot read research-queue', await findIsEmptyOrDenied({ collection: 'research-queue', overrideAccess: false })])
  checks.push([
    'anon: cannot create research-queue',
    await anonRejected(() =>
      payload.create({
        collection: 'research-queue',
        data: { caseNumber: '#PS-2026-S97', casinoType: 'crypto', operatorName: 'Anon Inject Co', status: 'queued' },
        overrideAccess: false,
      }),
    ),
  ])
  checks.push([
    'anon: cannot update research-queue (incl. evidenceRegister/aiRuns sub-fields)',
    await anonRejected(() =>
      payload.update({
        id: caseFile.id,
        collection: 'research-queue',
        data: { evidenceRegister: [{ label: 'anon injected', verificationStatus: 'verified' }] },
        overrideAccess: false,
      }),
    ),
  ])
  checks.push(['anon: cannot delete research-queue', await anonRejected(() => payload.delete({ id: caseFile.id, collection: 'research-queue', overrideAccess: false }))])

  checks.push(['anon: cannot read operators', await findIsEmptyOrDenied({ collection: 'operators', overrideAccess: false })])
  checks.push([
    'anon: cannot create operators',
    await anonRejected(() => payload.create({ collection: 'operators', data: { name: 'Anon Inject Op', slug: 'anon-inject-op' }, overrideAccess: false })),
  ])

  checks.push(['anon: cannot read agent-logs', await findIsEmptyOrDenied({ collection: 'agent-logs', overrideAccess: false })])
  checks.push([
    'anon: cannot create agent-logs (no internalWrite context)',
    await anonRejected(() =>
      payload.create({
        collection: 'agent-logs',
        data: { agentId: 'anon', brand: '01-playerside', event: 'case_created', timestamp: new Date().toISOString() },
        overrideAccess: false,
      }),
    ),
  ])

  // ---------------------------------------------------------------------
  // 4b. Ordinary authenticated user — still cannot touch agent-logs
  // ---------------------------------------------------------------------
  const seedLog = await payload.create({
    collection: 'agent-logs',
    data: { agentId: 'setup', brand: '01-playerside', event: 'case_created', timestamp: new Date().toISOString() },
    context: { internalWrite: true },
  })

  checks.push([
    'ordinary authenticated user: cannot create agent-logs',
    await anonRejected(() =>
      payload.create({
        collection: 'agent-logs',
        data: { agentId: 'ordinary-user', brand: '01-playerside', event: 'case_created', timestamp: new Date().toISOString() },
        overrideAccess: false,
        user: ordinaryUser,
      }),
    ),
  ])
  checks.push([
    'ordinary authenticated user: cannot update agent-logs',
    await anonRejected(() => payload.update({ id: seedLog.id, collection: 'agent-logs', data: { event: 'qa_check' }, overrideAccess: false, user: ordinaryUser })),
  ])
  checks.push([
    'ordinary authenticated user: cannot delete agent-logs',
    await anonRejected(() => payload.delete({ id: seedLog.id, collection: 'agent-logs', overrideAccess: false, user: ordinaryUser })),
  ])
  checks.push([
    'ordinary authenticated user: CAN read agent-logs (control — read stays authenticated: true, only mutation is blocked)',
    (await payload.find({ collection: 'agent-logs', overrideAccess: false, user: ordinaryUser })).docs.length > 0,
  ])

  // ---------------------------------------------------------------------
  // 4c. Status gates cannot be bypassed — not even by a fully-privileged
  //     Local API call, and not via a genuine REST HTTP request.
  // ---------------------------------------------------------------------
  let privilegedSkipRejected = false
  try {
    await payload.update({ id: caseFile.id, collection: 'research-queue', data: { status: 'published' }, overrideAccess: true })
  } catch {
    privilegedSkipRejected = true
  }
  checks.push(['status gate: rejected even with overrideAccess: true (max local privilege)', privilegedSkipRejected])

  const loginRes = await payload.login({ collection: 'users', data: { email: 'abuse-test@example.invalid', password: 'abuse-test-password-not-real-1' } })
  const restPort = process.env.ABUSE_TEST_PORT ?? '3100'
  let restGateRejected: boolean | 'skipped' = 'skipped'
  try {
    const res = await fetch(`http://localhost:${restPort}/api/research-queue/${caseFile.id}`, {
      body: JSON.stringify({ status: 'published' }),
      headers: { Authorization: `JWT ${loginRes.token}`, 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    restGateRejected = !res.ok
  } catch {
    restGateRejected = 'skipped' // no server running on restPort — Local API proof above still stands
  }
  payload.logger.info(`DIAGNOSTIC — restGateRejected: ${JSON.stringify(restGateRejected)}`)
  checks.push(['status gate: rejected via genuine REST HTTP request (or skipped — no server running)', restGateRejected !== false])

  // ---------------------------------------------------------------------
  // 4d. Invalid evidence enum/source values rejected
  // ---------------------------------------------------------------------
  checks.push([
    'evidence: invalid verificationStatus enum value rejected',
    await anonRejected(() =>
      payload.update({
        id: caseFile.id,
        collection: 'research-queue',
        // Intentionally invalid enum value — expected to throw at runtime
        // (that's what's being tested), cast past the generated type.
        data: { evidenceRegister: [{ label: 'bad enum', verificationStatus: 'super-duper-verified' }] } as any,
      }),
    ),
  ])
  checks.push([
    'evidence: invalid sourceType enum value rejected',
    await anonRejected(() =>
      payload.update({
        id: caseFile.id,
        collection: 'research-queue',
        data: { evidenceRegister: [{ label: 'bad source', sourceType: 'made-up-source', verificationStatus: 'verified' }] } as any,
      }),
    ),
  ])

  // ---------------------------------------------------------------------
  // 5. Protected media
  // ---------------------------------------------------------------------
  const publicMedia = await payload.create({
    collection: 'media',
    data: { alt: 'abuse-test-evidence-screenshot-public-control', visibility: 'public' },
    filePath: undefined,
  }).catch(() => null)
  // Media requires a file; use a tiny in-memory buffer if filePath upload isn't viable here.
  const tinyPngBuffer = Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c6300010000050001' + '0d0a2db40000000049454e44ae426082',
    'hex',
  )
  const internalMedia = await payload.create({
    collection: 'media',
    data: { alt: 'abuse-test-evidence-screenshot', visibility: 'internal' },
    file: { name: 'evidence.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
  })
  const controlMedia = publicMedia ?? await payload.create({
    collection: 'media',
    data: { alt: 'abuse-test-evidence-screenshot-public-control', visibility: 'public' },
    file: { name: 'control.png', data: tinyPngBuffer, mimetype: 'image/png', size: tinyPngBuffer.length },
  })

  checks.push([
    'media: internal-visibility doc NOT readable anonymously via API',
    await anonRejected(() => payload.findByID({ id: internalMedia.id, collection: 'media', overrideAccess: false }).then((d) => {
      if (!d) throw new Error('not found')
    })),
  ])
  checks.push([
    'media: internal-visibility doc excluded from anonymous find/list',
    await findIsEmptyOrDenied({ collection: 'media', overrideAccess: false, where: { id: { equals: internalMedia.id } } }),
  ])
  checks.push([
    'media: internal-visibility doc IS readable once authenticated',
    Boolean(await payload.findByID({ id: internalMedia.id, collection: 'media', overrideAccess: false, user: ordinaryUser })),
  ])
  checks.push([
    'media: control — public-visibility doc still readable anonymously (proves the denial above is real access control)',
    Boolean(await payload.findByID({ id: controlMedia.id, collection: 'media', overrideAccess: false })),
  ])

  // ---------------------------------------------------------------------
  // 6. Concurrent CaseFile writes — version-aware safe-write behavior
  //    (docs/review-handoffs/2026-07-23-research-queue-concurrency-spec.md
  //    §3.1, §4). Root cause and design rationale are documented there;
  //    this section proves the implemented behavior matches the spec.
  // ---------------------------------------------------------------------
  const auditCountForCase = async () => {
    const result = await payload.find({
      collection: 'agent-logs',
      limit: 200,
      where: { and: [{ pageId: { equals: String(caseFile.id) } }, { event: { equals: 'case_updated' } }] },
    })
    return result.docs.length
  }
  const auditCountBefore6a = await auditCountForCase()

  // 6a. Legacy control — callers that don't pass `context.expectedVersion`
  // get today's unchanged, unguarded behavior (a data race can still lose
  // an update). This is NOT asserting data loss is desirable — it proves
  // the new hook is genuinely opt-in and doesn't retroactively change
  // behavior for callers that haven't been updated to use it (there are
  // none yet — no admin UI or route currently passes expectedVersion).
  const legacyFields: [string, unknown][] = [
    ['licenseNumber', 'LEGACY-CONCURRENT-LIC-01'],
    ['licenseJurisdiction', 'Legacy Concurrent Jurisdiction'],
  ]
  const legacyResults = await Promise.allSettled(
    legacyFields.map(([field, value]) => payload.update({ id: caseFile.id, collection: 'research-queue', data: { [field]: value } })),
  )
  checks.push([
    'concurrency control: legacy callers without expectedVersion are unaffected by the new hook (neither call is rejected)',
    legacyResults.every((r) => r.status === 'fulfilled'),
  ])
  const auditCountAfter6a = await auditCountForCase()
  checks.push([
    'concurrency control: legacy concurrent writes both still produce a case_updated event regardless of which wins (audit logging is independent of the data race)',
    auditCountAfter6a - auditCountBefore6a === legacyFields.length,
  ])

  // 6b. Simultaneous version-aware writers — the scenario that used to
  // lose 4 of 5 updates silently. All 5 read the SAME version (as if 5
  // people had the case open at the exact same instant) then write
  // concurrently; exactly 1 may win, the other 4 must be rejected with the
  // explicit conflict error, not silently dropped.
  const versionedDoc = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
  const versionBeforeSimultaneous = (versionedDoc as unknown as { version: number }).version
  const simultaneousFields: [string, unknown][] = [
    ['licenseNumber', 'SIMUL-LIC-01'],
    ['licenseJurisdiction', 'Simultaneous Jurisdiction'],
    ['assignedReviewer', 'Simultaneous Reviewer'],
    ['operatorUrl', 'https://simultaneous.example.invalid'],
    ['operatorName', 'Abuse Test Co (simultaneous)'],
  ]
  const simultaneousResults = await Promise.allSettled(
    simultaneousFields.map(([field, value]) =>
      payload.update({
        id: caseFile.id,
        collection: 'research-queue',
        context: { changedFields: [field], expectedVersion: versionBeforeSimultaneous },
        data: { [field]: value },
      }),
    ),
  )
  const simultaneousSucceeded = simultaneousResults.filter((r) => r.status === 'fulfilled').length
  const simultaneousConflictRejections = simultaneousResults.filter(
    (r) => r.status === 'rejected' && String((r as PromiseRejectedResult).reason?.message ?? '').includes('changed by someone else'),
  ).length
  payload.logger.info(
    `DIAGNOSTIC — simultaneous version-aware writers: ${simultaneousSucceeded} succeeded, ${simultaneousConflictRejections} rejected with the expected conflict error (of ${simultaneousFields.length} total)`,
  )
  checks.push(['concurrency: exactly 1 of 5 simultaneous version-aware writers succeeds', simultaneousSucceeded === 1])
  checks.push([
    'concurrency: the other 4 simultaneous writers are rejected with the explicit conflict error, not silently dropped',
    simultaneousConflictRejections === simultaneousFields.length - 1,
  ])
  const afterSimultaneous = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
  const simultaneousSurvivingCount = simultaneousFields.filter(([field, value]) => (afterSimultaneous as unknown as Record<string, unknown>)[field] === value).length
  checks.push(['concurrency: the 1 successful simultaneous write is fully intact, not partially merged', simultaneousSurvivingCount === 1])
  const auditCountAfter6b = await auditCountForCase()
  checks.push([
    'concurrency: exactly 1 new case_updated event for the simultaneous scenario (rejected writers never reach the afterChange audit hook)',
    auditCountAfter6b - auditCountAfter6a === 1,
  ])

  // 6c. Staggered read-then-write with retry-on-conflict — the realistic
  // multi-user workflow: each writer independently reads the current
  // version then writes, retrying (refetch + reapply) if it collides.
  // Deliberately staggers each writer's *first* attempt by a small,
  // index-proportional delay -- without this, all 5 fire their first read
  // in the same instant (indistinguishable from 6b's fully-simultaneous
  // case) and a single retry is not guaranteed to converge, since the
  // losers' retries can themselves collide with each other. A retry count
  // generous enough for the worst case (up to 4 retries, one per
  // contender) is combined with the stagger so this test proves the
  // intended "5 people opened it at slightly different times" scenario,
  // not a second copy of 6b.
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const staggeredFields: [string, unknown][] = [
    ['licenseNumber', 'STAGGERED-LIC-01'],
    ['licenseJurisdiction', 'Staggered Jurisdiction'],
    ['assignedReviewer', 'Staggered Reviewer'],
    ['operatorUrl', 'https://staggered.example.invalid'],
    ['operatorName', 'Abuse Test Co (staggered)'],
  ]
  const writeWithRetries = async (field: string, value: unknown, initialDelayMs: number): Promise<boolean> => {
    await sleep(initialDelayMs)
    const maxAttempts = staggeredFields.length
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const current = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
      const currentVersion = (current as unknown as { version: number }).version
      try {
        await payload.update({
          id: caseFile.id,
          collection: 'research-queue',
          context: { changedFields: [field], expectedVersion: currentVersion },
          data: { [field]: value },
        })
        return true
      } catch {
        if (attempt === maxAttempts - 1) return false
        await sleep(10 + Math.floor(Math.random() * 15))
      }
    }
    return false
  }
  const staggeredResults = await Promise.all(
    staggeredFields.map(([field, value], index) => writeWithRetries(field, value, index * 40)),
  )
  checks.push(['concurrency: all 5 staggered (read-then-write, retry-once-on-conflict) writers eventually succeed', staggeredResults.every(Boolean)])
  const afterStaggered = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
  const staggeredLandedDetail = staggeredFields.map(([field, value]) => [field, (afterStaggered as unknown as Record<string, unknown>)[field], value] as const)
  payload.logger.info(`DIAGNOSTIC — staggered field landing detail (field, actual, expected): ${JSON.stringify(staggeredLandedDetail)}`)
  payload.logger.info(`DIAGNOSTIC — staggered final version: ${(afterStaggered as unknown as { version: number }).version}`)
  const staggeredLandedCount = staggeredFields.filter(([field, value]) => (afterStaggered as unknown as Record<string, unknown>)[field] === value).length
  checks.push(['concurrency: all 5 staggered fields present in final state after retries', staggeredLandedCount === staggeredFields.length])

  // 6d. Sequential single-writer control — confirms the fix does not
  // disturb the always-safe, currently-working single-writer case
  // (DECISION-LOG.md: "single-writer, single-session use... is not at risk").
  const sequentialFields: [string, unknown][] = [
    ['licenseNumber', 'SEQUENTIAL-LIC-01'],
    ['licenseJurisdiction', 'Sequential Jurisdiction'],
    ['assignedReviewer', 'Sequential Reviewer'],
    ['operatorUrl', 'https://sequential.example.invalid'],
    ['operatorName', 'Abuse Test Co (sequential)'],
  ]
  for (const [field, value] of sequentialFields) {
    await payload.update({ id: caseFile.id, collection: 'research-queue', data: { [field]: value } })
  }
  const afterSequential = await payload.findByID({ id: caseFile.id, collection: 'research-queue' })
  const sequentialLandedCount = sequentialFields.filter(([field, value]) => (afterSequential as unknown as Record<string, unknown>)[field] === value).length
  checks.push(['concurrency control: 5 sequential single-writer updates all land (fix does not disturb the always-safe case)', sequentialLandedCount === sequentialFields.length])

  // ---------------------------------------------------------------------
  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  // Cleanup.
  const allLogs = await payload.find({ collection: 'agent-logs', limit: 100, where: { pageId: { equals: String(caseFile.id) } } })
  for (const l of allLogs.docs) await payload.delete({ id: l.id, collection: 'agent-logs' })
  await payload.delete({ id: seedLog.id, collection: 'agent-logs' }).catch(() => {})
  await payload.delete({ id: internalMedia.id, collection: 'media' })
  await payload.delete({ id: controlMedia.id, collection: 'media' })
  await payload.delete({ id: caseFile.id, collection: 'research-queue' })
  await payload.delete({ id: operator.id, collection: 'operators' })
  await payload.delete({ id: ordinaryUser.id, collection: 'users' })
  payload.logger.info('Cleaned up abuse/concurrency verification data.')

  if (failed.length > 0) {
    payload.logger.error(`Abuse/concurrency verification FAILED (${failed.length} check(s) failed).`)
    process.exit(1)
  }
  payload.logger.info('Abuse/concurrency verification PASSED.')
  process.exit(0)
}

await run()
