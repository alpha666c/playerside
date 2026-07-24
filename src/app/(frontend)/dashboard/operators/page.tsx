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
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operator Files Directory</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Master records of legal entities, parent companies, incorporation jurisdictions, and sister brand portfolios.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300">
          Total Operators: <span className="font-bold text-amber-400">{operators.length}</span>
        </div>
      </div>

      {operators.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
            📂
          </div>
          <h3 className="text-base font-bold text-zinc-200">No Operators Logged Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
            Operator records will populate here when commercial intake or research cases create new parent entity rows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {operators.map((op: any) => (
            <div key={op.id} className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">OP-{op.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Registered
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{op.name}</h3>
              {op.incorporationJurisdiction && (
                <div className="text-xs text-zinc-400">
                  Incorporated: <span className="font-semibold text-zinc-200">{op.incorporationJurisdiction}</span>
                </div>
              )}
              {op.legalEntityName && (
                <div className="text-xs text-zinc-500 font-mono">Entity: {op.legalEntityName}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
