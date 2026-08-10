import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export default async function OperatorsDirectoryPage() {
  const payload = await getPayload({ config })

  const operatorsRes = await payload.find({
    collection: 'operators',
    limit: 100,
    sort: 'name',
  })

  const operators = operatorsRes.docs || []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold text-paper tracking-tight">Operator Files Directory</h1>
          <p className="text-sm text-paper-dim mt-1">
            Master records of legal entities, parent companies, incorporation jurisdictions, and sister brand portfolios.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-dusk border border-line rounded-lg text-xs font-mono text-paper">
          Total Operators: <span className="font-bold text-coral">{operators.length}</span>
        </div>
      </div>

      {operators.length === 0 ? (
        <div className="bg-dusk/50 border border-dashed border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-dusk-2 text-paper-dim mx-auto flex items-center justify-center mb-3">
            📂
          </div>
          <h3 className="text-base font-bold text-paper">No Operators Logged Yet</h3>
          <p className="text-xs text-paper-dim max-w-sm mx-auto mt-1">
            Operator records will populate here when commercial intake or research cases create new parent entity rows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {operators.map((op: any) => (
            <div key={op.id} className="kinetic bg-dusk border border-line rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-paper-dim">OP-{op.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-success/15 text-success border border-success/30">
                  Registered
                </span>
              </div>
              <h3 className="text-lg font-bold text-paper">{op.name}</h3>
              {op.incorporationJurisdiction && (
                <div className="text-xs text-paper-dim">
                  Incorporated: <span className="font-semibold text-paper">{op.incorporationJurisdiction}</span>
                </div>
              )}
              {op.legalEntityName && (
                <div className="text-xs text-paper-dim font-mono">Entity: {op.legalEntityName}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
