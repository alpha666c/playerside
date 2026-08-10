import type { PayloadRequest } from 'payload'

export type AgentRole =
  | 'desk-researcher'
  | 'desk-research'
  | 'score-analyst'
  | 'editorial-writer'
  | 'editorial'
  | 'integrity-checker'
  | 'integrity-check'
  | 'monitor'
  | 'monitoring'

export function loadCaseContextAllowlist(role: AgentRole): string[] {
  const allowlists: Record<string, string[]> = {
    'desk-research': [
      'caseNumber',
      'operatorName',
      'operatorUrl',
      'casinoType',
      'licenseJurisdiction',
      'licenseNumber',
      'parentCompany',
      'evidenceRegister',
      'assignedReviewer',
    ],
    'desk-researcher': [
      'caseNumber',
      'operatorName',
      'operatorUrl',
      'casinoType',
      'licenseJurisdiction',
      'licenseNumber',
      'parentCompany',
      'evidenceRegister',
      'assignedReviewer',
    ],
    'score-analyst': ['casinoType', 'deskResearchOutput', 'evidenceRegister', 'handsOnResults'],
    editorial: [
      'computedScores',
      'deskResearchOutput',
      'evidenceRegister',
      'handsOnResults',
      'casinoType',
    ],
    'editorial-writer': [
      'computedScores',
      'deskResearchOutput',
      'evidenceRegister',
      'handsOnResults',
      'casinoType',
    ],
    'integrity-check': [
      'computedScores',
      'deskResearchOutput',
      'evidenceRegister',
      'handsOnResults',
      'editorialDraft',
      // G.6 (§12.2): the checker records `version` at verdict time so publish
      // can enforce verdict freshness (case.version === verdictForVersion).
      'version',
    ],
    'integrity-checker': [
      'computedScores',
      'deskResearchOutput',
      'evidenceRegister',
      'handsOnResults',
      'editorialDraft',
      // G.6 (§12.2): verdict freshness — see integrity-check above.
      'version',
    ],
    monitor: [
      'publishedReviewId',
      'caseNumber',
      'operatorName',
      'operatorUrl',
      'deskResearchOutput',
      'evidenceRegister',
    ],
    monitoring: [
      'publishedReviewId',
      'caseNumber',
      'operatorName',
      'operatorUrl',
      'deskResearchOutput',
      'evidenceRegister',
    ],
  }

  return allowlists[role] ?? ['caseNumber', 'operatorName']
}

/**
 * Load a tightly-scoped context for the given role and case. Always uses
 * the calling user's own request-level permissions (pass the payload req).
 * Returns only the allowlisted fields for that role.
 */
export async function loadCaseContext(
  caseId: string | number,
  role: AgentRole,
  req: PayloadRequest,
) {
  const payload = req.payload
  const fields = loadCaseContextAllowlist(role)

  // Use payload.findByID with req so access control is enforced
  const doc = await payload
    .findByID({ collection: 'research-queue', id: caseId, req })
    .catch(() => null)
  if (!doc) throw new Error('Case not found')

  const context: Record<string, unknown> = {}
  for (const f of fields) {
    context[f] = (doc as any)[f]
  }

  return { caseId, role, context }
}
