'use client'

import React from 'react'
import type { PayoutEntry } from './LivePayoutLeaderboard'

export function EvidenceDrawer({ entry, onClose }: { entry: PayoutEntry | null; onClose: () => void }) {
  if (!entry) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl p-6 overflow-y-auto space-y-6">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                {entry.verificationStatus}
              </span>
              <span className="text-xs font-mono text-zinc-500">{entry.evidenceHash}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{entry.operatorName} — Tested Evidence File</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Evidence Card Details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 text-xs font-mono">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <span className="text-zinc-400">Measured Payout Speed:</span>
            <span className="text-lg font-bold text-amber-400">{entry.testedTime}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Payment Method:</span>
            <span className="text-zinc-200 font-semibold">{entry.method}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Test Amount:</span>
            <span className="text-zinc-200 font-semibold">{entry.amount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Date Logged:</span>
            <span className="text-zinc-200">{entry.testedAt}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Storage Adapter:</span>
            <span className="text-emerald-400">Vercel Blob Private Store</span>
          </div>
        </div>

        {/* Evidence Log Notes */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2 text-xs">
          <div className="font-bold text-zinc-300 uppercase font-mono text-[11px]">Audit Execution Log</div>
          <p className="text-zinc-400 leading-relaxed text-[11.5px]">
            Withdrawal test initiated by authenticated Playerside reviewer. Test account requested withdrawal to real blockchain wallet. Block confirmation and timestamp recorded directly from public network ledger.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors shadow-md"
          >
            Close Evidence Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
