'use client'

import React, { useState, useEffect } from 'react'

export interface CaseDoc {
  id: string | number
  caseNumber: string
  operatorName: string
  operatorUrl?: string
  casinoType: 'traditional' | 'crypto'
  status: 'queued' | 'desk-research' | 'hands-on-testing' | 'editorial' | 'integrity-check' | 'published' | 'monitoring'
  version?: number
  licenseJurisdiction?: string
  licenseNumber?: string
  parentCompany?: string
  deskResearchOutput?: any
  evidenceRegister?: any[]
  computedScores?: any
  aiRuns?: any[]
  updatedAt?: string
}

export interface AgentLogDoc {
  id: string | number
  event: string
  agentId?: string
  operator?: string
  pageId?: string
  details?: any
  timestamp?: string
}

/* Phase H1 — stage colors map onto the brand semantic set: coral = agent
   action, evidence = measurement, warning = the integrity gate, success =
   live/published, neutral = queued/editorial. */
const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: 'Queued', color: 'bg-dusk-2 text-paper-dim border-line' },
  'desk-research': { label: 'Desk Research', color: 'bg-coral/15 text-coral border-coral/30' },
  'hands-on-testing': { label: 'Hands-On Testing', color: 'bg-evidence/15 text-evidence border-evidence/30' },
  editorial: { label: 'Editorial Writing', color: 'bg-paper-dim/10 text-paper border-line' },
  'integrity-check': { label: 'Integrity Check', color: 'bg-warning/15 text-warning border-warning/30' },
  published: { label: 'Published', color: 'bg-success text-ink-2 border-success' },
  /* Monitoring stays visually distinct from Published: solid green = done,
     dashed outline = still on the wire (reviewer S2, H1). */
  monitoring: { label: 'Monitoring', color: 'bg-success/10 text-success border-dashed border-success/40' },
}

export function TeamDashboardClient({ initialCases, initialLogs }: { initialCases: CaseDoc[]; initialLogs: AgentLogDoc[] }) {
  const [cases, setCases] = useState<CaseDoc[]>(initialCases)
  const [logs, setLogs] = useState<AgentLogDoc[]>(initialLogs)
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [activeCase, setActiveCase] = useState<CaseDoc | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant' | 'system'; text: string; data?: any }>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)

  const filteredCases = selectedStage === 'all'
    ? cases
    : cases.filter(c => c.status === selectedStage)

  const handleOpenAiDrawer = (c: CaseDoc) => {
    setActiveCase(c)
    setApplyStatus(null)
    setChatMessages([
      {
        sender: 'system',
        text: `AI Assistant connected to case ${c.caseNumber} (${c.operatorName}). Active Role: ${c.status === 'desk-research' ? 'Desk Researcher' : c.status}. Allowed to read allowlisted fields only. Sensitive data (accountProfile/internalNotes) is strictly isolated.`,
      },
    ])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !activeCase || isLoading) return

    const userText = inputMessage
    setInputMessage('')
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/review-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: activeCase.id, message: userText }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.assistantResponse || 'Desk Research draft generated. Review structured evidence output below.',
          data: data.deskResearchOutput ? { deskResearchOutput: data.deskResearchOutput, evidenceRegister: data.evidenceRegister } : undefined,
        },
      ])

      // Refresh logs
      fetchLogs()
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'system', text: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyDraft = async () => {
    if (!activeCase || isLoading) return
    setIsLoading(true)
    setApplyStatus(null)

    try {
      const res = await fetch('/api/review-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: activeCase.id, apply: true }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setApplyStatus('Draft successfully applied to CaseFile! Concurrency version bumped and audit event logged.')

      // Refresh cases and logs
      fetchCases()
      fetchLogs()
    } catch (err: any) {
      setApplyStatus(`Apply failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/dashboard/cases')
      if (res.ok) {
        const data = await res.json()
        if (data.cases) setCases(data.cases)
      }
    } catch (_) {}
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/dashboard/logs')
      if (res.ok) {
        const data = await res.json()
        if (data.logs) setLogs(data.logs)
      }
    } catch (_) {}
  }

  return (
    <div className="min-h-screen bg-ink text-paper font-sans p-6">
      {/* Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-paper">Playerside Team AI Control Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
              Live System Active
            </span>
          </div>
          <p className="text-sm text-paper-dim mt-1">
            Real-time pipeline monitoring, automated agent execution, and human-in-the-loop governance.
          </p>
        </div>

        {/* Top Metrics Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-dusk border border-line rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-paper-dim uppercase tracking-wider font-semibold">Active Cases</div>
            <div className="text-xl font-bold text-paper">{cases.length}</div>
          </div>
          <div className="bg-dusk border border-line rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-paper-dim uppercase tracking-wider font-semibold">Desk Research</div>
            <div className="text-xl font-bold text-coral">
              {cases.filter(c => c.status === 'desk-research').length}
            </div>
          </div>
          <div className="bg-dusk border border-line rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-paper-dim uppercase tracking-wider font-semibold">Audit Logs</div>
            <div className="text-xl font-bold text-evidence">{logs.length}</div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 my-6 overflow-x-auto pb-2">
        <span className="text-xs font-semibold text-paper-dim uppercase tracking-wider mr-2">Filter Stage:</span>
        {['all', 'queued', 'desk-research', 'hands-on-testing', 'editorial', 'integrity-check', 'published', 'monitoring'].map((stage) => {
          const isSelected = selectedStage === stage
          const stageInfo = STAGE_LABELS[stage] || { label: 'All Cases', color: '' }
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-paper text-ink-2 shadow-md font-bold'
                  : 'bg-dusk text-paper-dim hover:text-paper hover:bg-dusk-2 border border-line'
              }`}
            >
              {stage === 'all' ? 'All Stages' : stageInfo.label}
            </button>
          )
        })}
      </div>

      {/* Main Grid: Cases Board + Audit Trail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Case Cards Grid (3 Columns) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-start">
          {filteredCases.length === 0 ? (
            <div className="col-span-2 bg-dusk/50 border border-dashed border-line rounded-xl p-12 text-center text-paper-dim">
              No cases currently in stage <span className="font-semibold">{selectedStage}</span>.
            </div>
          ) : (
            filteredCases.map((c) => {
              const stageBadge = STAGE_LABELS[c.status] || { label: c.status, color: 'bg-dusk-2 text-paper-dim border-line' }
              return (
                <div
                  key={c.id}
                  className="kinetic bg-dusk border border-line rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono text-paper-dim font-semibold">{c.caseNumber || `#PS-${c.id}`}</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${stageBadge.color}`}>
                        {stageBadge.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-paper group-hover:text-coral transition-colors">
                      {c.operatorName}
                    </h3>
                    {c.operatorUrl && (
                      <a href={c.operatorUrl} target="_blank" rel="noreferrer" className="text-xs text-paper-dim hover:underline">
                        {c.operatorUrl}
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-ink-2/60 rounded-lg text-xs">
                      <div>
                        <span className="text-paper-dim">Jurisdiction:</span>
                        <div className="font-semibold text-paper">{c.licenseJurisdiction || 'Unverified'}</div>
                      </div>
                      <div>
                        <span className="text-paper-dim">Type:</span>
                        <div className="font-semibold text-paper capitalize">{c.casinoType || 'Traditional'}</div>
                      </div>
                      <div>
                        <span className="text-paper-dim">Licence #:</span>
                        <div className="font-semibold text-paper font-mono text-[11px] truncate">
                          {c.licenseNumber || 'Unverified'}
                        </div>
                      </div>
                      <div>
                        <span className="text-paper-dim">Version:</span>
                        <div className="font-semibold text-evidence font-mono">v{c.version ?? 1}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                    <span className="text-xs text-paper-dim">
                      AI Runs: <span className="font-mono text-paper font-semibold">{c.aiRuns?.length || 0}</span>
                    </span>
                    <button
                      onClick={() => handleOpenAiDrawer(c)}
                      className="px-3 py-1.5 bg-coral hover:bg-coral/90 text-ink-2 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Open AI Assistant
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Audit Trail Sidebar (1 Column) */}
        <div className="bg-dusk border border-line rounded-xl p-5 h-[calc(100vh-180px)] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <h2 className="text-sm font-bold uppercase tracking-wider text-paper flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Live Audit Trail
            </h2>
            <button onClick={fetchLogs} className="text-xs text-paper-dim hover:text-paper transition-colors">
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 text-xs">
            {logs.length === 0 ? (
              <div className="text-paper-dim/60 text-center py-8">No audit events recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 bg-ink-2/80 border border-line rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-coral font-semibold">{log.event}</span>
                    <span className="text-paper-dim">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <div className="text-paper font-medium truncate">
                    {log.operator || `Case #${log.pageId}`}
                  </div>
                  {log.agentId && <div className="text-[10px] text-paper-dim truncate">Actor: {log.agentId}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Slide-over Drawer */}
      {activeCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-ink-2 border-l border-line h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-line flex items-center justify-between bg-dusk/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-coral font-bold">{activeCase.caseNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-dusk-2 text-paper">
                    {activeCase.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-paper mt-1">{activeCase.operatorName} — AI Agent Panel</h2>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="p-2 text-paper-dim hover:text-paper rounded-lg hover:bg-dusk transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl text-xs space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-coral/15 border border-coral/30 text-paper ml-8'
                      : msg.sender === 'system'
                      ? 'bg-dusk border border-line text-paper-dim italic'
                      : 'bg-dusk border border-line text-paper mr-8'
                  }`}
                >
                  <div className="font-semibold text-[11px] text-paper-dim uppercase tracking-wider">
                    {msg.sender === 'user' ? 'Human Reviewer' : msg.sender === 'system' ? 'System Governance' : 'Desk Researcher Agent'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                  {/* Render Desk Research Evidence JSON Output if present */}
                  {msg.data?.deskResearchOutput && (
                    <div className="mt-3 p-3 bg-ink-2 rounded-lg border border-line space-y-3 font-mono text-[11px]">
                      <div className="font-bold text-coral uppercase tracking-wider text-[10px]">
                        Drafted Research Output
                      </div>

                      <div className="space-y-1">
                        <div className="text-paper-dim font-semibold">Primary License:</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-coral/15 text-coral border border-coral/30 font-bold uppercase">
                            {msg.data.deskResearchOutput.licensing?.primary?.confidence || 'unverified'}
                          </span>
                          <span className="text-paper">
                            {msg.data.deskResearchOutput.licensing?.primary?.value || 'Check regulator register'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-paper-dim font-semibold">Ownership Entity:</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-coral/15 text-coral border border-coral/30 font-bold uppercase">
                            {msg.data.deskResearchOutput.ownership?.legalEntity?.confidence || 'unverified'}
                          </span>
                          <span className="text-paper">
                            {msg.data.deskResearchOutput.ownership?.legalEntity?.value || 'Company registry verification required'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="p-4 bg-dusk border border-line rounded-xl text-xs text-paper-dim animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-coral animate-ping"></span>
                  Desk Researcher is synthesizing verification queries...
                </div>
              )}
            </div>

            {/* Apply & Message Form Footer */}
            <div className="p-4 border-t border-line bg-dusk/80 space-y-3">
              {applyStatus && (
                <div className="p-2.5 bg-success/15 border border-success/30 rounded-lg text-xs text-success font-medium">
                  {applyStatus}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyDraft}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-ink-2 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply Approved Draft to CaseFile (v{activeCase.version ?? 1})
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Desk Researcher to verify facts or pull evidence..."
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2 bg-ink-2 border border-line focus:border-coral rounded-lg text-xs text-paper placeholder-paper-dim outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-coral hover:bg-coral/90 disabled:opacity-50 text-ink-2 font-bold text-xs rounded-lg transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
