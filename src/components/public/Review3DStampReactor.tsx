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
  operatorName,
  overallScore = 8.8,
  isCertified = true,
  evidenceHash = 'EV-FULL-0914-PLAYERSIDE',
  whatsGood = ['Withdrawal processed in under 5 minutes', 'Licensed by MGA', 'No hidden deposit fees'],
  whatsBad = ['KYC required above €2,000 threshold'],
  measuredWithdrawalTime = '4m 12s',
  licenceStatus = 'Active & Verified',
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
    <div className="w-full my-8">
      {/* Interactive Trigger Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleReveal}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-extrabold text-sm rounded-xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center gap-2.5 cursor-pointer font-sans"
        >
          <svg className="w-5 h-5 text-zinc-950 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
          <span>{isFlipped ? 'FLIP BACK TO OVERVIEW' : 'SEE RESULT OF OUR REVIEW & STAMP FINDINGS'}</span>
        </button>
      </div>

      {/* 3D Perspective Card Container */}
      <div className="perspective-1000 min-h-[460px] relative">
        <div
          className={`w-full h-full transition-transform duration-700 transform-style-3d relative ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD: Overview & Stats */}
          <div className="backface-hidden bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Operator Overview</span>
                <h3 className="text-2xl font-bold text-white mt-1">{operatorName}</h3>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-zinc-400 block">Overall Score</span>
                <span className="text-3xl font-extrabold text-amber-400">{overallScore.toFixed(1)} <span className="text-xs text-zinc-500">/ 10</span></span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block text-[10px]">Measured Payout</span>
                <span className="text-amber-400 font-bold text-base">{measuredWithdrawalTime}</span>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block text-[10px]">Licence Standing</span>
                <span className="text-emerald-400 font-bold text-sm">{licenceStatus}</span>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block text-[10px]">Audit Status</span>
                <span className="text-zinc-200 font-bold text-sm">Evidence Logged</span>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-zinc-500 block text-[10px]">Commission Status</span>
                <span className="text-sky-400 font-bold text-sm">100% Blind</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <span className="text-zinc-400 font-mono text-[11px] uppercase font-bold">Key Findings:</span>
              <ul className="space-y-1 text-zinc-300">
                {whatsGood.map((good, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {good}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-zinc-400 font-mono">
                Click the button above to flip the review card and slam down the 3D Playerside Certification Stamp.
              </p>
            </div>
          </div>

          {/* BACK OF CARD: Flipped Evidence Verdict with 3D Stamp Slam Animation */}
          <div className="rotate-y-180 backface-hidden absolute inset-0 w-full h-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Background Glow */}
            <div
              className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                isCertified ? 'bg-emerald-950/30' : 'bg-rose-950/30'
              }`}
            ></div>

            {/* 3D STAMP SLAM OVERLAY */}
            {stampAnimationDone && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-4">
                <div
                  className={`px-6 sm:px-8 py-4 border-4 font-mono font-black text-xl sm:text-3xl tracking-widest uppercase rounded-2xl shadow-2xl transition-all duration-300 ${
                    isCertified
                      ? 'border-emerald-400 text-emerald-400 bg-zinc-950/95 shadow-emerald-500/50 rotate-[-4deg] animate-in zoom-in-150 duration-200'
                      : 'border-rose-500 text-rose-500 bg-zinc-950/95 shadow-rose-500/50 rotate-[4deg] animate-in zoom-in-150 duration-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-center">{isCertified ? 'CERTIFIED BY PLAYERSIDE' : 'REJECTED BY PLAYERSIDE'}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-center font-normal tracking-normal text-zinc-400 mt-1">
                    VERIFIED IN REGULATOR REGISTER • LOGGED IN VERCEL BLOB
                  </div>
                </div>
              </div>
            )}

            {/* Content under Stamp */}
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">EVIDENCE AUDIT CERTIFICATE</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{evidenceHash}</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between items-center p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">Target Operator:</span>
                  <span className="text-zinc-100 font-bold text-sm">{operatorName}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">Measured Payout:</span>
                  <span className="text-emerald-400 font-bold text-sm">{measuredWithdrawalTime}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400">Licence Status:</span>
                  <span className="text-zinc-200 font-semibold">{licenceStatus}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-500">Playerside Audit Record #2026</span>
              <button
                onClick={handleReveal}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
