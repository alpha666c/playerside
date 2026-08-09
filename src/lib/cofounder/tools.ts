import type { Payload, PayloadRequest } from 'payload'

import type { LlmToolDef } from '@/lib/reviewChat/llm'
import type { CofounderSession } from '@/payload-types'

/**
 * Phase G (G.3) — the Cofounder's tool surface (spec §4), ticket-scoped set
 * for now: T1 (get_today_plan / set_plan_item) + T2 (create_ticket /
 * resume_ticket / close_ticket). T3–T9 land in G.4.
 *
 * Guardrails (spec §4 / §7.4):
 * - No write tool touches research-queue case fields, XP, or publish.
 * - set_plan_item writes go through the optimistic-version contract
 *   (expectedVersion + changedFields: ['plan']) — never a blind write.
 * - Every tool call is audited via `agent-logs` event `tool_call` (metadata).
 */

const todayStartIso = (): string => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

const auditToolCall = async (
  payload: Payload,
  req: PayloadRequest,
  toolName: string,
  args: Record<string, unknown>,
  ok: boolean,
): Promise<void> => {
  try {
    await payload.create({
      collection: 'agent-logs',
      req,
      data: {
        agentId: req.user?.email ?? 'system',
        brand: '01-playerside',
        event: 'tool_call',
        details: { tool: toolName, args, ok },
        // timestamp required for the non-draft create overload (same as logEvent)
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    payload.logger.error({ err, message: 'tool_call audit write failed' })
  }
}

const openPlanItemStatuses = ['todo', 'in-progress', 'blocked']

export type PlanItemKind = 'casino-review' | 'no-deposit-bonus' | 'research' | 'delegation' | 'ops'
export type PlanItemStatus = 'todo' | 'in-progress' | 'blocked' | 'done'
export type TicketSessionType = 'review-run' | 'research-brief' | 'ops'

/** Validate-and-narrow select values from model args (unknown → union). */
const asPlanKind = (v: unknown): PlanItemKind =>
  v === 'casino-review' || v === 'no-deposit-bonus' || v === 'research' || v === 'delegation' ? v : 'ops'
const asPlanStatus = (v: unknown): PlanItemStatus =>
  v === 'in-progress' || v === 'blocked' || v === 'done' ? v : 'todo'
const asSessionType = (v: unknown): TicketSessionType =>
  v === 'research-brief' || v === 'ops' ? v : 'review-run'

export interface ToolContext {
  /** the ticket the model is currently working in (may be null) */
  ticketId?: number | null
}

interface ToolResult {
  ok: boolean
  output: unknown
}

const planSummary = (plan: unknown[] | null | undefined): Array<Record<string, unknown>> =>
  (plan ?? []).map((item) => {
    const p = item as Record<string, unknown>
    return { id: p.id, kind: p.kind, target: p.target, status: p.status, notes: p.notes }
  })

const getTodayPlan = async (payload: Payload, req: PayloadRequest): Promise<ToolResult> => {
  const tickets = await payload.find({
    collection: 'cofounder-sessions',
    req,
    limit: 100,
    depth: 0,
    where: {
      and: [
        { createdAt: { greater_than_equal: todayStartIso() } },
        { status: { in: ['open', 'active', 'paused'] } },
      ],
    },
  })
  const plan = tickets.docs.flatMap((t) =>
    (t.plan ?? []).map((item) => ({
      ...(planSummary([item])[0] ?? {}),
      ticket: t.ticketNumber,
    })),
  )
  return { ok: true, output: { tickets: tickets.docs.length, plan } }
}

export interface PlanItemArgs {
  planItemId?: unknown
  kind?: unknown
  target?: unknown
  status?: unknown
  notes?: unknown
}

/**
 * Shared plan-mutation path (reviewer S3 — the `set_plan_item` tool and the
 * `POST /api/cofounder/tickets/:id/plan` route must not drift). Add-or-update
 * a plan item through the optimistic-version contract (never a blind write).
 */
export const updateTicketPlanItem = async (
  payload: Payload,
  req: PayloadRequest,
  ticketId: number,
  args: PlanItemArgs,
): Promise<{ ok: boolean; output: unknown }> => {
  const doc = await payload.findByID({ collection: 'cofounder-sessions', id: ticketId, req, depth: 0 })
  if (!doc) return { ok: false, output: 'Ticket not found.' }

  const plan = Array.isArray(doc.plan) ? [...doc.plan] : []
  const itemId = args.planItemId
  const kind = asPlanKind(args.kind)
  const target = (args.target as string | null | undefined) ?? null
  const status = asPlanStatus(args.status)

  if (itemId) {
    const idx = plan.findIndex((p) => String((p as { id?: unknown }).id) === String(itemId))
    if (idx === -1) return { ok: false, output: `Plan item ${itemId} not found.` }
    plan[idx] = {
      ...(plan[idx] as Record<string, unknown>),
      kind,
      target,
      status,
    } as (typeof plan)[number]
  } else {
    plan.push({ kind, target, status, notes: (args.notes as string | null | undefined) ?? null })
  }

  // optimistic-version write: read the current version, guard the plan change
  const updated = await payload.update({
    id: ticketId,
    collection: 'cofounder-sessions',
    req,
    context: { expectedVersion: doc.version ?? 1, changedFields: ['plan'] },
    data: { plan },
  })
  return { ok: true, output: { ticketNumber: updated.ticketNumber, plan: planSummary(updated.plan ?? []) } }
}

const setPlanItem = async (
  payload: Payload,
  req: PayloadRequest,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const ticketId = (args.ticketId as number | undefined) ?? ctx.ticketId
  if (!ticketId) return { ok: false, output: 'No ticketId — create or resume a ticket first (create_ticket / resume_ticket).' }
  return updateTicketPlanItem(payload, req, ticketId, args)
}

const createTicket = async (
  payload: Payload,
  req: PayloadRequest,
  args: Record<string, unknown>,
): Promise<ToolResult> => {
  const title = (args.title as string | undefined)?.trim()
  if (!title) return { ok: false, output: 'create_ticket requires a title.' }
  const sessionType = asSessionType(args.sessionType)
  const ticket = await createTicketWithRetry(payload, req, { title, sessionType })
  return {
    ok: true,
    output: { ticketNumber: ticket.ticketNumber, id: ticket.id, status: ticket.status },
  }
}

/**
 * TicketCreateData — the creation payload accepted by createTicketWithRetry.
 * `plan` items follow the collection's inline array type (kind/status unions).
 */
export type TicketCreateData = {
  title: string
  sessionType?: TicketSessionType
  plan?: NonNullable<CofounderSession['plan']>
}

/**
 * Shared resume path (reviewer S3 — the `resume_ticket` tool and the
 * `/api/cofounder/tickets/resume` route must not drift): find by id or #CF
 * number, mark `active` via the optimistic-version contract, return the
 * updated doc (depth 1 resolves pinnedCases for the panel). Returns null when
 * not found.
 */
export const findTicketAndResume = async (
  payload: Payload,
  req: PayloadRequest,
  opts: { ticketId?: number | null; ticketNumber?: string | null },
): Promise<CofounderSession | null> => {
  const doc = opts.ticketId
    ? await payload.findByID({ collection: 'cofounder-sessions', id: opts.ticketId, req, depth: 0 })
    : opts.ticketNumber?.trim()
      ? ((await payload.find({
          collection: 'cofounder-sessions',
          req,
          depth: 0,
          limit: 1,
          where: { ticketNumber: { equals: opts.ticketNumber.trim() } },
        })).docs[0] ?? null)
      : null
  if (!doc) return null
  return await payload.update({
    id: doc.id,
    collection: 'cofounder-sessions',
    req,
    depth: 1,
    context: { expectedVersion: doc.version ?? 1, changedFields: ['status'] },
    data: { status: 'active' },
  })
}

const resumeTicket = async (
  payload: Payload,
  req: PayloadRequest,
  args: Record<string, unknown>,
): Promise<ToolResult> => {
  const updated = await findTicketAndResume(payload, req, {
    ticketId: args.ticketId as number | undefined,
    ticketNumber: args.ticketNumber as string | undefined,
  })
  if (!updated) return { ok: false, output: 'Ticket not found — pass ticketId or ticketNumber.' }
  return {
    ok: true,
    output: {
      ticketNumber: updated.ticketNumber,
      status: updated.status,
      plan: planSummary(updated.plan ?? []),
      threadTurns: (updated.thread ?? []).length,
    },
  }
}

const closeTicket = async (
  payload: Payload,
  req: PayloadRequest,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const ticketId = (args.ticketId as number | undefined) ?? ctx.ticketId
  if (!ticketId) return { ok: false, output: 'No ticketId — create or resume a ticket first.' }
  const doc = await payload.findByID({ collection: 'cofounder-sessions', id: ticketId, req, depth: 0 })
  if (!doc) return { ok: false, output: 'Ticket not found.' }

  const openItems = (doc.plan ?? []).filter((p) => openPlanItemStatuses.includes(String((p as { status?: unknown }).status)))
  if (openItems.length > 0 && args.confirm !== true) {
    return {
      ok: false,
      output: `Ticket ${doc.ticketNumber} still has ${openItems.length} open plan item(s) — close requires confirm:true (or mark plan items done first).`,
    }
  }
  const updated = await payload.update({
    id: ticketId,
    collection: 'cofounder-sessions',
    req,
    data: { status: 'done' },
  })
  return { ok: true, output: { ticketNumber: updated.ticketNumber, status: updated.status } }
}

/** Tool definitions exposed to the model (OpenAI function-calling format). */
export const cofounderTools: LlmToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'get_today_plan',
      description: 'Read today\'s plan: tickets created today (open/active/paused) and their plan items.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_plan_item',
      description: 'Add or update a plan item on the current ticket. If planItemId is omitted a new item is appended.',
      parameters: {
        type: 'object',
        properties: {
          ticketId: { type: 'number', description: 'Optional — defaults to the current ticket.' },
          planItemId: { type: 'string', description: 'Existing item id to update; omit to append a new item.' },
          kind: { type: 'string', enum: ['casino-review', 'no-deposit-bonus', 'research', 'delegation', 'ops'] },
          target: { type: 'string', description: 'Operator/bonus name or free text.' },
          status: { type: 'string', enum: ['todo', 'in-progress', 'blocked', 'done'], default: 'todo' },
          notes: { type: 'string' },
        },
        required: ['kind'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description: 'Create a new work-session ticket (#CF-YYMMDD-NN). Use when Viktor starts a new session or topic.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short session title, e.g. "Tuesday review run — 5 casinos + 4 no-deposit".' },
          sessionType: { type: 'string', enum: ['review-run', 'research-brief', 'ops'], default: 'review-run' },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resume_ticket',
      description: 'Resume an existing ticket by id or #CF number — marks it active and returns plan + thread length.',
      parameters: {
        type: 'object',
        properties: {
          ticketId: { type: 'number' },
          ticketNumber: { type: 'string', description: 'e.g. #CF-260809-01' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_ticket',
      description: 'Close the current ticket (status done). Requires confirm:true when plan items are still open.',
      parameters: {
        type: 'object',
        properties: {
          ticketId: { type: 'number' },
          confirm: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    },
  },
]

/**
 * Unique-violation detection for the #CF numbering retry (QA S2-4).
 * Payload's drizzle adapter wraps Postgres 23505 into a ValidationError
 * (handleUpsertError.js); the create operation then re-wraps it again into a
 * generic "The following field is invalid: <field>" message — the per-error
 * 'Value must be unique' text is lost, but the field path survives in
 * `data.errors[0].path` (APIError stores the results object as `data`). We
 * match the raw code, the wrapped form, and the `data.errors` path. Only the
 * ticketNumber path is treated as retryable (a real validation failure on
 * that field is a programming bug; retrying then rethrowing is harmless).
 */
export const isUniqueViolation = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err)
  const code = (err as { code?: unknown })?.code
  const data = (err as { data?: { errors?: Array<{ path?: unknown; message?: unknown }> } })?.data
  const path =
    data?.errors?.[0]?.path ??
    (err as { errors?: Array<{ path?: unknown }> })?.errors?.[0]?.path
  return (
    code === '23505' ||
    path === 'ticketNumber' ||
    data?.errors?.[0]?.message === 'Value must be unique' ||
    msg.includes('Value must be unique') ||
    msg.includes('duplicate key value violates unique constraint') ||
    /already exists/i.test(msg)
  )
}

/**
 * QA S2-4 — `#CF-YYMMDD-NN` is count-then-insert (field-level hook). Under
 * concurrent creation (Cofounder tool + admin REST + this route), two
 * creators can count the same base and collide on the unique ticketNumber.
 * The spec requires "retried on collision". A naive re-count retry loops
 * forever (a rolled-back insert is invisible to the count), so this wrapper
 * counts once and walks UP from the base on each attempt — a collided
 * attempt deterministically moves to a fresh number.
 */
export const createTicketWithRetry = async (
  payload: Payload,
  req: PayloadRequest,
  data: TicketCreateData,
  retries = 3,
): Promise<CofounderSession> => {
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const prefix = `#CF-${yymmdd}-`
  const { totalDocs } = await payload.count({
    collection: 'cofounder-sessions',
    where: { ticketNumber: { like: `${prefix}%` } },
  })
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return (await payload.create({
        collection: 'cofounder-sessions',
        req,
        data: {
          ...data,
          // explicit number bypasses the hook's re-count — deterministic advance
          ticketNumber: `${prefix}${String(totalDocs + 1 + attempt).padStart(2, '0')}`,
        },
      })) as CofounderSession
    } catch (err) {
      lastErr = err
      if (!isUniqueViolation(err)) throw err
    }
  }
  throw lastErr
}

/** Server-side dispatcher — every call is audited. */
export const executeCofounderTool = async (
  payload: Payload,
  req: PayloadRequest,
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> => {
  let result: ToolResult
  try {
    switch (toolName) {
      case 'get_today_plan':
        result = await getTodayPlan(payload, req)
        break
      case 'set_plan_item':
        result = await setPlanItem(payload, req, args, ctx)
        break
      case 'create_ticket':
        result = await createTicket(payload, req, args)
        break
      case 'resume_ticket':
        result = await resumeTicket(payload, req, args)
        break
      case 'close_ticket':
        result = await closeTicket(payload, req, args, ctx)
        break
      default:
        result = { ok: false, output: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    result = { ok: false, output: err instanceof Error ? err.message : String(err) }
  }
  await auditToolCall(payload, req, toolName, args, result.ok)
  return result
}
