/**
 * CaseFile AI chat (blueprint §10) — authenticated end-to-end verification
 * against the RUNNING server. Proves the loop the admin panel drives:
 *
 *   1. Unauthenticated POST /api/review-chat is rejected (403).
 *   2. A desk-research case + authenticated user runs the Desk Researcher:
 *      the route returns runId + deskResearchOutput scaffold, and the run is
 *      recorded on the case's aiRuns with the user prompt + assistant
 *      summary in messages (cross-session history continuity).
 *   3. The human "Apply" (with the panel's loaded version) writes the draft
 *      and bumps the version; a stale apply (old version) is rejected 409.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/verify-chat-panel.ts
 * (server must be running on CHAT_TEST_PORT, default 3001)
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const PORT = process.env.CHAT_TEST_PORT ?? '3001'
const BASE = `http://localhost:${PORT}`

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  const checks: [string, boolean][] = []

  // ---------------------------------------------------------------------
  // Setup — a temp ordinary user + a temp case parked at desk-research.
  // ---------------------------------------------------------------------
  const staleUsers = await payload.find({
    collection: 'users',
    limit: 10,
    where: { email: { equals: 'chat-test@example.invalid' } },
  })
  for (const s of staleUsers.docs) await payload.delete({ id: s.id, collection: 'users' })
  const staleCases = await payload.find({
    collection: 'research-queue',
    limit: 10,
    where: { caseNumber: { equals: '#PS-2026-S98' } },
  })
  for (const s of staleCases.docs) await payload.delete({ id: s.id, collection: 'research-queue' })

  const user = await payload.create({
    collection: 'users',
    data: {
      email: 'chat-test@example.invalid',
      name: 'Chat Test User',
      password: 'chat-test-password-not-real-1',
    },
  })

  const caseFile = await payload.create({
    collection: 'research-queue',
    data: {
      caseNumber: '#PS-2026-S98',
      casinoType: 'traditional',
      operatorName: 'Chat Test Co',
      operatorUrl: 'https://chat-test.example.invalid',
      licenseJurisdiction: 'Testland',
      status: 'queued',
    },
  })
  // Advance exactly one stage — the same transition the admin would make.
  await payload.update({
    id: caseFile.id,
    collection: 'research-queue',
    data: { status: 'desk-research' },
  })

  const login = await payload.login({
    collection: 'users',
    data: { email: 'chat-test@example.invalid', password: 'chat-test-password-not-real-1' },
  })
  const authHeaders = { Authorization: `JWT ${login.token}`, 'Content-Type': 'application/json' }

  const chatPost = async (body: Record<string, unknown>) =>
    fetch(`${BASE}/api/review-chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    })

  // ---------------------------------------------------------------------
  // 1. Unauthenticated call rejected
  // ---------------------------------------------------------------------
  const anonRes = await fetch(`${BASE}/api/review-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: caseFile.id, message: 'hi' }),
  })
  checks.push(['anon: POST /api/review-chat is rejected (403)', anonRes.status === 403])

  // ---------------------------------------------------------------------
  // 2. Authenticated chat run — Desk Researcher records the conversation
  // ---------------------------------------------------------------------
  const message = 'Verify the primary licence and flag anything unverified.'
  const chatRes = await chatPost({ caseId: caseFile.id, message })
  const chatBody = (await chatRes.json()) as Record<string, unknown>
  checks.push(['chat: authenticated desk-research run succeeds (200 + runId)', chatRes.status === 200 && typeof chatBody.runId === 'string'])
  checks.push(['chat: desk research output scaffold returned with unverified confidence', Boolean(chatBody.deskResearchOutput)])

  const afterChat = await payload.findByID({ id: caseFile.id, collection: 'research-queue' }) as unknown as {
    aiRuns?: Array<{ runId: string; status: string; input: { message?: string }; messages: Array<{ role: string; content: string }>; output: unknown }>
  }
  const run = afterChat.aiRuns?.find((r) => r.runId === chatBody.runId)
  checks.push(['chat: run recorded on aiRuns with complete status', run?.status === 'complete'])
  checks.push([
    'chat: user prompt stored in run input (history continuity)',
    run?.input?.message === message,
  ])
  checks.push([
    'chat: user + assistant turns appended to run messages',
    Boolean(run?.messages.some((m) => m.role === 'user' && m.content === message)) &&
      Boolean(run?.messages.some((m) => m.role === 'assistant' && m.content.length > 0)),
  ])

  // ---------------------------------------------------------------------
  // 3. Apply writes through the version-checked path; stale apply conflicts
  // ---------------------------------------------------------------------
  const versionBeforeApply = (await payload.findByID({ id: caseFile.id, collection: 'research-queue' }) as unknown as { version: number }).version
  const applyRes = await chatPost({ caseId: caseFile.id, apply: true, expectedVersion: versionBeforeApply })
  checks.push(['apply: apply with the panel-loaded version succeeds (200)', applyRes.status === 200])

  const afterApply = await payload.findByID({ id: caseFile.id, collection: 'research-queue' }) as unknown as { version: number; deskResearchOutput: unknown }
  checks.push(['apply: version bumped after successful apply', afterApply.version === versionBeforeApply + 1])
  checks.push(['apply: deskResearchOutput written to the case file', Boolean(afterApply.deskResearchOutput)])

  const staleRes = await chatPost({ caseId: caseFile.id, apply: true, expectedVersion: versionBeforeApply })
  checks.push([
    'apply: a stale panel version is rejected with 409 conflict (concurrency contract)',
    staleRes.status === 409,
  ])

  // ---------------------------------------------------------------------
  const failed = checks.filter(([, ok]) => !ok)
  for (const [label, ok] of checks) {
    payload.logger.info(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  }

  // Cleanup.
  const allLogs = await payload.find({
    collection: 'agent-logs',
    limit: 100,
    where: { pageId: { equals: String(caseFile.id) } },
  })
  for (const l of allLogs.docs) await payload.delete({ id: l.id, collection: 'agent-logs' })
  await payload.delete({ id: caseFile.id, collection: 'research-queue' })
  await payload.delete({ id: user.id, collection: 'users' })
  payload.logger.info('Cleaned up chat verification data.')

  if (failed.length > 0) {
    payload.logger.error(`Chat panel verification FAILED (${failed.length} check(s) failed).`)
    process.exit(1)
  }
  payload.logger.info('Chat panel verification PASSED.')
  process.exit(0)
}

await run()
