import React from 'react'

// Gold is reserved for the Verification Seal and verified-score marks only
// (design-tokens.md) — section eyebrows use a neutral label color with a
// small coral accent mark, not gold, so gold doesn't dilute into wayfinding.
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`mb-4 flex items-center gap-2.5 font-mono text-[12.5px] uppercase tracking-[3px] text-paper-dim ${className ?? ''}`}
  >
    <span aria-hidden="true" className="block h-[1.5px] w-[22px] bg-coral" />
    {children}
  </div>
)
