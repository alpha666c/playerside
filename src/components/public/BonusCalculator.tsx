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

  const inputClass =
    'w-full rounded-[10px] border border-line bg-ink-2 px-3.5 py-2.5 font-mono text-xs text-paper outline-hidden transition-colors focus:border-evidence'

  return (
    <div className="panel space-y-6 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-evidence/50 bg-evidence/10">
              <svg className="h-3.5 w-3.5 text-evidence" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-4 4h4m-4 4h2m-7 4h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <h3 className="t-h3 text-paper">Interactive Bonus Wager Trap Detector</h3>
          </div>
          <p className="t-caption mt-1">
            Input any casino bonus offer to expose total turnover required, max bet traps, and expected cashout value.
          </p>
        </div>

        <span className="hud-chip">no_fine_print_hidden</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Your Deposit ($):
              </label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Match Bonus (%):
              </label>
              <input
                type="number"
                value={matchPercentage}
                onChange={(e) => setMatchPercentage(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Wagering Multiplier (x):
              </label>
              <input
                type="number"
                value={wageringMultiplier}
                onChange={(e) => setWageringMultiplier(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Wager Applies To:
              </label>
              <select
                value={wagerScope}
                onChange={(e) => setWagerScope(e.target.value as any)}
                className={`${inputClass} cursor-pointer text-paper-dim`}
              >
                <option value="bonus">Bonus Only (Fairer)</option>
                <option value="deposit_plus_bonus">Deposit + Bonus (Strict)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Average Game RTP (%):
              </label>
              <input
                type="number"
                step="0.1"
                value={gameRtp}
                onChange={(e) => setGameRtp(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs font-semibold text-paper-dim">
                Max Bet Limit ($):
              </label>
              <input
                type="number"
                value={maxBetLimit}
                onChange={(e) => setMaxBetLimit(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Real-time Calculation Card (5 cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-[10px] border border-line bg-ink-2/80 p-5 lg:col-span-5">
          <div>
            <div className="t-eyebrow mb-1">Calculation Results</div>
            <div className="text-xs text-paper-dim">
              Deposit <span className="t-data font-bold text-paper">${depositAmount}</span> + Bonus{' '}
              <span className="t-data font-bold text-evidence">${bonusAmount.toFixed(2)}</span>
            </div>

            <div className="my-4 space-y-3 rounded-[10px] border border-line bg-ink p-4">
              <div>
                <span className="block font-mono text-xs text-paper-dim">Total Playthrough Required:</span>
                <span className="t-data text-2xl font-bold text-coral">
                  ${totalTurnoverRequired.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-line pt-3 font-mono text-xs">
                <span className="text-paper-dim">Estimated EV Outcome:</span>
                <span className={`t-data font-bold ${estimatedEv >= 0 ? 'text-success' : 'text-coral'}`}>
                  {estimatedEv >= 0 ? `+${estimatedEv.toFixed(2)}` : `-${Math.abs(estimatedEv).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1 rounded-[10px] border border-warning/30 bg-warning/10 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-warning">
              <span aria-hidden>⚠</span> Max Bet &amp; Trap Warning
            </div>
            <div className="text-[11px] leading-relaxed text-paper-dim">
              Exceeding the <span className="t-data font-bold text-paper">${maxBetLimit}</span> max bet during wagering will void all winnings. High-RTP slots (&gt; 97%) are typically excluded.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
