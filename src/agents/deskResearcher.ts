import type { Payload, PayloadRequest } from 'payload'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'

/**
 * Run a Desk Researcher agent for a case and optionally apply its draft to the CaseFile.
 * This implementation is a safe placeholder that returns a fully-populated JSON
 * structure complying with the role's output schema but marks every claim as
 * `unverified` so humans must confirm. Replace the `assistantSummary` block
 * with a real model call in future work.
 */
export async function runDeskResearch(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
  opts?: { apply?: boolean; expectedVersion?: number; changedFields?: string[] },
) {
  // 1. Load tightly-scoped context (enforces access control)
  const { context } = await loadCaseContext(caseId, 'desk-research', req)

  // 2. Load role file (system prompt) for traceability
  const roleFile = await loadRoleFile('desk-research')

  // 3. Start an aiRun record
  const runId = await startAiRun(payload, req, caseId, 'desk-researcher')

  // 4. Placeholder assistant processing — replace with real model call
  const assistantSummary = {
    note: 'PLACEHOLDER: automated desk research stub — run the configured model here to populate verified claims.',
    scannedClaims: {
      license: null,
      ownership: null,
      bonusStructure: null,
      withdrawalClaims: null,
      kycClaims: null,
      provablyFair: null,
      supportChannels: null,
      communitySentiment: null,
    },
  }

  // 5. Build a minimal deskResearchOutput where every claim is unverified by default
  const today = new Date().toISOString().slice(0, 10)
  const deskResearchOutput = {
    licensing: {
      primary: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
        unverifiedReason: 'Automated placeholder: regulator check not performed',
      },
      secondary: [],
    },
    ownership: {
      legalEntity: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
        unverifiedReason: 'Automated placeholder',
      },
      parentCompany: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
        unverifiedReason: 'Automated placeholder',
      },
      otherBrands: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
        unverifiedReason: 'Automated placeholder',
      },
    },
    bonusStructure: {
      welcomeBonus: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
        unverifiedReason: 'Automated placeholder',
      },
      wagering: { value: null, sourceUrl: null, accessDate: today, confidence: 'unverified' },
    },
    withdrawalClaims: {
      processingTimes: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
      },
      complaints: [],
    },
    kycClaims: {
      statedRequirements: {
        value: null,
        sourceUrl: null,
        accessDate: today,
        confidence: 'unverified',
      },
      reportedFriction: [],
    },
    provablyFair: { value: 'NO', sourceUrl: null, accessDate: today, confidence: 'unverified' },
    supportChannels: { value: null, sourceUrl: null, accessDate: today, confidence: 'unverified' },
    communitySentiment: {
      value: 'INSUFFICIENT_DATA',
      sourceUrl: null,
      accessDate: today,
      confidence: 'unverified',
    },
    _assistantSummary: assistantSummary,
  }

  // 6. Build minimal evidenceRegister entries for the fields we touched (placeholders)
  const evidenceRegister = [
    {
      label: 'Licensing: primary (placeholder)',
      claimKey: 'licenseNumber',
      claimSummary: 'Primary licence could not be verified automatically',
      sourceType: 'operator-primary',
      mediaRef: null,
      sourceUrl: null,
      archiveRef: null,
      contentHash: null,
      accessDate: today,
      capturedAt: today,
      capturedBy: 'desk-researcher-agent-placeholder',
      verificationStatus: 'unverified',
      isCurrent: true,
      supersedesEvidenceId: null,
      notes:
        'Placeholder evidence row created by automated desk-researcher scaffold. Replace with real evidence when verified.',
    },
  ]

  // 7. Complete aiRun with the (placeholder) output
  await completeAiRun(payload, req, caseId, runId, { deskResearchOutput, evidenceRegister })

  // 8. Create an agent-log draft_created event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'draft_created',
      operator: (context as any).operatorName,
      pageId: String(caseId),
      details: { runId },
    },
    req,
  )

  // 9. Optionally apply the draft to the case file using the concurrency contract
  if (opts?.apply) {
    if (typeof opts.expectedVersion !== 'number' || !Array.isArray(opts.changedFields)) {
      throw new Error(
        'Applying a draft requires expectedVersion (number) and changedFields (string[]).',
      )
    }

    // Ensure the changedFields include the required fields for desk research
    const required = ['deskResearchOutput', 'evidenceRegister']
    for (const r of required) {
      if (!opts.changedFields.includes(r))
        throw new Error(`changedFields must include '${r}' when applying desk research`)
    }

    await applyDraft(
      payload,
      req,
      caseId,
      { deskResearchOutput, evidenceRegister },
      opts.expectedVersion,
      opts.changedFields,
    )

    // Log the draft_edited event after apply
    await logEvent(
      payload,
      {
        agentId: req.user?.email ?? 'system',
        brand: '01-playerside',
        event: 'draft_edited',
        operator: (context as any).operatorName,
        pageId: String(caseId),
        details: { runId },
      },
      req,
    )
  }

  return { runId, deskResearchOutput, evidenceRegister }
}
