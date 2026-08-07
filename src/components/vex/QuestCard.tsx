'use client'

import type { Quest } from '@/hooks/useGamification'

type QuestCardProps = {
  quest: Quest
  onStart: (id: Quest['id']) => void
  onDismiss: () => void
}

/** The offering state: a single mission, 3 things max (title, brief, reward). */
export const QuestCard: React.FC<QuestCardProps> = ({ quest, onStart, onDismiss }) => (
  <div className="rounded-[var(--radius)] border border-line bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[2px] text-evidence">Mission · {quest.steps.length} steps</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss mission offer"
        className="rounded p-1 text-paper-dim transition-colors hover:text-paper"
      >
        ✕
      </button>
    </div>
    <h3 className="mt-2 text-[16px] font-semibold leading-tight text-paper">{quest.title}</h3>
    <p className="mt-2 text-[12.5px] leading-relaxed text-paper-dim">{quest.brief}</p>
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] text-gold">+{quest.rewardXp} XP</span>
      <button
        type="button"
        onClick={() => onStart(quest.id)}
        className="rounded-full bg-evidence px-4 py-1.5 text-[12px] font-medium text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        Start mission
      </button>
    </div>
  </div>
)
