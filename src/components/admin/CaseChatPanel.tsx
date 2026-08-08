'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { agentForStatus, hasComputedScores } from '@/lib/reviewChat/roles'

/**
 * Blueprint §10 — the CaseFile AI chat panel, mounted as a custom document
 * view on the research-queue edit page (/admin/collections/research-queue/:id/chat).
 *
 * Governance model (spec §3.3): the role is derived from the case's live
 * status; the panel never chooses an agent. Agent output is shown as a
 * DRAFT — the only write path is the human "Apply" button, which sends the
 * version this panel last loaded so a stale panel gets a 409 instead of
 * clobbering a concurrent edit. Chat history lives on the case's aiRuns
 * array (each run records the user prompt + assistant summary), so the
 * thread survives sessions.
 */
export default function CaseChatPanel(props: Record<string, unknown>) {
  const caseId = useMemo(() => resolveCaseId(props), [props])

  const [doc, setDoc] = useState<CaseDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)
  const [pending, setPending] = useState<{ user: string } | null>(null)

  const refresh = useCallback(async () => {
    if (caseId === null) return
    try {
      const res = await fetch(`/api/research-queue/${caseId}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = (await res.json()) as { doc?: CaseDoc }
      if (!data.doc) throw new Error('Case not found')
      setDoc(data.doc)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case')
    }
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const agent = agentForStatus(doc?.status, hasComputedScores(doc?.computedScores))
  const canSend = agent.kind === 'ai'
  const runs = useMemo(() => (doc?.aiRuns ?? []).slice().reverse(), [doc?.aiRuns])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy || caseId === null) return
    setInput('')
    setBusy(true)
    setNotice(null)
    setPending({ user: text })
    try {
      const res = await fetch('/api/review-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, message: text }),
      })
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!res.ok) throw new Error(body?.message ? String(body.message) : `HTTP ${res.status}`)
      if (body?.message && !body?.runId) {
        // No active agent for this stage — surface the server's own line.
        setNotice({ tone: 'warn', text: String(body.message) })
      }
      await refresh()
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setPending(null)
      setBusy(false)
    }
  }

  const applyDraft = async () => {
    if (!doc || busy || caseId === null || !agent.applyable) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/review-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, apply: true, expectedVersion: doc.version ?? 1 }),
      })
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!res.ok) throw new Error(body?.message ? String(body.message) : `HTTP ${res.status}`)
      setNotice({
        tone: 'ok',
        text: 'Draft applied to the CaseFile — version bumped, audit event logged.',
      })
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed'
      setNotice({
        tone: 'err',
        text: msg.includes('409') || msg.includes('changed by someone else')
          ? 'Version conflict: this case was edited elsewhere since you loaded it. Reload and re-apply.'
          : msg,
      })
    } finally {
      setBusy(false)
    }
  }

  if (caseId === null) {
    return (
      <div style={{ padding: 24, color: 'var(--theme-elevation-500)', fontFamily: 'var(--font-body)' }}>
        Could not resolve the case id — open this tab from a case&rsquo;s edit page.
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ff6b6b', fontFamily: 'var(--font-body)' }}>
        CaseFile chat unavailable: {error}
      </div>
    )
  }

  if (!doc) {
    return (
      <div style={{ padding: 24, color: 'var(--theme-elevation-500)' }}>Loading case file…</div>
    )
  }

  return (
    <div style={{ padding: '8px 24px 32px', fontFamily: 'var(--font-body)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, margin: '0 0 2px' }}>CaseFile AI chat</h1>
          <p style={{ margin: 0, color: 'var(--theme-elevation-500)', fontSize: 13 }}>
            {String(doc.caseNumber ?? `#PS-${doc.id}`)} · {String(doc.operatorName ?? '—')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip tone="neutral">{String(doc.status ?? '—')}</Chip>
          <Chip tone="accent">v{doc.version ?? 1}</Chip>
        </div>
      </div>

      {/* Active agent banner — derived from live status, never client-chosen. */}
      <div
        style={{
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 16,
          background: 'var(--theme-elevation-50)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{agent.label}</span>
          <Chip tone={agent.kind === 'ai' ? 'accent' : agent.kind === 'human' ? 'ok' : 'neutral'}>
            {agent.kind === 'ai' ? 'AI agent' : agent.kind === 'human' ? 'Human stage' : 'No agent'}
          </Chip>
          {agent.applyable ? <Chip tone="ok">Apply writes {agent.changedFields.join(' + ')}</Chip> : null}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--theme-elevation-500)', lineHeight: 1.5 }}>
          {agent.description}
        </p>
      </div>

      <p
        style={{
          margin: '0 0 16px',
          fontSize: 12,
          color: 'var(--theme-elevation-500)',
          fontStyle: 'italic',
        }}
      >
        Agents read only allowlisted fields (commission-shaped data never reaches a prompt) and never
        publish autonomously — every draft needs your explicit Apply. Output is a safe placeholder
        scaffold: all claims are marked unverified until a human confirms.
      </p>

      {/* Thread */}
      <div
        aria-live="polite"
          style={{
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 10,
            minHeight: 320,
            maxHeight: '52vh',
            overflowY: 'auto',
            padding: 14,
            background: 'var(--theme-bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
        <SystemBubble text="Connected to the CaseFile. Ask the active agent to verify facts, pull evidence, or draft stage output. Use Apply to write a draft to the case (version-checked)." />

        {runs.length === 0 ? (
          <div style={{ color: 'var(--theme-elevation-500)', fontSize: 12.5, textAlign: 'center', padding: '24px 0' }}>
            No agent runs yet for this case.
          </div>
        ) : (
          runs.map((run) => <RunCard key={run.runId} run={run} />)
        )}

        {pending ? (
          <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
            <div
              style={{
                background: 'var(--theme-elevation-100)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
              }}
            >
              {pending.user}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--theme-elevation-500)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--theme-accent-400)' }} />
              Running {agent.label || 'agent'}…
            </div>
          </div>
        ) : null}
      </div>

      {notice ? (
        <div
          style={{
            marginTop: 12,
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: 12.5,
            border: '1px solid',
            color:
              notice.tone === 'ok'
                ? 'var(--theme-success-400)'
                : notice.tone === 'warn'
                  ? 'var(--theme-warning-400)'
                  : 'var(--theme-error-400)',
            borderColor:
              notice.tone === 'ok'
                ? 'var(--theme-success-400)'
                : notice.tone === 'warn'
                  ? 'var(--theme-warning-400)'
                  : 'var(--theme-error-400)',
            background: 'var(--theme-elevation-50)',
          }}
        >
          {notice.text}
        </div>
      ) : null}

      {/* Apply bar (only for applyable AI stages) */}
      {agent.applyable ? (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={applyDraft}
            disabled={busy}
            style={buttonStyle(busy, 'var(--theme-success-500)')}
          >
            Apply approved draft to CaseFile (v{doc.version ?? 1})
          </button>
        </div>
      ) : null}

      {/* Input */}
      <form onSubmit={sendMessage} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <textarea
          aria-label="Message the active agent"
          value={input}
          maxLength={4000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage(e)
          }}
          rows={2}
          disabled={busy || !canSend}
          placeholder={
            agent.kind === 'ai'
              ? `Ask the ${agent.label} to verify facts or draft stage output… (⌘/Ctrl + Enter to send)`
              : canSend
                ? 'Type a message to run the active agent…'
                : 'No agent runs at this stage — nothing will be run or recorded.'
          }
          style={{
            flex: 1,
            resize: 'vertical',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            color: 'var(--theme-text)',
            background: 'var(--theme-bg)',
            border: '1px solid var(--theme-elevation-200)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={busy || !canSend || !input.trim()}
          style={buttonStyle(busy || !canSend || !input.trim(), 'var(--theme-accent-400)')}
        >
          Send
        </button>
      </form>
    </div>
  )
}

/* ---------- helpers ---------- */

type CaseDoc = {
  id: string | number
  caseNumber?: string | null
  operatorName?: string | null
  status?: string | null
  version?: number | null
  casinoType?: string | null
  computedScores?: Record<string, unknown> | null
  aiRuns?: AiRun[]
}

type AiRun = {
  runId: string
  agentRole?: string | null
  status?: string | null
  startedAt?: string | null
  completedAt?: string | null
  input?: { message?: string | null } | null
  output?: Record<string, unknown> | null
  messages?: Array<{ role?: string | null; content?: string | null; timestamp?: string | null }>
}

const ROLE_LABELS: Record<string, string> = {
  'desk-researcher': 'Desk Researcher',
  'score-analyst': 'Score Analyst',
  'editorial-writer': 'Editorial Writer',
  'integrity-checker': 'Integrity Checker',
  monitor: 'Monitor',
  chat: 'Chat',
}

/** The document id comes straight from the view props (docID on custom
 *  document views); fall back to initPageResult / the doc prop / the URL. */
function resolveCaseId(props: Record<string, unknown>): string | number | null {
  const direct = props.docID as string | number | null | undefined
  if (direct !== undefined && direct !== null) return direct
  const init = props.initPageResult as { docID?: string | number } | undefined
  if (init?.docID !== undefined && init.docID !== null) return init.docID
  const doc = props.doc as { id?: string | number } | undefined
  if (doc?.id !== undefined && doc.id !== null) return doc.id
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(
      /\/admin\/collections\/research-queue\/([^/]+)(?:\/|$)/,
    )
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return null
}

const Chip = ({ tone, children }: { tone: 'ok' | 'warn' | 'err' | 'accent' | 'neutral'; children: React.ReactNode }) => {
  const map: Record<string, { fg: string; bg: string; border: string }> = {
    ok: { fg: 'var(--theme-success-400)', bg: 'var(--theme-success-50)', border: 'var(--theme-success-400)' },
    warn: { fg: 'var(--theme-warning-400)', bg: 'var(--theme-warning-50)', border: 'var(--theme-warning-400)' },
    err: { fg: 'var(--theme-error-400)', bg: 'var(--theme-error-50)', border: 'var(--theme-error-400)' },
    accent: { fg: 'var(--theme-accent-400)', bg: 'var(--theme-accent-50)', border: 'var(--theme-accent-400)' },
    neutral: { fg: 'var(--theme-elevation-500)', bg: 'var(--theme-elevation-50)', border: 'var(--theme-elevation-200)' },
  }
  const c = map[tone]
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        color: c.fg,
        background: c.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

const SystemBubble = ({ text }: { text: string }) => (
  <div
    style={{
      alignSelf: 'center',
      maxWidth: '94%',
      background: 'var(--theme-elevation-50)',
      border: '1px dashed var(--theme-elevation-200)',
      borderRadius: 10,
      padding: '9px 12px',
      fontSize: 12,
      color: 'var(--theme-elevation-500)',
      fontStyle: 'italic',
    }}
  >
    {text}
  </div>
)

/** One persisted agent run: the user's prompt + the assistant summary + expandable output. */
const RunCard = ({ run }: { run: AiRun }) => {
  const label = ROLE_LABELS[run.agentRole ?? ''] ?? run.agentRole ?? 'Agent'
  const userText = run.input?.message ?? lastMessage(run, 'user')
  const assistantText = lastMessage(run, 'assistant')
  const when = run.startedAt ? new Date(run.startedAt).toLocaleString() : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {userText ? (
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div
            style={{
              background: 'var(--theme-elevation-100)',
              borderRadius: 12,
              padding: '10px 12px',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {userText}
          </div>
        </div>
      ) : null}

      <div style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, fontSize: 11 }}>
          <span style={{ fontWeight: 600, color: 'var(--theme-elevation-500)' }}>{label}</span>
          <Chip tone={run.status === 'complete' ? 'ok' : run.status === 'failed' ? 'err' : 'neutral'}>
            {run.status ?? 'pending'}
          </Chip>
          {when ? <span style={{ color: 'var(--theme-elevation-500)' }}>{when}</span> : null}
        </div>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {assistantText ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{assistantText}</div>
          ) : (
            <div style={{ color: 'var(--theme-elevation-500)' }}>Run completed — no summary recorded.</div>
          )}
          {run.output && Object.keys(run.output).length > 0 ? (
            <details style={{ marginTop: 8, fontSize: 12 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--theme-elevation-500)', fontWeight: 600 }}>
                View structured output
              </summary>
              <pre
                style={{
                  margin: '8px 0 0',
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--theme-bg)',
                  border: '1px solid var(--theme-elevation-200)',
                  overflow: 'auto',
                  maxHeight: 260,
                  fontSize: 11,
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {JSON.stringify(run.output, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function lastMessage(run: AiRun, role: 'user' | 'assistant'): string | null {
  const msgs = run.messages ?? []
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === role && msgs[i].content) return msgs[i].content as string
  }
  return null
}

function buttonStyle(disabled: boolean, accent: string): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    color: '#ffffff',
    background: accent,
    whiteSpace: 'nowrap',
  }
}
