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

  // allowlists per AI-AGENTS-GUIDE §3
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
    ],
    'integrity-checker': [
      'computedScores',
      'deskResearchOutput',
      'evidenceRegister',
      'handsOnResults',
      'editorialDraft',
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

  const fields = allowlists[role] ?? ['caseNumber', 'operatorName']

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
