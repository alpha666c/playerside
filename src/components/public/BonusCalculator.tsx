'use client'

import React, { useState } from 'react'

export function BonusCalculator() {
  const [depositAmount, setDepositAmount] = useState<number>(100)
  const [matchPercentage, setMatchPercentage] = useState<number>(100)
  const [wageringMultiplier, setWageringMultiplier] = useState<number>(35)
  const [wagerScope, setWagerScope] = useState<'bonus' | 'deposit_plus_bonus'>('bonus')
  const [gameRtp, setGameRtp] = useState<number>(96)
  const [maxBetLimit, setMaxBetLimit] = useState<number>(5)

  const bonusAmount = (depositAmount * matchPercentage) / 100
  const baseForWager = wagerScope === 'bonus' ? bonusAmount : depositAmount + bonusAmount
  const totalTurnoverRequired = baseForWager * wageringMultiplier

  // Expected Loss = Total Wager * (1 - RTP)
  const houseEdge = (100 - gameRtp) / 100
  const expectedTurnoverCost = totalTurnoverRequired * houseEdge
  const estimatedEv = bonusAmount - expectedTurnoverCost

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-lg">🧮</span>
            <h3 className="text-lg font-bold text-white tracking-tight">Interactive Bonus Wager Trap Detector</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Input any casino bonus offer to expose total turnover required, max bet traps, and expected cashout value.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold rounded-lg">
          No Fine Print Hidden
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Your Deposit ($):
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Match Bonus (%):
              </label>
              <input
                type="number"
                value={matchPercentage}
                onChange={(e) => setMatchPercentage(Number(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Wagering Multiplier (x):
              </label>
              <input
                type="number"
                value={wageringMultiplier}
                onChange={(e) => setWageringMultiplier(Number(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Wager Applies To:
              </label>
              <select
                value={wagerScope}
                onChange={(e) => setWagerScope(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 font-mono outline-hidden cursor-pointer"
              >
                <option value="bonus">Bonus Only (Fairer)</option>
                <option value="deposit_plus_bonus">Deposit + Bonus (Strict)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Average Game RTP (%):
              </label>
              <input
                type="number"
                step="0.1"
                value={gameRtp}
                onChange={(e) => setGameRtp(Number(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-semibold">
                Max Bet Limit ($):
              </label>
              <input
                type="number"
                value={maxBetLimit}
                onChange={(e) => setMaxBetLimit(Number(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Real-time Calculation Card (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-950/90 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">Calculation Results</div>
            <div className="text-xs text-zinc-400">
              Deposit <span className="font-mono text-white font-bold">${depositAmount}</span> + Bonus <span className="font-mono text-amber-400 font-bold">${bonusAmount}</span>
            </div>

            <div className="my-4 p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-3">
              <div>
                <span className="text-xs text-zinc-400 block font-mono">Total Playthrough Required:</span>
                <span className="text-2xl font-bold font-mono text-amber-400">${totalTurnoverRequired.toLocaleString()}</span>
              </div>

              <div className="border-t border-zinc-800 pt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Estimated EV Outcome:</span>
                <span className={`font-bold ${estimatedEv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {estimatedEv >= 0 ? `+${estimatedEv.toFixed(2)}` : `-${Math.abs(estimatedEv).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px] uppercase font-mono">
              <span>⚠️</span> Max Bet & Trap Warning
            </div>
            <div className="text-amber-200/90 text-[11px] leading-relaxed">
              Exceeding the <span className="font-bold text-white">${maxBetLimit}</span> max bet during wagering will void all winnings. High-RTP slots (&gt; 97%) are typically excluded.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
