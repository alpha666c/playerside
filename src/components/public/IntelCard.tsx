import React from 'react'

/**
 * Review-page intel card — strengths (good) or weaknesses (bad) rendered as
 * icon rows. Shared by the traditional and crypto review pages so the two
 * never drift apart.
 */
export const IntelCard: React.FC<{
  eyebrow: string
  items: string[]
  variant: 'good' | 'bad'
  className?: string
}> = ({ eyebrow, items, variant, className }) => {
  const isGood = variant === 'good'
  return (
    <div
      className={`rounded-[var(--radius)] border bg-dusk p-5 sm:p-6 ${
        isGood ? 'border-evidence/35' : 'border-coral/35'
      } ${className ?? ''}`}
    >
      <p
        className={`mb-3 font-mono text-[10.5px] uppercase tracking-[1.5px] ${
          isGood ? 'text-evidence' : 'text-coral'
        }`}
      >
        {eyebrow}
      </p>
      <ul className="m-0 space-y-2.5">
        {items.map((point, i) => (
          <li className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-paper-dim" key={i}>
            {isGood ? (
              <svg
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-coral"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}
