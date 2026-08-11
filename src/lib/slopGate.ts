/**
 * Phase I1 — deterministic AI-slop gate for public review copy.
 *
 * Pattern source: the vendored no-ai-slop skill
 * (`.agents/skills/no-ai-slop/SKILL.md`, petergyang/no-ai-slop @ d30eddb9, MIT).
 * This module is the SINGLE deterministic enforcement point; the skill is the
 * human/agent-level guide. If the skill's pattern list changes, update
 * `SLOP_OPENERS` / `SLOP_FILLER_PHRASES` / `SLOP_REPLACEMENTS` /
 * `SLOP_ADJECTIVES` to match and bump this header.
 *
 * Design rules (reviewer-mandated, 2026-08-11):
 * - EVIDENCE-SAFE: URLs, numbers with units, percentages, multipliers,
 *   currency, timestamps and licence refs are token-protected BEFORE any rule
 *   runs and restored AFTER, so a published fact ("avg 4.2h payout",
 *   "35× wagering → $3,500", "MGA/CRP-123456") can never be mangled.
 * - CONSERVATIVE: only sentence-initial openers, safe filler phrases and
 *   deletable adjectives are removed — never structural rewrites, never
 *   verb-phrase surgery. Binary contrasts ("It's not X, it's Y") are a
 *   legit rhetorical class on a review site and are EXCLUDED as a class.
 * - EMPTY-OUTPUT GUARD: if stripping would empty a field, the original is
 *   returned unchanged.
 * - IDEMPOTENT: applying twice === applying once.
 * - Scope: callers apply it to the four prose fields only (summary,
 *   heroHeadline, claimsVsReality, methodologyNote) — never to compliance
 *   blocks or computed scores.
 */

/** Sentence-initial openers that can be removed without corrupting the clause. */
const SLOP_OPENERS = [
  'here\'s the thing',
  'here\'s what i mean',
  'let me be clear',
  'i\'ll be honest',
  'the uncomfortable truth is',
  'the reality is',
  'the truth is',
  'at the end of the day',
  'in today\'s world',
  'in today\'s fast-paced world',
  'in the age of',
  'in the world of',
  'in this article',
  'it\'s worth noting',
  'it\'s important to note',
  'in conclusion',
  'ultimately',
  'overall',
  'as you can see',
  'the key point is',
  'in other words',
  'what if i told you',
  'think about it',
  'plot twist',
  'the part everyone misses',
  'what most people get wrong',
  'here\'s what nobody tells you',
  'this is the part most people skip',
  'suffice it to say',
  'needless to say',
  // weasel attribution (skill: "name the source or cut the claim")
  'experts agree',
  'industry reports suggest',
  'many argue',
  'widely regarded as',
  'studies show',
  'research shows',
] as const

/**
 * Filler phrases removable anywhere without breaking grammar (trailing
 * locatives, parentheticals, anchored constructions).
 */
const SLOP_FILLER_PHRASES = [
  'at its core',
  'the realm of',
  'this is huge',
  'this changes everything',
  'ever-evolving',
  'going forward',
  'as a testament to',
  'a testament to',
] as const

/**
 * Grammar-safe substitutions: the slop phrase is replaced by a plain phrase
 * so the sentence stays intact (pure removal would break grammar, e.g.
 * "This is a game changer for players" → "This is a for players").
 */
const SLOP_REPLACEMENTS: ReadonlyArray<[string, string]> = [
  ['game changer', 'major change'],
  ['paradigm shift', 'major change'],
  ['in terms of', 'for'],
  ['with regard to', 'about'],
  ['in order to', 'to'],
] as const

/** Adjectives/nouns that are safe to delete outright (never verbs). */
const SLOP_ADJECTIVES = [
  'robust',
  'cutting-edge',
  'multifaceted',
  'meticulous',
  'intricate',
  'paramount',
  'transformative',
  'streamlined',
  'game-changing',
] as const

/** Evidence-like spans that must survive byte-for-byte (token-protected). */
const EVIDENCE_PATTERNS = [
  // URLs
  /https?:\/\/[^\s"'<>)]+/gi,
  // licence refs (regulator code + ref, e.g. MGA/CRP-123456, UKGC 000-000000-R-000000-000)
  /\b(?:MGA|UKGC|GSC|KGC|CGA|LGA|ONJN|Alderney|Curaçao|Curacao)[/ -]?[A-Z0-9][A-Z0-9./ -]{4,}\b/gi,
  // numbers with units / percentages / multipliers / currency / time / dates
  /\b\d+(?:[.,]\d+)?\s*(?:%|×|x|hours?|hrs?|h\b|mins?|minutes?|days?|weeks?|months?|years?|€|£|\$|k|m|mbps|gbps|g|tb)\b/gi,
  /\b(?:€|£|\$)\s?\d+(?:[.,]\d+)?\b/gi,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}\b|\bQ[1-4] \d{4}\b|\b\d{4}\b(?![-/]\d{1,2})/gi,
  // RTP / odds / ratios like 96.5%, 35x, 1:1
  /\b\d+(?:[.,]\d+)?\s*(?:x|:)\s*\d+\b/gi,
] as const

const PLACEHOLDER_PREFIX = '\u0000EV\u0000'
let placeholderSeq = 0

/** Detect whether a text carries any known slop pattern (detect mode). */
export const containsSlopPattern = (text: string): boolean => {
  const t = text.toLowerCase()
  return (
    SLOP_OPENERS.some((p) => t.includes(p)) ||
    SLOP_FILLER_PHRASES.some((p) => t.includes(p)) ||
    SLOP_REPLACEMENTS.some(([p]) => t.includes(p)) ||
    SLOP_ADJECTIVES.some((p) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(text))
  )
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Token-protect evidence spans so no rule can touch them.
 * Returns the protected text and a `restore(protectedText)` that swaps tokens
 * back to the original values. NOTE: restore takes the CALLER's modified
 * string — never capture the internal `out` in a closure, or rule edits are
 * silently discarded (the Phase I1 debug bug).
 */
const protectEvidence = (text: string): { protectedText: string; restore: (s: string) => string } => {
  const tokens = new Map<string, string>()
  let out = text
  for (const pattern of EVIDENCE_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const token = `${PLACEHOLDER_PREFIX}${placeholderSeq++}\u0000`
      tokens.set(token, match)
      return token
    })
  }
  const restore = (protectedText: string): string => {
    let restored = protectedText
    for (const [token, value] of tokens) restored = restored.split(token).join(value)
    return restored
  }
  return { protectedText: out, restore }
}

const collapseSpacing = (text: string): string =>
  text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()

/**
 * Strip known AI-slop patterns from a prose field.
 * - Evidence spans are protected first and restored last.
 * - Binary contrasts are intentionally left alone (legit review rhetoric).
 * - Empty results fall back to the original (empty-output guard).
 */
export const stripAiSlop = (text: string | null | undefined): string => {
  const input = (text ?? '').trim()
  if (input.length === 0) return input

  const { protectedText, restore } = protectEvidence(input)

  let out = protectedText

  // 1. Sentence-initial openers (start of string or after sentence punctuation),
  //    with an optional trailing comma / colon / "that" — removing the opener
  //    keeps the clause intact.
  for (const opener of SLOP_OPENERS) {
    const re = new RegExp(
      `(^|[.!?;]\\s+)(?:${escapeRegExp(opener)})(?:\\s+that)?\\s*[,:]?\\s*`,
      'gi',
    )
    if (re.test(out)) {
      out = out.replace(re, '$1')
    }
  }

  // 2. Grammar-safe replacements (word-boundary anchored, whole phrase).
  for (const [phrase, replacement] of SLOP_REPLACEMENTS) {
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi')
    if (re.test(out)) {
      out = out.replace(re, replacement)
    }
  }

  // 3. Filler phrases (word-boundary anchored, optional trailing comma).
  for (const phrase of SLOP_FILLER_PHRASES) {
    const re = new RegExp(`\\s*\\b${escapeRegExp(phrase)}\\b\\s*,?`, 'gi')
    if (re.test(out)) {
      out = out.replace(re, ' ')
    }
  }

  // 4. Deletable adjectives (adjective + following space).
  for (const adj of SLOP_ADJECTIVES) {
    const re = new RegExp(`\\b${escapeRegExp(adj)}\\s+`, 'gi')
    if (re.test(out)) {
      out = out.replace(re, '')
    }
  }

  // Rules ran on token-protected text; restore evidence, then collapse spacing
  // (restore first so collapse never sees placeholders; collapse only touches
  // whitespace, so restored evidence like "€3,500" / "4.2h" is safe).
  const result = collapseSpacing(restore(out))

  // Empty-output guard: never return an emptied or fragmentary field
  // (< 3 chars = a stray '.' / ',' left behind by an opener-only field).
  if (result.length < 3) return input

  // Idempotency is structural, not a second rule pass: every rule is
  // anchored and removes all matches in one go, so a second stripAiSlop call
  // is a no-op by construction (verified by tests). Do NOT re-run rules here.
  return result
}
