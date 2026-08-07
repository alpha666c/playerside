'use client'

import { useState } from 'react'

import type { ActiveQuest, StepResult } from '@/hooks/useGamification'

type MissionHUDProps = {
  activeQuest: ActiveQuest
  onSubmit: (stepIndex: number, answerKey: string) => Promise<StepResult | null>
  onClose: () => void
}

/** In-mission state: objective + progress pips + one step at a time. */
export const MissionHUD: React.FC<MissionHUDProps> = ({ activeQuest, onSubmit, onClose }) => {
  const { quest, stepIndex, userQuestId } = activeQuest
  const [answer, setAnswer] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<StepResult | null>(null)

  // Completed state: stepIndex === steps.length after the final step lands.
  const completed = stepIndex >= quest.steps.length
  const step = quest.steps[stepIndex]
  const isLast = stepIndex >= quest.steps.length - 1

  if (completed) {
    return (
      <div
        className="w-[min(92vw,360px)] rounded-[var(--radius)] border border-gold/50 bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-gold">Mission complete</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission"
            className="rounded p-1 text-paper-dim transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-paper">
          Terms read, trap spotted — {quest.title} logged. The ledger has your XP, Scout.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-full bg-gold px-4 py-1.5 text-[12px] font-medium text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Back to the dossier
        </button>
      </div>
    )
  }

  if (!step) return null

  const submit = async (key: string) => {
    if (submitting || feedback?.pass) return
    setSubmitting(true)
    const result = await onSubmit(stepIndex, key)
    setFeedback(result)
    setSubmitting(false)
    if (result?.pass) setAnswer(null)
  }

  const advance = () => {
    setFeedback(null)
    setAnswer(null)
  }

  return (
    <div
      className="w-[min(92vw,360px)] rounded-[var(--radius)] border border-line bg-dusk/95 p-4 shadow-2xl shadow-black/40 backdrop-blur"
      role="dialog"
      aria-label={`Mission: ${quest.title}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-evidence">
          Step {stepIndex + 1}/{quest.steps.length} · {quest.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close mission"
          className="rounded p-1 text-paper-dim transition-colors hover:text-paper"
        >
          ✕
        </button>
      </div>

      {/* Progress pips */}
      <div className="mt-2 flex gap-1.5" aria-label="Mission progress">
        {quest.steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < stepIndex ? 'bg-gold' : i === stepIndex ? 'bg-evidence' : 'bg-dusk'}`}
          />
        ))}
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-paper">{step.prompt}</p>

      <div className="mt-3 flex flex-col gap-2">
        {step.options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={submitting || feedback?.pass === true}
            onClick={() => submit(opt.key)}
            className={`rounded-[10px] border px-3 py-2 text-left text-[12.5px] transition-colors ${
              answer === opt.key && !feedback
                ? 'border-evidence bg-evidence/10 text-paper'
                : 'border-line bg-dusk text-paper-dim hover:border-gold/60 hover:text-paper'
            }`}
            onMouseDown={() => setAnswer(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {feedback && !feedback.pass ? (
        <div className="mt-3 rounded-[10px] border border-coral/40 bg-coral/10 p-3">
          <p className="text-[12px] leading-relaxed text-paper">{feedback.rgExplain}</p>
          {'hint' in feedback && feedback.hint ? (
            <p className="mt-1.5 font-mono text-[11px] text-coral">Hint: {feedback.hint}</p>
          ) : null}
          <button
            type="button"
            onClick={advance}
            className="mt-2 text-[12px] font-medium text-evidence hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {feedback?.pass ? (
        <div className="mt-3 rounded-[10px] border border-evidence/50 bg-evidence/10 p-3">
          <p className="text-[12.5px] font-medium text-evidence">
            {isLast ? 'Mission complete — terms intact, Scout.' : 'Correct. Next step.'}
          </p>
          <button
            type="button"
            onClick={advance}
            className="mt-2 text-[12px] font-medium text-gold hover:underline"
          >
            {isLast ? 'Claim XP' : 'Continue'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
