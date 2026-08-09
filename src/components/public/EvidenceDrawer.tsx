'use client'

import React from 'react'
import type { PayoutEntry } from './LivePayoutLeaderboard'

export function EvidenceDrawer({ entry, onClose }: { entry: PayoutEntry | null; onClose: () => void }) {
  if (!entry) return null

  const isVerified = entry.verificationStatus === 'verified'

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-ink-2/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`Evidence file for ${entry.operatorName}`}
    >
      <div className="flex h-full w-full max-w-xl flex-col space-y-6 overflow-y-auto border-l border-line bg-ink p-6 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  isVerified
                    ? 'border border-success/50 bg-success/10 text-success'
                    : 'border border-evidence/50 bg-evidence/10 text-evidence'
                }`}
              >
                {entry.verificationStatus}
              </span>
              <span className="font-mono text-xs text-paper-dim">{entry.evidenceHash}</span>
            </div>
            <h2 className="t-h3 mt-1 text-paper">{entry.operatorName} — Tested Evidence File</h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close evidence drawer"
            className="rounded-[10px] p-2 text-paper-dim transition-colors duration-200 hover:bg-dusk hover:text-paper"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Evidence Card Details */}
        <div className="space-y-4 rounded-[10px] border border-line bg-dusk p-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-paper-dim">Measured Payout Speed:</span>
            <span className="t-data text-lg font-semibold text-coral">{entry.testedTime}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-paper-dim">Payment Method:</span>
            <span className="font-semibold text-paper">{entry.method}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-paper-dim">Test Amount:</span>
            <span className="font-semibold text-paper">{entry.amount}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-paper-dim">Date Logged:</span>
            <span className="text-paper">{entry.testedAt}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-paper-dim">Storage Adapter:</span>
            <span className="text-success">Vercel Blob Private Store</span>
          </div>
        </div>

        {/* Evidence Log Notes */}
        <div className="space-y-2 rounded-[10px] border border-line bg-ink-2/60 p-4 text-xs">
          <div className="font-mono text-[11px] font-bold uppercase text-paper-dim">Audit Execution Log</div>
          <p className="text-[11.5px] leading-relaxed text-paper-dim">
            Withdrawal test initiated by authenticated Playerside reviewer. Test account requested withdrawal to real blockchain wallet. Block confirmation and timestamp recorded directly from public network ledger.
          </p>
        </div>

        {/* Action Button */}
        <div className="border-t border-line pt-4">
          <button
            onClick={onClose}
            className="w-full rounded-[10px] bg-coral py-2.5 text-xs font-bold text-ink-2 shadow-md transition-all duration-200 hover:bg-coral/90 hover:shadow-lg active:scale-[0.98]"
          >
            Close Evidence Inspector
          </button>
        </div>
      </div>
    </div>
  )
}
