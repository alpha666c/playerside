import { describe, expect, it } from 'vitest'

import { agentForStatus } from '@/lib/reviewChat/roles'

/**
 * Blueprint §10 / spec §2.2 — status → agent mapping. Pure; no DB.
 */
describe('review-chat: status → agent mapping', () => {
  it('queued has no active agent', () => {
    const agent = agentForStatus('queued')
    expect(agent.kind).toBe('none')
    expect(agent.role).toBeNull()
    expect(agent.applyable).toBe(false)
  })

  it('desk-research activates the Desk Researcher, applyable to deskResearchOutput + evidenceRegister', () => {
    const agent = agentForStatus('desk-research')
    expect(agent.role).toBe('desk-researcher')
    expect(agent.kind).toBe('ai')
    expect(agent.applyable).toBe(true)
    expect(agent.changedFields).toEqual(['deskResearchOutput', 'evidenceRegister'])
  })

  it('hands-on-testing is a human stage with no AI agent', () => {
    const agent = agentForStatus('hands-on-testing')
    expect(agent.kind).toBe('human')
    expect(agent.role).toBeNull()
  })

  it('editorial without computedScores routes to the Score Analyst', () => {
    const agent = agentForStatus('editorial', false)
    expect(agent.role).toBe('score-analyst')
    expect(agent.changedFields).toEqual(['computedScores'])
  })

  it('editorial with computedScores routes to the Editorial Writer', () => {
    const agent = agentForStatus('editorial', true)
    expect(agent.role).toBe('editorial-writer')
    expect(agent.changedFields).toEqual(['editorialDraft'])
  })

  it('integrity-check is a read-only verdict with no apply', () => {
    const agent = agentForStatus('integrity-check')
    expect(agent.role).toBe('integrity-checker')
    expect(agent.applyable).toBe(false)
    expect(agent.changedFields).toEqual([])
  })

  it('published and monitoring route to the Monitor, applyable to monitorLog', () => {
    for (const status of ['published', 'monitoring'] as const) {
      const agent = agentForStatus(status)
      expect(agent.role).toBe('monitor')
      expect(agent.applyable).toBe(true)
      expect(agent.changedFields).toEqual(['monitorLog'])
    }
  })

  it('unknown or missing status never yields an active agent', () => {
    expect(agentForStatus('bogus' as never).kind).toBe('none')
    expect(agentForStatus(undefined).kind).toBe('none')
    expect(agentForStatus(null).kind).toBe('none')
  })
})
