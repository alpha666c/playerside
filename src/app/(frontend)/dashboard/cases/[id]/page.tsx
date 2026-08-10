import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CaseInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })

  const caseDoc: any = await payload.findByID({
    collection: 'research-queue',
    id,
  }).catch(() => null)

  if (!caseDoc) {
    notFound()
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header Breadcrumb & Actions */}
      <div className="flex items-center justify-between pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-paper-dim hover:text-paper transition-colors">
              ← Back to Queue
            </Link>
            <span className="text-paper-dim/60">/</span>
            <span className="text-xs font-mono text-coral font-bold">{caseDoc.caseNumber}</span>
          </div>
          <h1 className="text-3xl font-bold text-paper mt-2">{caseDoc.operatorName} — Case File Inspector</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-coral/15 text-coral border border-coral/30 uppercase tracking-wider">
            Stage: {caseDoc.status}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-dusk text-evidence border border-line font-bold">
            Version v{caseDoc.version ?? 1}
          </span>
        </div>
      </div>

      {/* Case Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="kinetic bg-dusk border border-line rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-paper-dim uppercase tracking-wider">Licensing Claim</div>
          <div className="text-sm font-semibold text-paper">{caseDoc.licenseJurisdiction || 'Unverified'}</div>
          <div className="text-xs text-paper-dim font-mono">{caseDoc.licenseNumber || 'No licence number logged'}</div>
        </div>

        <div className="kinetic bg-dusk border border-line rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-paper-dim uppercase tracking-wider">Casino Category</div>
          <div className="text-sm font-semibold text-paper capitalize">{caseDoc.casinoType || 'Traditional'}</div>
          <div className="text-xs text-paper-dim">Rubric: {caseDoc.casinoType === 'crypto' ? 'Crypto 9-Cat' : 'Traditional 8-Cat'}</div>
        </div>

        <div className="kinetic bg-dusk border border-line rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-paper-dim uppercase tracking-wider">Evidence Files</div>
          <div className="text-xl font-bold text-evidence">{caseDoc.evidenceRegister?.length || 0} Registered</div>
          <div className="text-xs text-paper-dim">Vercel Blob Storage</div>
        </div>
      </div>

      {/* Desk Research Output Section */}
      <div className="kinetic bg-dusk border border-line rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-paper flex items-center justify-between">
          <span>Desk Research Output</span>
          <span className="text-xs font-normal text-paper-dim font-mono">Allowlist Verified</span>
        </h2>

        {caseDoc.deskResearchOutput ? (
          <pre className="bg-ink-2 p-4 rounded-xl text-xs text-paper font-mono overflow-x-auto border border-line">
            {JSON.stringify(caseDoc.deskResearchOutput, null, 2)}
          </pre>
        ) : (
          <div className="p-8 text-center text-xs text-paper-dim border border-dashed border-line rounded-xl">
            No Desk Research output populated yet. Open the AI Assistant in the dashboard queue to generate a research draft.
          </div>
        )}
      </div>

      {/* AI Runs Trail */}
      <div className="kinetic bg-dusk border border-line rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-paper">AI Execution Runs ({caseDoc.aiRuns?.length || 0})</h2>

        {(!caseDoc.aiRuns || caseDoc.aiRuns.length === 0) ? (
          <div className="p-6 text-center text-xs text-paper-dim border border-dashed border-line rounded-xl">
            No agent runs recorded for this case file yet.
          </div>
        ) : (
          <div className="space-y-3">
            {caseDoc.aiRuns.map((run: any, idx: number) => (
              <div key={idx} className="p-4 bg-ink-2 border border-line rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono text-coral font-bold">{run.agentRole}</div>
                  <div className="text-paper-dim text-[11px] font-mono mt-0.5">Run ID: {run.runId}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-success/15 text-success border border-success/30">
                    {run.status}
                  </span>
                  <div className="text-paper-dim text-[10px] mt-1">{run.completedAt || run.startedAt}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
