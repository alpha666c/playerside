import type { Payload, PayloadRequest } from 'payload'
import fs from 'fs/promises'
import path from 'path'
import { loadCaseContext } from '@/lib/reviewChat/loadCaseContext'
import { loadRoleFile, startAiRun, completeAiRun, applyDraft } from '@/agents/runner'
import { logEvent } from '@/lib/logEvent'

export async function runEditorialWriter(
  payload: Payload,
  req: PayloadRequest,
  caseId: string | number,
  opts?: { apply?: boolean; expectedVersion?: number; changedFields?: string[] },
) {
  // 1. Load context
  const { context } = await loadCaseContext(caseId, 'editorial-writer', req)

  // 2. Load system prompt & Founder Voice context
  const roleFile = await loadRoleFile('editorial-writer')
  const founderContextPath = path.join(process.cwd(), 'docs', 'FOUNDER-CONTEXT.md')
  const founderVoice = await fs.readFile(founderContextPath, 'utf8').catch(() => '')

  // 3. Start aiRun record
  const runId = await startAiRun(payload, req, caseId, 'editorial-writer')

  const operatorName = (context as any).operatorName || 'Operator'
  const computedScores = (context as any).computedScores || {}

  // 4. Generate structured editorial draft content
  const editorialDraft = {
    summary: `Editorial Review for ${operatorName} — Commission-blind, evidence-backed evaluation.`,
    heroHeadline: `${operatorName} Review: Verified Withdrawal Speed & Licensing Integrity`,
    claimsVsReality: `Our research tested stated operator claims against measured evidence. Unverified claims remain explicitly marked as untested.`,
    categoryBreakdown: computedScores.categories || [],
    complianceBlock: {
      licenceReference: (context as any).licenseNumber || 'License status checked at regulator database.',
      ageRequirement: '18+ Only. Gambling can be addictive — play responsibly.',
      responsibleGamblingLinks: ['https://www.begambleaware.org', 'https://www.gamstop.co.uk'],
    },
    methodologyNote: 'This score was produced under Playerside commission-blind evaluation rules. Commercial affiliate agreements do not influence scoring.',
  }

  // 5. Complete aiRun
  await completeAiRun(payload, req, caseId, runId, { editorialDraft })

  // 6. Log event
  await logEvent(
    payload,
    {
      agentId: req.user?.email ?? 'system',
      brand: '01-playerside',
      event: 'draft_created',
      operator: operatorName,
      pageId: String(caseId),
      details: { runId, role: 'editorial-writer' },
    },
    req,
  )

  // 7. Optionally apply draft
  if (opts?.apply) {
    if (typeof opts.expectedVersion !== 'number' || !Array.isArray(opts.changedFields)) {
      throw new Error('Applying editorialDraft requires expectedVersion (number) and changedFields (string[]).')
    }

    if (!opts.changedFields.includes('editorialDraft')) {
      throw new Error("changedFields must include 'editorialDraft' when applying editorial writer output")
    }

    await applyDraft(
      payload,
      req,
      caseId,
      { editorialDraft },
      opts.expectedVersion,
      opts.changedFields,
    )
  }

  return { runId, editorialDraft }
}
