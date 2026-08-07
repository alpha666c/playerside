import Link from 'next/link'
import React from 'react'

/**
 * Per-review bridge to the mission board. The dock offers the current-page
 * mission in-context; this strip points scouts at the full roster (rank
 * ladder + badges). Server-safe — no hooks, no client fetch.
 */
export const MissionBoardCTA: React.FC = () => (
  <div className="container mb-10 max-w-[760px] sm:mb-12">
    <Link
      href="/missions"
      className="group flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-dusk/60 px-5 py-4 transition-colors hover:border-gold/50 hover:bg-dusk"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-evidence">Vex Missions</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-paper">
          Earn XP for reading the terms like a scout — the full mission board, rank ladder and badges.
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-evidence/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[1.5px] text-evidence transition-colors group-hover:bg-evidence/10">
        Mission board →
      </span>
    </Link>
  </div>
)
