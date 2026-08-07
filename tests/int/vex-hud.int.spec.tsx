import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { MissionHUD } from '@/components/vex/MissionHUD'
import type { ActiveQuest } from '@/hooks/useGamification'

/**
 * Regression test for the reviewer-found crash: after the final step,
 * stepIndex === steps.length, so quest.steps[stepIndex] is undefined. The
 * HUD must render its completed panel — never touch step.prompt and never
 * crash the React tree.
 */
describe('Vex MissionHUD', () => {
  const quest: ActiveQuest['quest'] = {
    id: 1,
    missionId: 'bonus_hunter',
    title: 'The Bonus Heist',
    brief: 'Read the terms.',
    rewardXp: 60,
    pageTarget: 'casino-review',
    steps: [
      { kind: 'quiz', prompt: 'Multiplier?', options: [{ key: 'b', label: '35x' }] },
      { kind: 'wagering_math', prompt: 'Turnover?', options: [{ key: 'b', label: '€14,000' }] },
      { kind: 'quiz', prompt: 'Tilt move?', options: [{ key: 'c', label: 'Stop and step away' }] },
    ],
  }

  const onSubmit = vi.fn(async () => ({ pass: false, rgExplain: 'noop' }))

  it('renders a step without crashing', () => {
    const active: ActiveQuest = { userQuestId: 1, stepIndex: 0, quest }
    render(<MissionHUD activeQuest={active} onSubmit={onSubmit} onClose={() => {}} />)
    expect(screen.getByText('Multiplier?')).toBeDefined()
  })

  it('renders the completed panel when stepIndex reaches steps.length (no crash)', () => {
    const active: ActiveQuest = { userQuestId: 1, stepIndex: quest.steps.length, quest }
    render(<MissionHUD activeQuest={active} onSubmit={onSubmit} onClose={() => {}} />)
    expect(screen.getByText(/Mission complete/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Back to the dossier/i })).toBeDefined()
  })
})
