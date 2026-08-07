'use client'

import { progressWithinLevel, rankTitleForLevel } from '@/gamification/curve'

type XpBarProps = {
  totalXp: number
  level: number
  rankTitle: string
}

/** Level + rank + thin progress bar. XP is display-only — server is the source of truth. */
export const XpBar: React.FC<XpBarProps> = ({ totalXp, level, rankTitle }) => {
  const pct = Math.round(progressWithinLevel(totalXp) * 100)
  const nextRank = rankTitleForLevel(level + 1)

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-evidence">
          Lv {level} · {rankTitle}
        </span>
        <span className="font-mono text-[11px] text-paper-dim">{totalXp} XP</span>
      </div>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-dusk"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Level ${level} progress`}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-evidence transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-paper-dim/70">Next: {nextRank}</p>
    </div>
  )
}
