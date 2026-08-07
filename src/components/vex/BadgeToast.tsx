'use client'

type BadgeToastProps = {
  title: string
  xp: number
}

/** Quiet reward toast (≤4s, auto-dismissed by the hook) — never a hard gate. */
export const BadgeToast: React.FC<BadgeToastProps> = ({ title, xp }) => (
  <div
    className="pointer-events-none fixed bottom-24 right-4 z-[90] animate-[vex-toast_0.3s_ease] motion-reduce:animate-none rounded-[var(--radius)] border border-gold/50 bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur"
    role="status"
    aria-live="polite"
  >
    <p className="font-mono text-[10px] uppercase tracking-[2px] text-gold">Mission complete</p>
    <p className="mt-1 text-[13.5px] font-medium text-paper">{title}</p>
    <p className="mt-0.5 font-mono text-[12px] text-evidence">+{xp} XP logged to the ledger</p>
  </div>
)
