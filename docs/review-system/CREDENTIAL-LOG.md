# Playerside Credential Log — Operator Test Accounts

> **PRIVATE — never commit real passwords to this file.**  
> **Purpose:** Track which email addresses and accounts are used per operator so channels are never mixed up, test accounts are never confused with personal accounts, and evidence is always attributable to the correct case.
> **Real credentials** (passwords, 2FA seeds) are stored in a password manager only — never in this repo.
> **Locked:** 2026-07-22 ~03:06 CEST · Session: Viktor + Perplexity AI

---

## Structure

Each operator gets one row. The fields are:

| Field | Description |
|---|---|
| Case # | The Playerside case number (#PS-YYYY-NNN) |
| Operator | Casino brand name |
| Live chat account | Which account is used for the live chat test (usually Viktor's personal account on that platform) |
| Email channel address | The clean test email address used for the no-account email test |
| Account status | active / suspended / closed / not-created |
| Notes | Anything relevant — VIP level, bonus history, known flags |

---

## Email Address Convention

Clean test email addresses follow this format:

```
[operator-slug]-review@[private-domain]
```

Example: `stake-review@[private-domain]`

The private domain is managed by Viktor outside this repo. Do not use personal Gmail/Outlook addresses for test channels — they are linkable to Viktor by name.

**Every clean address must be:**
- Created fresh for that operator — never reused across operators
- Checked during the test window (Tuesday 14:00–15:00 CET)
- Archived after the review is published (not deleted — retained for evidence)

---

## Operator Registry

| Case # | Operator | Live Chat Account | Email Test Address | Account Status | Notes |
|---|---|---|---|---|---|
| #PS-2026-001 | Stake.com (not .us) | Viktor's personal Stake account (Platinum 2) | `stake-review@[private-domain]` | Active | Platinum 2 level — extensive platform familiarity. Personal account used for logged-in live chat test only. Email channel is clean/no-account. |

---

## Rules

1. Never use the live chat test account for the email test or vice versa — they must be independent channels.
2. Never log actual passwords here. Password manager only.
3. If an operator suspends or flags the test account, log it immediately in the Notes column and in the CaseFile internal notes. Do not attempt to create a replacement account under a different name — that would cross an ethical line.
4. The live chat account being a personal account (e.g. Platinum 2 on Stake) is acceptable and disclosed in the internal CaseFile. It is not disclosed publicly — the test question is genuine regardless of account tier.
5. VIP status on a platform is not a negative for testing. A VIP player asking about self-exclusion is a completely realistic scenario.
