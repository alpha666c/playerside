import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import {
  buildCofounderPrompt,
  checkBannedPhrases,
  COFOUNDER_MAX_TOKENS,
  COFOUNDER_TEMPERATURE,
  rgNote,
} from '@/lib/cofounder/promptBundle'
import { cofounderTools, createTicketWithRetry, executeCofounderTool, type TicketSessionType } from '@/lib/cofounder/tools'
import { chatLlm, type LlmMessage } from '@/lib/reviewChat/llm'
import type { CofounderSession } from '@/payload-types'

export const maxDuration = 240

/**
 * Phase G (G.3) — the Cofounder chat endpoint (spec §3.1), admin-only.
 *
 * `POST /api/cofounder` — `{ ticketId?, message, action?: 'resume' | 'create' }`
 *
 * Flow: auth → resolve/create the ticket (§3.1 #2) → build the system-prompt
 * bundle (§6) → run the model with tools (§4, max 4 iterations, wall-clock
 * budget ~190s per QA S1-3) → record user+assistant turns on the ticket
 * `thread` (optimistic-version write, §2) → run the banned-phrase output gate
 * (§6.1) → stream the reply back as chunked SSE (`{"delta"}` … `{"done":true,
 * …}` — the same client contract `streamLlm` uses).
 *
 * Streaming note (DECISION-LOG 2026-08-09): the tool loop runs non-streaming
 * (`chatLlm`) because `streamLlm`'s SSE parser can't relay tool-call deltas;
 * the final answer is then streamed to the client from the computed reply
 * rather than re-generating it from the provider (re-generation would double
 * spend on every turn). The wire contract is unchanged, so the G.4 panel is
 * unaffected.
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })
  const req = await createLocalReq({ user }, payload)

  let body: { ticketId?: string | number; message?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return new Response('message is required.', { status: 400 })
  if (message.length > 4000) {
    return new Response('Message too long (max 4000 characters).', { status: 400 })
  }

  const startedAt = Date.now()
  let activeTicketId: number | null = null
  let userTurnRecorded = false
  try {
    // 1. Resolve or create the ticket (§3.1 #2) — never trust client state.
    const resolved = await resolveTicket(payload, req, body, message)
    if (!resolved.ticket) return new Response('Ticket not found.', { status: 404 })
    const ticket = resolved.ticket
    activeTicketId = ticket.id

    // 2. Record the USER turn FIRST (reviewer S3 — continuity): even when the
    // assistant call fails, the ticket thread keeps the user's message so a
    // later "pick up where we left off" has the full trace.
    await appendThreadTurns(payload, req, ticket.id, [
      { role: 'user', content: message, timestamp: new Date().toISOString() },
    ])
    userTurnRecorded = true

    // 3. Build the prompt bundle from the ticket's current thread (§6).
    const messages = buildCofounderPrompt({
      userMessage: message,
      thread: ticket.thread ?? undefined,
      ticket,
    })

    // 4. Tool loop — max 4 iterations, hard wall-clock budget (QA S1-3).
    const toolHistory: LlmMessage[] = []
    const toolEvents: Array<{
      name: string
      args: Record<string, unknown>
      ok: boolean
      output: unknown
    }> = []
    let finalContent: string | null = null
    let finalModel = 'unknown'
    let partial = false
    let loopCapped = false

    for (let iter = 0; iter < MAX_TOOL_ITERS; iter++) {
      if (Date.now() - startedAt > WALL_CLOCK_MS) {
        partial = true
        break
      }
      const res = await chatLlm(payload, req, [...messages, ...toolHistory], {
        agentRole: 'cofounder',
        tools: cofounderTools,
        temperature: COFOUNDER_TEMPERATURE,
        maxTokens: COFOUNDER_MAX_TOKENS,
      })
      finalModel = res.model
      if (res.toolCalls.length === 0) {
        finalContent = res.content
        break
      }
      toolHistory.push({ role: 'assistant', content: null, toolCalls: res.toolCalls })
      for (const tc of res.toolCalls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.arguments)
        } catch {
          args = {}
        }
        const toolRes = await executeCofounderTool(payload, req, tc.name, args, {
          ticketId: ticket.id,
          // Reviewer S2 (G.5): pass the remaining wall-clock budget so the
          // run_pipeline_agent tool can refuse to start an agent run it cannot
          // finish inside the turn's 190s cap.
          budgetRemainingMs: WALL_CLOCK_MS - (Date.now() - startedAt),
        })
        toolEvents.push({ name: tc.name, args, ok: toolRes.ok, output: toolRes.output })
        toolHistory.push({
          role: 'tool',
          content:
            typeof toolRes.output === 'string' ? toolRes.output : JSON.stringify(toolRes.output),
          toolCallId: tc.id,
        })
      }
    }
    if (finalContent === null && !partial) loopCapped = true
    if (finalContent === null) {
      finalContent = partial
        ? 'Partial answer — I ran out of time mid-turn; here is what I have so far. Say "continue" and I will pick up where I left off.'
        : loopCapped
          ? 'I kept requesting tools without producing an answer and hit the loop cap. The ticket and plan are up to date — tell me to continue and I will pick up from here.'
          : '(No answer generated.)'
    }

    // 5. Output gate (§6.1): banned phrases trigger the RG aside + a flag.
    const banned = checkBannedPhrases(finalContent)
    const note = banned.length > 0 ? rgNote() : null
    const reply = banned.length > 0 ? `${finalContent}\n\n${note}` : finalContent

    // 6. Record the assistant turn (the user turn was recorded in step 2).
    const updated = await appendThreadTurns(payload, req, ticket.id, [
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ])

    // 7. Stream the reply back (chunked SSE — same contract as streamLlm).
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (obj: unknown): void => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        }
        try {
          const CHUNK = 120
          for (let i = 0; i < reply.length; i += CHUNK) {
            emit({ delta: reply.slice(i, i + CHUNK) })
            await new Promise((r) => setTimeout(r, 18))
          }
          emit({
            done: true,
            ticket: {
              id: ticket.id,
              ticketNumber: (updated as { ticketNumber?: string })?.ticketNumber ?? ticket.ticketNumber,
              status: (updated as { status?: string })?.status ?? ticket.status,
              reused: resolved.reused,
            },
            toolEvents,
            outputGate: { hits: banned, note },
            partial,
            loopCapped,
            model: finalModel,
          })
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e: unknown) {
    payload.logger.error({ err: e, message: 'cofounder chat error' })
    // Reviewer S3 — leave a trace of the failed attempt on the ticket thread
    // (only when the user turn was recorded and no assistant reply landed).
    if (userTurnRecorded && activeTicketId) {
      await appendThreadTurns(payload, req, activeTicketId, [
        {
          role: 'system',
          content: `Assistant call failed mid-turn: ${(e as Error)?.message ?? 'unknown error'}. The user's message above is recorded for continuity.`,
          timestamp: new Date().toISOString(),
        },
      ]).catch(() => {
        /* best-effort — never mask the original error */
      })
    }
    const status =
      typeof (e as { status?: unknown })?.status === 'number' &&
      (e as { status: number }).status >= 400 &&
      (e as { status: number }).status < 600
        ? (e as { status: number }).status
        : 500
    return new Response((e as Error)?.message ?? 'Internal error', { status })
  }
}

const MAX_TOOL_ITERS = 4
/** QA S1-3 — total wall-clock budget inside the route, below the platform ceiling. */
const WALL_CLOCK_MS = 190_000

/**
 * Read-guard-write thread append (optimistic-version contract, one 409
 * retry). The tools may advance `version` between the read and the write, so
 * the write guards the freshly-read version; fields outside `thread` /
 * `lastActiveAt` are rebased by the hook.
 */
const appendThreadTurns = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  ticketId: number,
  turns: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }>,
): Promise<CofounderSession> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const fresh = await payload.findByID({
      collection: 'cofounder-sessions',
      id: ticketId,
      req,
      depth: 0,
    })
    const thread: NonNullable<CofounderSession['thread']> = [
      ...((fresh.thread ?? []) as NonNullable<CofounderSession['thread']>),
      ...turns,
    ]
    try {
      return await payload.update({
        id: ticketId,
        collection: 'cofounder-sessions',
        req,
        context: { expectedVersion: fresh.version ?? 1, changedFields: ['thread', 'lastActiveAt'] },
        data: { thread },
      })
    } catch (err) {
      const status = (err as { status?: unknown })?.status
      if (status !== 409 || attempt === 1) throw err
      payload.logger.warn(`cofounder: thread write 409 on attempt ${attempt + 1} — retrying with a fresh version.`)
    }
  }
  throw new Error('unreachable: appendThreadTurns retry loop exhausted')
}

const todayStartIso = (): string => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/**
 * Lightweight sessionType detection (spec §3.1 #2) — drives ticket reuse.
 * sessionType only has review-run / research-brief / ops; bonus intent is a
 * plan-item KIND (no-deposit-bonus), so a bonus run is still a review-run.
 */
const detectSessionType = (message: string): TicketSessionType => {
  const m = message.toLowerCase()
  if (/research|investigate|trending|reddit|askgambler|casinoguru|sources/.test(m)) return 'research-brief'
  return 'review-run'
}

const titleFromMessage = (message: string): string => {
  const sentence = message.split(/(?<=[.!?])\s+/)[0] ?? message
  return sentence.slice(0, 80)
}

interface ResolveResult {
  ticket: CofounderSession | null
  reused: boolean
}

/**
 * §3.1 #2 — reuse today's open/active ticket ONLY when its sessionType matches
 * the detected intent; otherwise create a fresh ticket (QA S2-2). An explicit
 * ticketId always resumes that ticket. `action: 'create'` always creates.
 */
async function resolveTicket(
  payload: Awaited<ReturnType<typeof getPayload>>,
  req: Awaited<ReturnType<typeof createLocalReq>>,
  body: { ticketId?: string | number; action?: string },
  message: string,
): Promise<ResolveResult> {
  if (body.ticketId) {
    const doc = await payload.findByID({
      collection: 'cofounder-sessions',
      id: Number(body.ticketId),
      req,
      depth: 0,
    })
    if (!doc) return { ticket: null, reused: false }
    const active = await payload.update({
      id: doc.id,
      collection: 'cofounder-sessions',
      req,
      context: { expectedVersion: doc.version ?? 1, changedFields: ['status'] },
      data: { status: 'active' },
    })
    return { ticket: active, reused: true }
  }

  const detected = detectSessionType(message)
  if (body.action !== 'create') {
    const today = await payload.find({
      collection: 'cofounder-sessions',
      req,
      limit: 10,
      depth: 0,
      sort: '-lastActiveAt',
      where: {
        and: [
          { createdAt: { greater_than_equal: todayStartIso() } },
          { status: { in: ['open', 'active', 'paused'] } },
        ],
      },
    })
    const candidates = today.docs.filter((t) => t.sessionType === detected)
    // Prefer a ticket owned by THIS admin (reviewer S3 — never inherit another
    // admin's session when multiple match); fall back to any matching ticket.
    const match = candidates.find((t) => t.createdBy === req.user?.id) ?? candidates[0]
    if (match) return { ticket: match, reused: true }
  }

  const created = await createTicketWithRetry(payload, req, {
    title: titleFromMessage(message),
    sessionType: detected,
  })
  return { ticket: created, reused: false }
}
