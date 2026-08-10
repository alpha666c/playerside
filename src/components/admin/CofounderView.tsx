'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Phase G (G.4) — the Cofounder operations workspace (spec §11), mounted at
 * /admin/cofounder. Three panes:
 *
 * 1. Tickets & Today — today's plan rollup + the ticket list (open/active/
 *    paused/done) + "New ticket". Click a ticket to load it.
 * 2. Ticket workspace — header (status/sessionType chips, created/lastActive),
 *    the STREAMING Cofounder thread (SSE via POST /api/cofounder), the plan
 *    board (per-item status via the shared plan route — same optimistic-
 *    version path the model's set_plan_item tool uses), and pinned cases.
 * 3. Agents & Tasks (G.4 slice) — the last turn's tool activity and the
 *    ticket's delegation queue (read-only; approve/reject + approve-to-
 *    publish arrive with the G.6 control room, spec §11/§12).
 *
 * Everything is read-only except the explicit panel actions (new ticket,
 * plan-item status, pause/close) — all behind payload.auth on the API side.
 */
export default function CofounderView() {
  const [list, setList] = useState<TicketListItem[] | null>(null)
  const [rollup, setRollup] = useState<Rollup | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingUser, setPendingUser] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')
  // G.6 — the per-turn tool feed moved out of the right pane (agents-at-work
  // replaced it); we keep the setter for the output-gate notice plumbing.
  const [, setLastToolEvents] = useState<ToolEvent[] | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [planKind, setPlanKind] = useState<PlanKind>('casino-review')
  const [planTarget, setPlanTarget] = useState('')

  // G.6 — control room: status strip (polled), collapsible right pane,
  // stale-run dismissal, in-flight approve/publish markers.
  const [statusPayload, setStatusPayload] = useState<StatusPayload | null>(null)
  const [rightOpen, setRightOpen] = useState(false)
  const [dismissedRuns, setDismissedRuns] = useState<Set<string>>(new Set())
  const [decidingJobId, setDecidingJobId] = useState<string | null>(null)
  const [publishingCaseId, setPublishingCaseId] = useState<number | null>(null)
  // React-Compiler-safe wall clock: state, not Date.now() inside useMemo.
  const [now, setNow] = useState(() => Date.now())

  // Live selection ref — guards stale responses (reviewer S2): an in-flight
  // GET/chat for the previous ticket must never overwrite the new selection.
  const selectedIdRef = useRef<number | null>(null)
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const loadList = useCallback(async () => {
    try {
      const data = (await fetchJson('/api/cofounder/tickets')) as {
        tickets: TicketListItem[]
        today: { planRollup: Rollup; ticketsToday: number }
      }
      setList(data.tickets)
      setRollup(data.today.planRollup)
      setError(null)
      const active = data.tickets.filter((t) => ACTIVE_STATUSES.includes(t.status ?? ''))
      if (active.length > 0) {
        const pick = [...active].sort((a, b) =>
          String(b.lastActiveAt ?? '').localeCompare(String(a.lastActiveAt ?? '')),
        )[0]
        setSelectedId(pick.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets')
    }
  }, [])

  const reloadTicket = useCallback(async () => {
    if (selectedId === null) return
    const id = selectedId
    try {
      const data = (await fetchJson(`/api/cofounder/tickets/${id}`)) as TicketDetail
      // reviewer S2 — drop the response if the user switched tickets while
      // this GET was in flight.
      if (selectedIdRef.current === id) {
        setTicket(data)
        setError(null)
      }
    } catch (e) {
      if (selectedIdRef.current === id) {
        setError(e instanceof Error ? e.message : 'Failed to load ticket')
      }
    }
  }, [selectedId])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId !== null) reloadTicket()
  }, [selectedId, reloadTicket])

  // G.6 — control-room status polling (spec §11): fast (~5s) while a run is
  // in progress, backing off to ~30s when idle (S3). Never flashes an error
  // on a poll failure — keep the last known strip.
  const statusRef = useRef<StatusPayload | null>(null)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      try {
        const data = (await fetchJson('/api/cofounder/status')) as StatusPayload
        statusRef.current = data
        if (!cancelled) setStatusPayload(data)
      } catch {
        // keep last known strip
      }
      if (!cancelled) {
        timer = setTimeout(tick, (statusRef.current?.runs.active ?? 0) > 0 ? 5000 : 30000)
      }
    }
    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Keep the wall clock fresh for staleness renders (cheap, decoupled from
  // the poll cadence).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const selectTicket = (id: number) => {
    setSelectedId(id)
    setLastToolEvents(null)
    setNotice(null)
  }

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const data = (await fetchJson('/api/cofounder/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, sessionType: 'review-run' }),
      })) as { id: number }
      setNewTitle('')
      await loadList()
      setSelectedId(data.id)
      setNotice({ tone: 'ok', text: `Ticket created — select it to start planning.` })
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Create failed' })
    } finally {
      setBusy(false)
    }
  }

  const transitionTicket = async (action: 'pause' | 'close') => {
    if (selectedId === null || busy) return
    setBusy(true)
    setNotice(null)
    try {
      await fetchJson(`/api/cofounder/tickets/${selectedId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      await Promise.all([loadList(), reloadTicket()])
      setNotice({ tone: 'ok', text: action === 'pause' ? 'Ticket paused.' : 'Ticket closed.' })
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Transition failed' })
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy || selectedId === null) return
    const sendId = selectedId
    setInput('')
    setBusy(true)
    setNotice(null)
    setPendingUser(text)
    setStreamText('')
    try {
      const res = await fetch('/api/cofounder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: sendId, message: text }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ? String(body.message) : `HTTP ${res.status}`)
      }
      await consumeSse(
        res,
        // reviewer S3 — if the user switched tickets mid-stream, drop the deltas.
        (delta) => {
          if (selectedIdRef.current === sendId) setStreamText((prev) => prev + delta)
        },
        (done) => {
          if (selectedIdRef.current !== sendId) return
          setLastToolEvents(done.toolEvents ?? [])
          if (done.outputGate?.hits?.length) {
            setNotice({
              tone: 'warn',
              text: `Output gate flagged: ${done.outputGate.hits.join(', ')} — RG aside appended to the reply.`,
            })
          }
        },
      )
      if (selectedIdRef.current === sendId) await reloadTicket()
    } catch (err) {
      if (selectedIdRef.current === sendId) {
        setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Chat request failed' })
      }
    } finally {
      setBusy(false)
      setPendingUser(null)
      setStreamText('')
    }
  }

  const setPlanStatus = async (item: PlanItem, status: string) => {
    if (selectedId === null || busy) return
    setBusy(true)
    try {
      await fetchJson(`/api/cofounder/tickets/${selectedId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ planItemId: item.id ?? null, kind: item.kind, target: item.target, status }),
      })
      await reloadTicket()
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Plan update failed' })
    } finally {
      setBusy(false)
    }
  }

  const addPlanItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = planTarget.trim()
    if (selectedId === null || !target || busy) return
    setBusy(true)
    try {
      await fetchJson(`/api/cofounder/tickets/${selectedId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ kind: planKind, target, status: 'todo' }),
      })
      setPlanTarget('')
      await reloadTicket()
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Plan add failed' })
    } finally {
      setBusy(false)
    }
  }

  // G.6 — delegation decide (approve/reject) + approve & publish.
  const decideJob = async (job: DelegationJob, decision: 'approve' | 'reject') => {
    if (selectedId === null || busy || decidingJobId !== null) return
    const jobId = job.jobId ?? ''
    if (!jobId) return
    setDecidingJobId(jobId)
    setNotice(null)
    try {
      // Review-before-write (S2-1): send the case version the UI loaded for
      // draft-applying roles; a stale approve 409s as BLOCKED_CONFLICT.
      // The ticket GET's `runs` only covers cases that already have an aiRun
      // (agent activity); a fresh case that was pinned but never run has no
      // runs entry, so fall back to the pinned case's own `version` field
      // (the pinnedCases are populated at depth 1 in the ticket GET).
      const caseId = job.caseId != null ? Number(job.caseId) : null
      const pinned = (ticket?.pinnedCases ?? []).find((p) => {
        const c = typeof p === 'object' && p !== null ? (p as PinnedCase) : null
        return c?.id === caseId
      })
      const pinnedC = typeof pinned === 'object' && pinned !== null ? (pinned as PinnedCase) : null
      const pinnedVersion =
        caseId != null && Number.isFinite(caseId) ? (typeof pinnedC?.version === 'number' ? pinnedC.version : null) : null
      const expectedVersion =
        typeof pinnedVersion === 'number'
          ? pinnedVersion
          : caseId != null && Number.isFinite(caseId)
            ? (runs.find((r) => r.caseId === caseId)?.caseVersion ?? undefined)
            : undefined
      const data = (await fetchJson('/api/cofounder/approve', {
        method: 'POST',
        body: JSON.stringify({
          ticketId: selectedId,
          jobId,
          decision,
          ...(expectedVersion !== undefined ? { expectedVersion } : {}),
          ...(decision === 'reject' ? { note: 'Rejected by Viktor in the control room.' } : {}),
        }),
      })) as { ok: boolean; status: string; applied?: boolean; message?: string }
      await Promise.all([reloadTicket(), loadList()])
      setNotice({
        tone: 'ok',
        text: data.message ?? `Job ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      })
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Decision failed' })
      await reloadTicket()
    } finally {
      setDecidingJobId(null)
    }
  }

  const runPublish = async (caseId: number, expectedVersion: number) => {
    if (busy || publishingCaseId !== null) return
    setPublishingCaseId(caseId)
    setNotice(null)
    try {
      const data = (await fetchJson('/api/cofounder/publish', {
        method: 'POST',
        body: JSON.stringify({ caseId, expectedVersion }),
      })) as { ok: boolean; message?: string; publishedReviewId?: number | string }
      await Promise.all([reloadTicket(), loadList()])
      setNotice({ tone: 'ok', text: data.message ?? 'Review published.' })
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Publish failed' })
      await reloadTicket()
    } finally {
      setPublishingCaseId(null)
    }
  }

  const dismissRun = (runId: string) => {
    setDismissedRuns((prev) => {
      const next = new Set(prev)
      next.add(runId)
      return next
    })
  }

  const thread = useMemo(() => ticket?.thread ?? [], [ticket?.thread])
  const openPlan = useMemo(
    () => (ticket?.plan ?? []).filter((p) => OPEN_STATUSES.includes(p.status ?? 'todo')),
    [ticket?.plan],
  )

  // G.6 — agents-at-work data from the ticket's runs (extended GET) with the
  // truthfulness rules from spec §11: stale = pending/running started > 15
  // min ago (dismissable); one active run per case. Computed inline (not
  // useMemo) — the React Compiler memoizes pure derived values itself, and
  // manual memoization of Set/Map-heavy derivations trips its
  // preserve-manual-memoization rule.
  const runs = ticket?.runs ?? []
  const visibleRuns = runs.filter((r) => !dismissedRuns.has(r.runId))
  const staleRunIds = new Set<string>()
  for (const r of runs) {
    if (r.status !== 'pending' && r.status !== 'running') continue
    const started = r.startedAt ? new Date(r.startedAt).getTime() : 0
    if (now - started > 15 * 60 * 1000) staleRunIds.add(r.runId)
  }

  // Approve & Publish eligibility: a pinned case at integrity-check whose
  // latest integrity-checker run holds a fresh PASS verdict (§12.2 —
  // verdictForVersion must equal the case version the UI loaded).
  const publishableCases = (() => {
    const best = new Map<number, CaseRun>()
    for (const r of runs) {
      if (r.agentRole !== 'integrity-checker' || r.caseStatus !== 'integrity-check') continue
      const verdict = (r.output as { integrityResult?: { verdict?: string; verdictForVersion?: number | null } } | null)
        ?.integrityResult
      if (verdict?.verdict !== 'PASS') continue
      if (typeof verdict.verdictForVersion === 'number' && verdict.verdictForVersion !== r.caseVersion) continue
      const prev = best.get(r.caseId)
      if (!prev || (r.completedAt ?? '') > (prev.completedAt ?? '')) best.set(r.caseId, r)
    }
    return [...best.values()]
  })()

  return (
    <div style={{ padding: '0 24px 32px', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: '0 0 0' }}>Cofounder workspace</h1>
        {ticket ? (
          <span style={{ fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            {ticket.ticketNumber} · v{ticket.version ?? 1}
          </span>
        ) : null}
      </div>
      <p style={{ margin: '0 0 16px', color: 'var(--theme-elevation-500)', fontSize: 13.5 }}>
        Plan sessions, chat with the Cofounder, and run the control room: agents at work, delegation
        approve/reject, and approve-to-publish (human-only).
      </p>

      {error ? (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, color: 'var(--theme-error-400)', border: '1px solid var(--theme-error-400)', background: 'var(--theme-error-50)' }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          style={{
            padding: '9px 12px', borderRadius: 8, marginBottom: 14, fontSize: 12.5, border: '1px solid',
            color: notice.tone === 'ok' ? 'var(--theme-success-400)' : notice.tone === 'warn' ? 'var(--theme-warning-400)' : 'var(--theme-error-400)',
            borderColor: notice.tone === 'ok' ? 'var(--theme-success-400)' : notice.tone === 'warn' ? 'var(--theme-warning-400)' : 'var(--theme-error-400)',
            background: 'var(--theme-elevation-50)',
          }}
        >
          {notice.text}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ---------- LEFT: tickets & today ---------- */}
        <section style={{ flex: '1 1 260px', minWidth: 250, maxWidth: 340 }}>
          <Card title="Tickets & today">
            {rollup ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {PLAN_KINDS.map((kind) => {
                  const counts = rollup[kind] ?? {}
                  const done = counts.done ?? 0
                  const total = Object.values(counts).reduce((s, n) => s + n, 0)
                  if (total === 0) return null
                  return (
                    <span key={kind} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--theme-elevation-100)', border: '1px solid var(--theme-elevation-200)' }}>
                      {KIND_LABELS[kind]}: {done}/{total} done
                    </span>
                  )
                })}
                {Object.keys(rollup).length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--theme-elevation-500)' }}>No plan items yet today.</span>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {list === null ? (
                <span style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)' }}>Loading tickets…</span>
              ) : list.length === 0 ? (
                <span style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)' }}>
                  No tickets yet — create one below or just say hello to the Cofounder.
                </span>
              ) : (
                list.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTicket(t.id)}
                    style={{
                      textAlign: 'left', cursor: 'pointer', border: '1px solid var(--theme-elevation-200)', borderRadius: 8, padding: '8px 10px',
                      background: t.id === selectedId ? 'var(--theme-accent-50)' : 'var(--theme-bg)',
                      borderColor: t.id === selectedId ? 'var(--theme-accent-400)' : 'var(--theme-elevation-200)',
                      color: 'inherit', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.ticketNumber}</span>
                    <span style={{ fontSize: 12, color: 'var(--theme-elevation-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10.5 }}>
                      <Chip tone={statusTone(t.status)}>{t.status ?? '—'}</Chip>
                      <span style={{ color: 'var(--theme-elevation-500)' }}>{t.sessionType ?? ''}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <form onSubmit={createTicket} style={{ display: 'flex', gap: 6 }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New ticket title…"
                maxLength={200}
                style={inputStyle}
              />
              <button type="submit" disabled={busy || !newTitle.trim()} style={buttonStyle(busy || !newTitle.trim(), 'var(--theme-accent-400)')}>
                +
              </button>
            </form>
          </Card>
        </section>

        {/* ---------- CENTER: ticket workspace ---------- */}
        <section style={{ flex: '3 1 480px', minWidth: 320 }}>
          {!ticket ? (
            <Card title="Ticket workspace">
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--theme-elevation-500)', fontSize: 13.5 }}>
                Select a ticket on the left, or create a new one.
              </div>
            </Card>
          ) : (
            <>
              <Card
                title={ticket.title || ticket.ticketNumber}
                right={
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip tone={statusTone(ticket.status)}>{ticket.status ?? '—'}</Chip>
                    <Chip tone="neutral">{ticket.sessionType ?? '—'}</Chip>
                    {ticket.lastActiveAt ? (
                      <span style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                        active {new Date(ticket.lastActiveAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}
                    {ticket.status === 'active' || ticket.status === 'open' ? (
                      <>
                        <button type="button" onClick={() => transitionTicket('pause')} disabled={busy} style={smallButton}>
                          Pause
                        </button>
                        <button type="button" onClick={() => transitionTicket('close')} disabled={busy} style={{ ...smallButton, background: 'var(--theme-error-400)' }}>
                          Close
                        </button>
                      </>
                    ) : null}
                  </span>
                }
              >
                {/* Thread */}
                <div
                  aria-live="polite"
                  style={{
                    border: '1px solid var(--theme-elevation-200)', borderRadius: 10, minHeight: 240, maxHeight: '44vh', overflowY: 'auto',
                    padding: 12, background: 'var(--theme-bg)', display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  {thread.length === 0 && !pendingUser ? (
                    <div style={{ color: 'var(--theme-elevation-500)', fontSize: 12.5, textAlign: 'center', padding: '20px 0' }}>
                      No conversation yet. Tell the Cofounder what you want to work on — it will plan, suggest tools, and keep the ticket up to date.
                    </div>
                  ) : null}
                  {thread.map((turn, i) => <Bubble key={turn.id ?? i} turn={turn} />)}
                  {pendingUser ? (
                    <div style={{ alignSelf: 'flex-end', maxWidth: '84%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ background: 'var(--theme-elevation-100)', borderRadius: 12, padding: '10px 12px', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {pendingUser}
                      </div>
                      {streamText ? (
                        <div style={{ background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-200)', borderRadius: 12, padding: '10px 12px', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {streamText}
                          <span style={{ display: 'inline-block', width: 7, height: 13, marginLeft: 3, background: 'var(--theme-accent-400)', verticalAlign: 'text-bottom', animation: 'cofounderBlink 1s steps(2) infinite' }} />
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--theme-elevation-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--theme-accent-400)' }} />
                          Cofounder thinking…
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <textarea
                    aria-label="Message the Cofounder"
                    value={input}
                    maxLength={4000}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage(e)
                    }}
                    rows={2}
                    disabled={busy}
                    placeholder="Ask the Cofounder to plan, research, or draft… (⌘/Ctrl + Enter to send)"
                    style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                  />
                  <button type="submit" disabled={busy || !input.trim()} style={buttonStyle(busy || !input.trim(), 'var(--theme-accent-400)')}>
                    Send
                  </button>
                </form>

                {/* Plan board */}
                <div style={{ marginTop: 14 }}>
                  <SectionTitle>Plan board · {openPlan.length} open</SectionTitle>
                  {(ticket.plan ?? []).length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', padding: '6px 0' }}>
                      No plan items yet — add one below, or ask the Cofounder to set up the plan.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(ticket.plan ?? []).map((item, i) => (
                        <div
                          key={item.id ?? i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--theme-elevation-200)', borderRadius: 8, padding: '6px 10px', background: 'var(--theme-bg)',
                            opacity: item.status === 'done' ? 0.6 : 1,
                          }}
                        >
                          <select
                            value={item.status ?? 'todo'}
                            onChange={(e) => setPlanStatus(item, e.target.value)}
                            disabled={busy}
                            title="Plan item status"
                            style={{ fontSize: 11.5, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-bg)', color: 'inherit' }}
                          >
                            {PLAN_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Chip tone="neutral">{KIND_LABELS[item.kind as PlanKind] ?? item.kind}</Chip>
                          <span style={{ fontSize: 12.5, flex: 1 }}>{item.target ?? '(no target)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={addPlanItem} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <select value={planKind} onChange={(e) => setPlanKind(e.target.value as PlanKind)} style={smallSelect}>
                      {PLAN_KINDS.map((k) => (
                        <option key={k} value={k}>{KIND_LABELS[k]}</option>
                      ))}
                    </select>
                    <input
                      value={planTarget}
                      onChange={(e) => setPlanTarget(e.target.value)}
                      placeholder="Operator / bonus / task…"
                      maxLength={200}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="submit" disabled={busy || !planTarget.trim()} style={buttonStyle(busy || !planTarget.trim(), 'var(--theme-elevation-300)')}>
                      Add
                    </button>
                  </form>
                </div>

                {/* Pinned cases */}
                {(ticket.pinnedCases ?? []).length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <SectionTitle>Pinned cases</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ticket.pinnedCases.map((p) => {
                        const c = typeof p === 'object' && p !== null ? (p as PinnedCase) : null
                        if (!c) return null
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--theme-elevation-200)', borderRadius: 8, padding: '6px 10px', background: 'var(--theme-bg)' }}>
                            <span style={{ fontSize: 12.5, flex: 1 }}>
                              {String(c.operatorName ?? '—')} <span style={{ color: 'var(--theme-elevation-500)' }}>{String(c.caseNumber ?? '')}</span>
                            </span>
                            <Chip tone={statusTone(c.status)}>{c.status ?? '—'}</Chip>
                            <a href={`/admin/collections/research-queue/${c.id}`} style={linkStyle}>Edit</a>
                            <a href={`/admin/collections/research-queue/${c.id}/chat`} style={linkStyle}>Chat</a>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </section>

        {/* ---------- RIGHT: control room (G.6) ---------- */}
        <section style={{ flex: rightOpen ? '1 1 280px' : '0 1 190px', minWidth: rightOpen ? 260 : 170, maxWidth: rightOpen ? 350 : 240 }}>
          {/* Compact status strip — always visible (collapsible pane, spec §11) */}
          <Card
            title="Control room"
            right={
              <button type="button" onClick={() => setRightOpen((v) => !v)} style={smallButton}>
                {rightOpen ? 'Collapse' : 'Expand'}
              </button>
            }
          >
            {statusPayload === null ? (
              <div style={{ fontSize: 12, color: 'var(--theme-elevation-500)', padding: '2px 0' }}>
                Loading status…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                <span>
                  <b>{statusPayload.runs.active}</b> run{statusPayload.runs.active === 1 ? '' : 's'} active
                  {statusPayload.runs.stale > 0 ? ` · ${statusPayload.runs.stale} stale` : ''}
                </span>
                <span>
                  <b>{statusPayload.jobsAwaitingApprove}</b> job{statusPayload.jobsAwaitingApprove === 1 ? '' : 's'} awaiting approve
                </span>
                <span style={{ color: 'var(--theme-elevation-500)' }}>
                  pipeline: {statusPayload.pipeline.inReview} in review · {statusPayload.pipeline.published} live
                </span>
              </div>
            )}
          </Card>

          {rightOpen ? (
            <>
              {/* Agents at work (spec §11) */}
              <div style={{ marginTop: 14 }}>
                <Card title="Agents at work">
                  {visibleRuns.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', padding: '4px 0' }}>
                      No agent runs on the pinned cases yet — delegate work or run a pipeline agent from the chat.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visibleRuns.map((r) => (
                        <div key={r.runId} style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: 8, padding: '8px 10px', background: 'var(--theme-bg)', opacity: staleRunIds.has(r.runId) ? 0.65 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                            <Chip tone={runTone(r.status, staleRunIds.has(r.runId))}>{staleRunIds.has(r.runId) ? 'stale' : r.status}</Chip>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{ROLE_LABELS[r.agentRole] ?? r.agentRole}</span>
                            <span style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', flex: 1, textAlign: 'right' }}>
                              {r.operatorName ?? r.caseNumber ?? `case ${r.caseId}`}
                            </span>
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginBottom: 3 }}>
                            started {r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : '—'}
                            {r.completedAt ? ` · done ${new Date(r.completedAt).toLocaleTimeString()}` : ''}
                          </div>
                          {staleRunIds.has(r.runId) ? (
                            <button type="button" onClick={() => dismissRun(r.runId)} style={smallButton}>
                              Dismiss
                            </button>
                          ) : null}
                          {r.output ? (
                            <details style={{ marginTop: 4, fontSize: 11.5 }}>
                              <summary style={{ cursor: 'pointer', color: 'var(--theme-elevation-500)', fontWeight: 600 }}>Structured output</summary>
                              <pre style={{ margin: '6px 0 0', padding: 8, borderRadius: 6, background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-200)', overflow: 'auto', maxHeight: 200, fontSize: 10, lineHeight: 1.5, fontFamily: 'var(--font-mono, monospace)' }}>
                                {JSON.stringify(r.output, null, 2)}
                              </pre>
                            </details>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Delegation queue with approve/reject (spec §4.1 / §12) */}
              <div style={{ marginTop: 14 }}>
                <Card title="Delegation queue">
                  {(ticket?.delegationQueue ?? []).length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', padding: '4px 0' }}>
                      No jobs proposed yet. When the Cofounder proposes work (research, drafts), jobs appear here as QUEUED.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(ticket?.delegationQueue ?? []).map((job, i) => (
                        <div key={job.id ?? i} style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: 8, padding: '8px 10px', background: 'var(--theme-bg)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <Chip tone={jobTone(job.status)}>{job.status ?? '—'}</Chip>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{ROLE_LABELS[job.role ?? ''] ?? job.role ?? '—'}</span>
                            {job.status === 'QUEUED' ? (
                              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  disabled={busy || decidingJobId !== null}
                                  onClick={() => decideJob(job, 'approve')}
                                  style={{ ...smallButton, background: 'var(--theme-success-400)' }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || decidingJobId !== null}
                                  onClick={() => decideJob(job, 'reject')}
                                  style={{ ...smallButton, background: 'var(--theme-error-400)' }}
                                >
                                  Reject
                                </button>
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--theme-elevation-500)', lineHeight: 1.45 }}>{job.brief ?? ''}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginTop: 3 }}>
                            {job.jobId ?? ''}
                            {job.caseId ? ` · case ${String(job.caseId)}` : ''}
                            {job.outputRef ? ` · ${String(job.outputRef)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Approve & Publish (spec §12) */}
              <div style={{ marginTop: 14 }}>
                <Card title="Approve & Publish">
                  {publishableCases.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--theme-elevation-500)', padding: '4px 0' }}>
                      A case becomes publishable when it reaches integrity-check with a fresh PASS verdict. Run the integrity checker, then come back here.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {publishableCases.map((r) => (
                        <div key={r.caseId} style={{ border: '1px solid var(--theme-success-400)', borderRadius: 8, padding: '8px 10px', background: 'var(--theme-bg)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{r.operatorName ?? r.caseNumber ?? `Case ${r.caseId}`}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--theme-elevation-500)', marginBottom: 6 }}>
                            {r.caseNumber} · integrity PASS (v{r.caseVersion}) · verdict {r.completedAt ? new Date(r.completedAt).toLocaleString() : ''}
                          </div>
                          <button
                            type="button"
                            disabled={busy || publishingCaseId !== null}
                            onClick={() => runPublish(r.caseId, r.caseVersion)}
                            style={{ ...smallButton, background: 'var(--theme-success-400)', padding: '6px 12px' }}
                          >
                            {publishingCaseId === r.caseId ? 'Publishing…' : 'Approve & Publish'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--theme-elevation-500)', fontStyle: 'italic' }}>
                    Human-only trigger — publish creates the review doc, links the case, and the site revalidates itself.
                  </div>
                </Card>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}

/* ---------- types ---------- */

type PlanKind = 'casino-review' | 'no-deposit-bonus' | 'research' | 'delegation' | 'ops'

type TicketListItem = {
  id: number
  ticketNumber: string
  title: string
  sessionType: string | null
  status: string | null
  lastActiveAt: string | null
}

type Rollup = Record<string, Record<string, number>>

type PlanItem = {
  id?: string | null
  kind: string
  target?: string | null
  status?: string | null
  notes?: string | null
}

type ThreadTurn = { id?: string | null; role: string; content: string; timestamp?: string | null }

type DelegationJob = {
  id?: string | null
  jobId?: string | null
  role?: string | null
  brief?: string | null
  source?: string | null
  status?: string | null
  createdAt?: string | null
  caseId?: number | string | null
  outputRef?: string | null
}

type PinnedCase = {
  id: number
  caseNumber?: string | null
  operatorName?: string | null
  status?: string | null
  /** Optimistic-concurrency token of the case (ticket GET populates pinned cases at depth 1). */
  version?: number | null
}

/** G.6 — one aiRun on a pinned case, compact projection from the ticket GET. */
type CaseRun = {
  runId: string
  caseId: number
  caseNumber: string | null
  operatorName: string | null
  caseStatus: string | null
  caseVersion: number
  agentRole: string
  status: string
  startedAt: string | null
  completedAt: string | null
  output: Record<string, unknown> | null
}

/** G.6 — GET /api/cofounder/status aggregation (compact strip + polling). */
type StatusPayload = {
  tickets: { open: number; active: number }
  runs: { active: number; stale: number; detail: CaseRun[] }
  jobsAwaitingApprove: number
  pipeline: { total: number; inReview: number; published: number; byStage: Record<string, number> }
}

type TicketDetail = {
  id: number
  ticketNumber: string
  title: string
  sessionType: string | null
  status: string | null
  plan: PlanItem[]
  thread: ThreadTurn[]
  pinnedCases: (PinnedCase | number)[]
  delegationQueue: DelegationJob[]
  runs: CaseRun[]
  lastActiveAt: string | null
  createdAt: string | null
  version: number | null
}

type ToolEvent = { name: string; args: Record<string, unknown>; ok: boolean; output: unknown }

type DoneEvent = {
  done: true
  ticket: { id: number; ticketNumber: string; status: string | null; reused: boolean }
  toolEvents?: ToolEvent[]
  outputGate?: { hits?: string[]; note?: string | null }
  partial?: boolean
  loopCapped?: boolean
  model?: string
}

/* ---------- helpers ---------- */

const ACTIVE_STATUSES = ['open', 'active', 'paused']
const OPEN_STATUSES = ['todo', 'in-progress', 'blocked']
const PLAN_STATUSES = ['todo', 'in-progress', 'blocked', 'done']
const PLAN_KINDS: PlanKind[] = ['casino-review', 'no-deposit-bonus', 'research', 'delegation', 'ops']

const KIND_LABELS: Record<PlanKind, string> = {
  'casino-review': 'Casino',
  'no-deposit-bonus': 'No-deposit',
  research: 'Research',
  delegation: 'Delegation',
  ops: 'Ops',
}

const ROLE_LABELS: Record<string, string> = {
  qa: 'QA',
  reviewer: 'Reviewer',
  researcher: 'Researcher',
  'content-writer': 'Content writer',
  'desk-researcher': 'Desk researcher',
  'score-analyst': 'Score analyst',
  'editorial-writer': 'Editorial writer',
  'integrity-checker': 'Integrity checker',
  monitor: 'Monitor',
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  // reviewer S3 — only send Content-Type when there is a body to describe.
  const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) }
  if (init?.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, { ...init, headers })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && 'message' in json
        ? String((json as { message: unknown }).message)
        : `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json
}

/** Consume the SSE contract ({"delta"} … {"done"}) from POST /api/cofounder. */
async function consumeSse(
  res: Response,
  onDelta: (delta: string) => void,
  onDone: (done: DoneEvent) => void,
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      let parsed: { delta?: string; done?: boolean } & Partial<DoneEvent>
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }
      if (typeof parsed.delta === 'string' && parsed.delta.length > 0) onDelta(parsed.delta)
      if (parsed.done === true) onDone(parsed as DoneEvent)
    }
  }
}

const statusTone = (status: string | null | undefined): 'ok' | 'warn' | 'err' | 'accent' | 'neutral' => {
  switch (status) {
    case 'done':
      return 'ok'
    case 'active':
      return 'accent'
    case 'paused':
      return 'warn'
    default:
      return 'neutral'
  }
}

const jobTone = (status: string | null | undefined): 'ok' | 'warn' | 'err' | 'accent' | 'neutral' => {
  switch (status) {
    case 'DONE':
      return 'ok'
    case 'RUNNING':
      return 'accent'
    case 'QUEUED':
      return 'warn'
    case 'REJECTED':
      return 'err'
    default:
      return 'neutral'
  }
}

const runTone = (status: string, stale: boolean): 'ok' | 'warn' | 'err' | 'accent' | 'neutral' => {
  if (stale) return 'warn'
  switch (status) {
    case 'complete':
    case 'complete-with-warning':
      return status === 'complete' ? 'ok' : 'warn'
    case 'failed':
      return 'err'
    case 'running':
      return 'accent'
    default:
      return 'neutral'
  }
}

/* ---------- primitives ---------- */

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: 12, padding: 14, background: 'var(--theme-elevation-50)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--theme-elevation-500)' }}>{title}</span>
      {right}
    </div>
    {children}
  </div>
)

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--theme-elevation-500)', marginBottom: 6 }}>{children}</div>
)

const Bubble: React.FC<{ turn: ThreadTurn }> = ({ turn }) => {
  if (turn.role === 'system') {
    return (
      <div style={{ alignSelf: 'center', maxWidth: '94%', background: 'var(--theme-elevation-50)', border: '1px dashed var(--theme-elevation-200)', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, color: 'var(--theme-elevation-500)', fontStyle: 'italic' }}>
        {turn.content}
      </div>
    )
  }
  const isUser = turn.role === 'user'
  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
      <div
        style={{
          background: isUser ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-50)',
          border: isUser ? 'none' : '1px solid var(--theme-elevation-200)',
          borderRadius: 12, padding: '10px 12px', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5,
        }}
      >
        {turn.content}
      </div>
    </div>
  )
}

const Chip: React.FC<{ tone: 'ok' | 'warn' | 'err' | 'accent' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
  const map: Record<string, { fg: string; bg: string; border: string }> = {
    ok: { fg: 'var(--theme-success-400)', bg: 'var(--theme-success-50)', border: 'var(--theme-success-400)' },
    warn: { fg: 'var(--theme-warning-400)', bg: 'var(--theme-warning-50)', border: 'var(--theme-warning-400)' },
    err: { fg: 'var(--theme-error-400)', bg: 'var(--theme-error-50)', border: 'var(--theme-error-400)' },
    accent: { fg: 'var(--theme-accent-400)', bg: 'var(--theme-accent-50)', border: 'var(--theme-accent-400)' },
    neutral: { fg: 'var(--theme-elevation-500)', bg: 'var(--theme-elevation-50)', border: 'var(--theme-elevation-200)' },
  }
  const c = map[tone]
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, border: `1px solid ${c.border}`, color: c.fg, background: c.bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--theme-text)',
  background: 'var(--theme-bg)', border: '1px solid var(--theme-elevation-200)', outline: 'none',
}

const smallSelect: React.CSSProperties = {
  fontSize: 11.5, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-bg)', color: 'inherit',
}

const linkStyle: React.CSSProperties = {
  fontSize: 11.5, color: 'var(--theme-accent-400)', textDecoration: 'none', fontWeight: 600,
}

const buttonStyle = (disabled: boolean, accent: string): React.CSSProperties => ({
  padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, color: '#ffffff', background: accent, whiteSpace: 'nowrap',
})

const smallButton: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer',
  color: '#ffffff', background: 'var(--theme-elevation-400)',
}
