# Playerside Standardised Support Test Cases

> **Locked:** 2026-07-22 ~03:06 CEST · Session: Viktor + Perplexity AI  
> **Status:** LOCKED — do not change the question wording without a new version date and a CHANGELOG entry  
> **Used in:** MASTER-BLUEPRINT.md §5.2, every ResearchQueue CaseFile `handsOnResults.support*` fields

These are the two canonical test cases sent to every casino operator, identically, in every review. The wording is fixed. The channel assignment is fixed. Comparability depends on never changing the question mid-series.

---

## Channel 1: Live Chat — Responsible Gambling

**Account state:** Logged-in (existing account required)  
**Timing window:** Tuesday, 14:00–15:00 CET (standardised)  
**Sent from:** Viktor's personal account on the operator platform  

### Exact message (copy verbatim, no changes)

> Hi, I've been playing a lot lately and I think I'd like to take a break. Can you tell me what my options are, how long a self-exclusion takes to activate, and whether it covers your other casino brands as well?

### What a good response looks like
A quality support agent answers **all three sub-questions**:
1. Lists the available break options (cool-off, self-exclusion, deposit limits, etc.)
2. Gives a specific activation timeframe — not just "immediately" but the actual policy
3. Confirms whether the exclusion covers sister brands / same operator group

Bonus quality signals (not required, but logged):
- Agent proactively mentions external support resources (GamCare, Gamblers Anonymous, etc.)
- Agent asks a follow-up question to understand the situation better
- Response tone is empathetic rather than transactional

### What a poor response looks like
- Bot-scripted reply that answers only one sub-question
- Directs to FAQ/help centre without answering directly
- Does not mention sister brand coverage
- Generic "we care about responsible gambling" with no specifics
- Response time exceeds 5 minutes to first human reply

### Scoring input
- Time to first **human** response (bot handoff timestamps not counted): → `supportActualMinutes` field
- Sub-questions answered (0/3, 1/3, 2/3, 3/3): → `supportQualityScore` field
- Empathy flag (yes/no): → `supportEmpathyFlag` field  
- External resources mentioned (yes/no): → `supportRGResourcesFlag` field

---

## Channel 2: Email — KYC / Data Privacy

**Account state:** Logged-out (no account — sent from a clean email address)  
**Clean email format:** `[operator-slug]-test@[private-domain]` — see `docs/review-system/CREDENTIAL-LOG.md`  
**Timing:** Sent same day as live chat test (Tuesday, standardised window)  
**Reply-to:** Same clean address — monitor for response  

### Exact message (copy verbatim, no changes)

**Subject:** Question about identity verification before signing up

> Hi,
>
> I'm interested in signing up but before I do, I wanted to understand your identity verification process.
>
> Specifically: what documents do I need to submit, how do you process this data, and how long do you retain it after verification? I want to make sure I'm comfortable with how my information is handled before creating an account.
>
> Thank you

### What a good response looks like
A quality response addresses **all three sub-questions**:
1. Lists the specific document types accepted (passport, driving licence, utility bill, etc.)
2. Explains how the data is processed (third-party verification provider, internal review, etc.)
3. States the retention period — ideally citing the Privacy Policy section and the specific duration

Bonus quality signals:
- Proactively mentions GDPR rights (right to erasure, right of access, data portability)
- Provides a link to the relevant Privacy Policy section, not just the homepage
- Offers to answer further questions
- Response time under 24 hours

### What a poor response looks like
- Answers only the document list, ignores processing and retention
- "Please refer to our Privacy Policy" with no further guidance
- Generic response that could apply to any casino
- Response time over 48 hours
- No mention of GDPR or data subject rights for EU-facing operators

### Cross-check (DESK-RESEARCHER task)
After the email response is received, the Desk Researcher agent must:
1. Pull the actual retention period from the operator's live Privacy Policy
2. Compare it to what the support agent stated
3. Flag any discrepancy as a CONFLICT in the CaseFile

### Scoring input
- Time to first response (hours): → `emailSupportActualHours` field
- Sub-questions answered (0/3, 1/3, 2/3, 3/3): → `emailQualityScore` field
- GDPR mention (yes/no): → `emailGDPRFlag` field
- Privacy Policy accuracy vs agent response (match/conflict/not-checked): → `emailPolicyAccuracyFlag` field

---

## Important Rules

1. **Never reveal you are reviewing the operator.** These are genuine user scenarios. The testing is valid only if the operator believes you are a real user.
2. **Never use your main personal account for the email channel.** Always use the operator-specific clean address from `docs/review-system/CREDENTIAL-LOG.md`.
3. **Screenshot everything.** Full chat transcript, email thread, timestamps visible. Store in Payload Media with the CaseFile reference.
4. **If a bot handles the entire interaction**, record this explicitly. The `supportActualMinutes` clock does not start until a human agent takes over — or is recorded as ∞ if no human ever responds.
5. **Do not follow up or escalate the test case.** One message in, log whatever response comes back. No second messages that could change the interaction dynamic.
6. **The question wording is locked.** If you feel the need to adjust it, log the reason in CHANGELOG.md and lock a new version. Do not edit mid-series.
