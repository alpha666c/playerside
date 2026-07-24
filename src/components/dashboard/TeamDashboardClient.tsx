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

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: 'Queued', color: 'bg-zinc-700 text-zinc-300' },
  'desk-research': { label: 'Desk Research', color: 'bg-amber-950/80 text-amber-300 border-amber-800/50' },
  'hands-on-testing': { label: 'Hands-On Testing', color: 'bg-blue-950/80 text-blue-300 border-blue-800/50' },
  editorial: { label: 'Editorial Writing', color: 'bg-purple-950/80 text-purple-300 border-purple-800/50' },
  'integrity-check': { label: 'Integrity Check', color: 'bg-pink-950/80 text-pink-300 border-pink-800/50' },
  published: { label: 'Published', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50' },
  monitoring: { label: 'Monitoring', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/50' },
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6">
      {/* Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Playerside Team AI Control Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live System Active
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time pipeline monitoring, automated agent execution, and human-in-the-loop governance.
          </p>
        </div>

        {/* Top Metrics Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Active Cases</div>
            <div className="text-xl font-bold text-zinc-100">{cases.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Desk Research</div>
            <div className="text-xl font-bold text-amber-400">
              {cases.filter(c => c.status === 'desk-research').length}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Audit Logs</div>
            <div className="text-xl font-bold text-sky-400">{logs.length}</div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 my-6 overflow-x-auto pb-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2">Filter Stage:</span>
        {['all', 'queued', 'desk-research', 'hands-on-testing', 'editorial', 'integrity-check', 'published', 'monitoring'].map((stage) => {
          const isSelected = selectedStage === stage
          const stageInfo = STAGE_LABELS[stage] || { label: 'All Cases', color: '' }
          return (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-zinc-100 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80'
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
            <div className="col-span-2 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
              No cases currently in stage <span className="font-semibold">{selectedStage}</span>.
            </div>
          ) : (
            filteredCases.map((c) => {
              const stageBadge = STAGE_LABELS[c.status] || { label: c.status, color: 'bg-zinc-800 text-zinc-300' }
              return (
                <div
                  key={c.id}
                  className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-5 transition-all flex flex-col justify-between shadow-sm hover:shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono text-zinc-400 font-semibold">{c.caseNumber || `#PS-${c.id}`}</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${stageBadge.color}`}>
                        {stageBadge.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                      {c.operatorName}
                    </h3>
                    {c.operatorUrl && (
                      <a href={c.operatorUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 hover:underline">
                        {c.operatorUrl}
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-2 my-4 p-3 bg-zinc-950/60 rounded-lg text-xs">
                      <div>
                        <span className="text-zinc-500">Jurisdiction:</span>
                        <div className="font-semibold text-zinc-300">{c.licenseJurisdiction || 'Unverified'}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Type:</span>
                        <div className="font-semibold text-zinc-300 capitalize">{c.casinoType || 'Traditional'}</div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Licence #:</span>
                        <div className="font-semibold text-zinc-300 font-mono text-[11px] truncate">
                          {c.licenseNumber || 'Unverified'}
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-500">Version:</span>
                        <div className="font-semibold text-emerald-400 font-mono">v{c.version ?? 1}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500">
                      AI Runs: <span className="font-mono text-zinc-300 font-semibold">{c.aiRuns?.length || 0}</span>
                    </span>
                    <button
                      onClick={() => handleOpenAiDrawer(c)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[calc(100vh-180px)] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Audit Trail
            </h2>
            <button onClick={fetchLogs} className="text-xs text-zinc-400 hover:text-white transition-colors">
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 text-xs">
            {logs.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">No audit events recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-amber-400 font-semibold">{log.event}</span>
                    <span className="text-zinc-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <div className="text-zinc-300 font-medium truncate">
                    {log.operator || `Case #${log.pageId}`}
                  </div>
                  {log.agentId && <div className="text-[10px] text-zinc-500 truncate">Actor: {log.agentId}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Slide-over Drawer */}
      {activeCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400 font-bold">{activeCase.caseNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                    {activeCase.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{activeCase.operatorName} — AI Agent Panel</h2>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
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
                      ? 'bg-amber-950/40 border border-amber-800/50 text-amber-100 ml-8'
                      : msg.sender === 'system'
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 italic'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 mr-8'
                  }`}
                >
                  <div className="font-semibold text-[11px] text-zinc-400 uppercase tracking-wider">
                    {msg.sender === 'user' ? 'Human Reviewer' : msg.sender === 'system' ? 'System Governance' : 'Desk Researcher Agent'}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                  {/* Render Desk Research Evidence JSON Output if present */}
                  {msg.data?.deskResearchOutput && (
                    <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3 font-mono text-[11px]">
                      <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                        Drafted Research Output
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-zinc-400 font-semibold">Primary License:</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800 font-bold uppercase">
                            {msg.data.deskResearchOutput.licensing?.primary?.confidence || 'unverified'}
                          </span>
                          <span className="text-zinc-300">
                            {msg.data.deskResearchOutput.licensing?.primary?.value || 'Check regulator register'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-zinc-400 font-semibold">Ownership Entity:</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800 font-bold uppercase">
                            {msg.data.deskResearchOutput.ownership?.legalEntity?.confidence || 'unverified'}
                          </span>
                          <span className="text-zinc-300">
                            {msg.data.deskResearchOutput.ownership?.legalEntity?.value || 'Company registry verification required'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Desk Researcher is synthesizing verification queries...
                </div>
              )}
            </div>

            {/* Apply & Message Form Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 space-y-3">
              {applyStatus && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-lg text-xs text-emerald-300 font-medium">
                  {applyStatus}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyDraft}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
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
                  className="flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
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
