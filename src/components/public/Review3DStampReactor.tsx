'use client'

import React, { useState } from 'react'

export interface Review3DStampProps {
  operatorName: string
  overallScore?: number
  isCertified?: boolean
  evidenceHash?: string
  whatsGood?: string[]
  whatsBad?: string[]
  measuredWithdrawalTime?: string
  licenceStatus?: string
}

export function Review3DStampReactor({
  operatorName = 'Aurora Bay Casino [Sample]',
  overallScore = 8.6,
  isCertified = true,
  evidenceHash = 'SAMPLE-REF-2026-S01',
  whatsGood = ['Withdrawal processed in under 5 minutes', 'Licensed by MGA', 'No hidden deposit fees'],
  whatsBad = ['KYC required above €2,000 threshold'],
  measuredWithdrawalTime = 'Illustrative / Not Measured',
  licenceStatus = 'MGA Verified (Sample)',
}: Review3DStampProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [stampAnimationDone, setStampAnimationDone] = useState(false)

  const handleReveal = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
      setTimeout(() => {
        setStampAnimationDone(true)
      }, 400)
    } else {
      setStampAnimationDone(false)
    }
  }

  return (
    <div className="my-8 w-full">
      {/* Interactive Trigger Button */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={handleReveal}
          className="flex cursor-pointer items-center gap-2.5 rounded-[10px] bg-coral px-6 py-3.5 text-sm font-bold text-ink-2 shadow-xl shadow-coral/20 transition-all duration-fast hover:bg-coral/90 hover:shadow-lg active:scale-95"
        >
          <svg className="h-5 w-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
          <span>{isFlipped ? 'FLIP BACK TO OVERVIEW' : 'SEE RESULT OF OUR REVIEW & STAMP FINDINGS'}</span>
        </button>
      </div>

      {/* 3D Perspective Card Container */}
      <div className="perspective-1000 relative min-h-[460px]">
        <div
          className={`transform-style-3d relative h-full w-full transition-transform duration-slow ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD: Overview & Stats */}
          <div className="backface-hidden space-y-6 rounded-2xl border border-line bg-dusk/90 p-6 shadow-panel backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-paper-dim">Operator Overview</span>
                <h3 className="t-h3 mt-1 text-paper">{operatorName}</h3>
              </div>
              <div className="text-right font-mono">
                <span className="block text-xs text-paper-dim">Overall Score</span>
                <span className="t-data text-3xl font-extrabold text-evidence">
                  {overallScore.toFixed(1)} <span className="text-xs text-paper-dim">/ 10</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono sm:grid-cols-4">
              <div className="rounded-[10px] border border-line bg-ink-2 p-3">
                <span className="block text-[10px] text-paper-dim">Measured Payout</span>
                <span className="t-data text-base font-bold text-coral">{measuredWithdrawalTime}</span>
              </div>
              <div className="rounded-[10px] border border-line bg-ink-2 p-3">
                <span className="block text-[10px] text-paper-dim">Licence Standing</span>
                <span className="text-sm font-bold text-success">{licenceStatus}</span>
              </div>
              <div className="rounded-[10px] border border-line bg-ink-2 p-3">
                <span className="block text-[10px] text-paper-dim">Audit Status</span>
                <span className="text-sm font-bold text-paper">Evidence Logged</span>
              </div>
              <div className="rounded-[10px] border border-line bg-ink-2 p-3">
                <span className="block text-[10px] text-paper-dim">Commission Status</span>
                <span className="text-sm font-bold text-evidence">100% Blind</span>
              </div>
            </div>

            <div className="space-y-2 rounded-[10px] border border-line bg-ink-2/80 p-4 text-xs">
              <span className="font-mono text-[11px] font-bold uppercase text-paper-dim">Key Findings:</span>
              <ul className="space-y-1 text-paper-dim">
                {whatsGood.map((good, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-success">✓</span> {good}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 text-center">
              <p className="font-mono text-xs text-paper-dim">
                Click the button above to flip the review card and slam down the 3D Playerside Certification Stamp.
              </p>
            </div>
          </div>

          {/* BACK OF CARD: Flipped Evidence Verdict with 3D Stamp Slam Animation */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-line bg-ink p-6 shadow-panel sm:p-8">
            {/* Background Glow */}
            <div
              className={`pointer-events-none absolute inset-0 transition-opacity duration-slow ${
                isCertified ? 'bg-success/10' : 'bg-coral/10'
              }`}
            ></div>

            {/* 3D STAMP SLAM OVERLAY */}
            {stampAnimationDone && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
                <div
                  className={`rounded-2xl border-4 px-6 py-4 font-mono text-xl font-black uppercase tracking-widest shadow-2xl transition-all duration-med sm:px-8 sm:text-3xl ${
                    isCertified
                      ? 'border-success bg-ink/95 text-success shadow-success/50 animate-in zoom-in-150 duration-fast rotate-[-4deg]'
                      : 'border-coral bg-ink/95 text-coral shadow-coral/50 animate-in zoom-in-150 duration-fast rotate-[4deg]'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className={`h-8 w-8 shrink-0 sm:h-10 sm:w-10 ${isCertified ? 'text-success' : 'text-coral'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-center">{isCertified ? 'CERTIFIED BY PLAYERSIDE' : 'REJECTED BY PLAYERSIDE'}</span>
                  </div>
                  <div className="mt-1 text-center text-[10px] font-normal normal-case tracking-normal text-paper-dim sm:text-xs">
                    VERIFIED IN REGULATOR REGISTER • LOGGED IN VERCEL BLOB
                  </div>
                </div>
              </div>
            )}

            {/* Content under Stamp */}
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-paper-dim">EVIDENCE AUDIT CERTIFICATE</span>
                <span className="t-data text-xs font-bold text-evidence">{evidenceHash}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-ink-2/60 p-2.5">
                  <span className="text-paper-dim">Target Operator:</span>
                  <span className="text-sm font-bold text-paper">{operatorName}</span>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-ink-2/60 p-2.5">
                  <span className="text-paper-dim">Measured Payout:</span>
                  <span className="t-data text-sm font-bold text-coral">{measuredWithdrawalTime}</span>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-ink-2/60 p-2.5">
                  <span className="text-paper-dim">Licence Status:</span>
                  <span className="font-semibold text-paper">{licenceStatus}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-line pt-4 font-mono text-xs">
              <span className="text-paper-dim/70">Playerside Audit Record #2026</span>
              <button
                onClick={handleReveal}
                className="cursor-pointer rounded-[10px] border border-line bg-ink-2 px-4 py-2 text-xs font-semibold text-paper-dim transition-colors duration-fast hover:border-evidence/50 hover:text-paper"
              >
                Flip Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
