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
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
              ← Back to Queue
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold">{caseDoc.caseNumber}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-2">{caseDoc.operatorName} — Case File Inspector</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase tracking-wider">
            Stage: {caseDoc.status}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-zinc-900 text-emerald-400 border border-zinc-800 font-bold">
            Version v{caseDoc.version ?? 1}
          </span>
        </div>
      </div>

      {/* Case Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Licensing Claim</div>
          <div className="text-sm font-semibold text-zinc-200">{caseDoc.licenseJurisdiction || 'Unverified'}</div>
          <div className="text-xs text-zinc-400 font-mono">{caseDoc.licenseNumber || 'No licence number logged'}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Casino Category</div>
          <div className="text-sm font-semibold text-zinc-200 capitalize">{caseDoc.casinoType || 'Traditional'}</div>
          <div className="text-xs text-zinc-400">Rubric: {caseDoc.casinoType === 'crypto' ? 'Crypto 9-Cat' : 'Traditional 8-Cat'}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Evidence Files</div>
          <div className="text-xl font-bold text-sky-400">{caseDoc.evidenceRegister?.length || 0} Registered</div>
          <div className="text-xs text-zinc-400">Vercel Blob Storage</div>
        </div>
      </div>

      {/* Desk Research Output Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center justify-between">
          <span>Desk Research Output</span>
          <span className="text-xs font-normal text-zinc-400 font-mono">Allowlist Verified</span>
        </h2>

        {caseDoc.deskResearchOutput ? (
          <pre className="bg-zinc-950 p-4 rounded-xl text-xs text-zinc-300 font-mono overflow-x-auto border border-zinc-800/80">
            {JSON.stringify(caseDoc.deskResearchOutput, null, 2)}
          </pre>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            No Desk Research output populated yet. Open the AI Assistant in the dashboard queue to generate a research draft.
          </div>
        )}
      </div>

      {/* AI Runs Trail */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">AI Execution Runs ({caseDoc.aiRuns?.length || 0})</h2>

        {(!caseDoc.aiRuns || caseDoc.aiRuns.length === 0) ? (
          <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            No agent runs recorded for this case file yet.
          </div>
        ) : (
          <div className="space-y-3">
            {caseDoc.aiRuns.map((run: any, idx: number) => (
              <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono text-amber-400 font-bold">{run.agentRole}</div>
                  <div className="text-zinc-500 text-[11px] font-mono mt-0.5">Run ID: {run.runId}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {run.status}
                  </span>
                  <div className="text-zinc-500 text-[10px] mt-1">{run.completedAt || run.startedAt}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
