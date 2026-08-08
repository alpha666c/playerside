/**
 * Status → agent mapping for the review-chat interface (MASTER-BLUEPRINT.md
 * §10 + docs/review-handoffs/2026-07-23-ai-route-agent-roles-build-spec.md
 * §2.2). Single source of truth: the /api/review-chat route routes by it,
 * and the CaseFile chat panel (CaseChatPanel) renders the active agent by
 * it. The role is ALWAYS derived from the case's current status server-side
 * — never from client-supplied input.
 */
export type CaseStatus =
  | 'queued'
  | 'desk-research'
  | 'hands-on-testing'
  | 'editorial'
  | 'integrity-check'
  | 'published'
  | 'monitoring'

export type AgentKind = 'ai' | 'human' | 'none'

export type ActiveAgent = {
  /** Agent key used by the route + role-file loader. */
  role: string | null
  /** Human label shown in the panel. */
  label: string
  kind: AgentKind
  /** Whether the panel's explicit "Apply" action can write to the case. */
  applyable: boolean
  /** Which top-level fields an apply would write (route derives this). */
  changedFields: string[]
  /** One-line description for the panel banner. */
  description: string
}

/** True when computedScores has any entries — the editorial-stage split signal (spec §2.2). */
export const hasComputedScores = (computedScores: unknown): boolean =>
  Boolean(
    computedScores &&
      typeof computedScores === 'object' &&
      Object.keys(computedScores as object).length > 0,
  )

const NO_AGENT = (message: string): ActiveAgent => ({
  role: null,
  label: 'No active agent',
  kind: 'none',
  applyable: false,
  changedFields: [],
  description: message,
})

/**
 * Derive the active agent for a case status. `computedScoresPopulated`
 * mirrors the route's editorial split: Score Analyst while scores are
 * missing, Editorial Writer once they exist (spec §2.2).
 */
export const agentForStatus = (
  status: CaseStatus | string | null | undefined,
  computedScoresPopulated = false,
): ActiveAgent => {
  switch (status) {
    case 'queued':
      return NO_AGENT('Case not started — no agent is active until desk research begins.')
    case 'desk-research':
      return {
        role: 'desk-researcher',
        label: 'Desk Researcher',
        kind: 'ai',
        applyable: true,
        changedFields: ['deskResearchOutput', 'evidenceRegister'],
        description:
          'Web research on licensing, ownership, bonus terms and complaint patterns — every claim starts unverified until confirmed.',
      }
    case 'hands-on-testing':
      return {
        role: null,
        label: 'Hands-on testing (human stage)',
        kind: 'human',
        applyable: false,
        changedFields: [],
        description:
          'Viktor runs live account tests here — no AI agent is active. Evidence from this stage feeds the Editorial phase.',
      }
    case 'editorial':
      if (!computedScoresPopulated) {
        return {
          role: 'score-analyst',
          label: 'Score Analyst',
          kind: 'ai',
          applyable: true,
          changedFields: ['computedScores'],
          description:
            'Applies the locked rubric to desk + hands-on data; categories without real evidence stay conservatively mid-scored.',
        }
      }
      return {
        role: 'editorial-writer',
        label: 'Editorial Writer',
        kind: 'ai',
        applyable: true,
        changedFields: ['editorialDraft'],
        description:
          'Writes the public review draft from confirmed scores — draft only; you review and apply.',
      }
    case 'integrity-check':
      return {
        role: 'integrity-checker',
        label: 'Integrity Checker',
        kind: 'ai',
        applyable: false,
        changedFields: [],
        description:
          'Final pre-publish gate: cross-checks copy ↔ scores ↔ rubric ↔ commission wall. Verdict only — sign-off is always human.',
      }
    case 'published':
    case 'monitoring':
      return {
        role: 'monitor',
        label: 'Monitor',
        kind: 'ai',
        applyable: true,
        changedFields: ['monitorLog'],
        description:
          'Post-publish surveillance — license standing, complaint spikes, ownership changes. Appends to the monitor log on your Apply.',
      }
    default:
      return NO_AGENT(`No active agent for status '${String(status)}'.`)
  }
}
