import React from 'react'

/**
 * HUD-style section header — the homepage's "mission console" framing.
 * Renders a mono SEC number between hairline rules, a serif title, and an
 * optional caption + status chip. Used across Phase B homepage sections and
 * available to inner pages.
 */
export const HudSectionHeader: React.FC<{
  n: string
  title: string
  sub?: string
  chip?: string
}> = ({ n, title, sub, chip }) => (
  <div className="mb-8">
    <div className="hud-rule mb-4">
      <span>SEC {n}</span>
      {chip ? <span className="hud-chip">{chip}</span> : null}
    </div>
    <h2 className="t-h2 text-paper">{title}</h2>
    {sub ? <p className="t-caption mt-2 max-w-xl leading-relaxed">{sub}</p> : null}
  </div>
)
