/**
 * Post-Deploy Production-Alias Verification & Diagnostic Script
 *
 * Mandated Diagnostics:
 * 1. Exact requested URL & final URL after redirects
 * 2. HTTP status code
 * 3. Headers: x-vercel-id, x-vercel-cache, x-matched-path
 * 4. Response body SHA256
 * 5. First 1,500 characters of raw HTML
 * 6. Line-numbered matches for every banned string
 * 7. Line-numbered sample-marker matches
 * 8. Parsed data-build-sha and data-homepage-data-source values
 * 9. Fail if parsed data-build-sha does not match expected short deployment SHA
 *
 * Usage: npx tsx scripts/verify-live-alias.ts
 */

import { createHash } from 'crypto'
import { execSync } from 'child_process'

const TARGET_URL = process.env.LIVE_VERIFY_URL || 'https://playerside.vercel.app/'
const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const EXPECTED_SHA = (process.env.EXPECTED_GIT_SHA || (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return ''
  }
})()).slice(0, 7)

async function main() {
  console.log(`==================================================`)
  console.log(`LIVE DIAGNOSTIC AUDIT`)
  console.log(`Requested URL:       ${TARGET_URL}`)
  console.log(`User-Agent:          ${USER_AGENT}`)
  console.log(`Expected Commit SHA: ${EXPECTED_SHA || '(none provided)'}`)
  console.log(`==================================================`)

  const res = await fetch(TARGET_URL, {
    headers: {
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
    redirect: 'follow',
  })

  const finalUrl = res.url
  const httpStatus = res.status
  const vercelId = res.headers.get('x-vercel-id') || 'MISSING'
  const vercelCache = res.headers.get('x-vercel-cache') || 'MISSING'
  const matchedPath = res.headers.get('x-matched-path') || 'MISSING'

  const rawHtml = await res.text()
  const rawSha256 = createHash('sha256').update(rawHtml).digest('hex')

  const lines = rawHtml.split('\n')

  console.log(`Final URL (after redirects): ${finalUrl}`)
  console.log(`HTTP Status:                 ${httpStatus}`)
  console.log(`Header x-vercel-id:          ${vercelId}`)
  console.log(`Header x-vercel-cache:       ${vercelCache}`)
  console.log(`Header x-matched-path:       ${matchedPath}`)
  console.log(`Response Body SHA256:        ${rawSha256}`)
  console.log(`--------------------------------------------------`)
  console.log(`FIRST 1,500 CHARACTERS OF RAW HTML:`)
  console.log(rawHtml.slice(0, 1500))
  console.log(`--------------------------------------------------`)

  // Parsed markers
  const shaMatch = rawHtml.match(/data-build-sha="([^"]+)"/)
  const parsedBuildSha = shaMatch ? shaMatch[1] : 'NOT_FOUND'

  const sourceMatch = rawHtml.match(/data-homepage-data-source="([^"]+)"/)
  const parsedDataSource = sourceMatch ? sourceMatch[1] : 'NOT_FOUND'

  console.log(`Parsed data-build-sha:              ${parsedBuildSha}`)
  console.log(`Parsed data-homepage-data-source: ${parsedDataSource}`)
  console.log(`--------------------------------------------------`)

  // Banned pattern matches with line numbers
  const bannedPatterns = [
    'Stake.com',
    'BitStarz',
    'BC.Game',
    'Roobet',
    'EV-PAYOUT-',
    'EV-SUPPORT-',
    'EV-BONUS-',
    'Real Tested Payouts',
    'Live Verified Intel',
    'Updated Today',
  ]

  console.log(`BANNED STRING LINE MATCHES:`)
  let totalBannedMatches = 0
  for (const pattern of bannedPatterns) {
    const matchingLines: { lineNum: number; content: string }[] = []
    lines.forEach((line, idx) => {
      if (line.includes(pattern)) {
        matchingLines.push({ lineNum: idx + 1, content: line.trim() })
      }
    })

    if (matchingLines.length > 0) {
      totalBannedMatches += matchingLines.length
      console.log(`  ❌ "${pattern}" (${matchingLines.length} matches):`)
      matchingLines.forEach((m) => {
        console.log(`     Line ${m.lineNum}: ${m.content.slice(0, 120)}`)
      })
    } else {
      console.log(`  ✓ "${pattern}": 0 matches`)
    }
  }

  console.log(`--------------------------------------------------`)

  // Sample marker matches with line numbers
  const samplePatterns = [
    'Aurora Bay',
    '[Sample]',
    'Illustrative',
    'Not Measured',
    'SAMPLE-REF',
  ]

  console.log(`SAMPLE MARKER LINE MATCHES:`)
  let totalSampleMatches = 0
  for (const pattern of samplePatterns) {
    const matchingLines: { lineNum: number; content: string }[] = []
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(pattern.toLowerCase())) {
        matchingLines.push({ lineNum: idx + 1, content: line.trim() })
      }
    })
    totalSampleMatches += matchingLines.length
    if (matchingLines.length > 0) {
      console.log(`  ✓ "${pattern}" (${matchingLines.length} matches):`)
      matchingLines.slice(0, 5).forEach((m) => {
        console.log(`     Line ${m.lineNum}: ${m.content.slice(0, 120)}`)
      })
      if (matchingLines.length > 5) {
        console.log(`     ... and ${matchingLines.length - 5} more lines`)
      }
    } else {
      console.log(`  ❌ "${pattern}": 0 matches`)
    }
  }

  console.log(`==================================================`)

  // Verification assertions
  let failed = false

  if (httpStatus !== 200) {
    console.error(`[FAIL] HTTP status is ${httpStatus}, expected 200`)
    failed = true
  }

  if (totalBannedMatches > 0) {
    console.error(`[FAIL] Found ${totalBannedMatches} total matches for prohibited strings`)
    failed = true
  }

  if (totalSampleMatches === 0) {
    console.error(`[FAIL] No sample markers found in HTML response`)
    failed = true
  }

  if (parsedBuildSha === 'NOT_FOUND') {
    console.error(`[FAIL] data-build-sha attribute is missing`)
    failed = true
  } else if (EXPECTED_SHA && parsedBuildSha !== EXPECTED_SHA) {
    console.error(`[FAIL] data-build-sha "${parsedBuildSha}" does NOT match expected commit SHA "${EXPECTED_SHA}"`)
    failed = true
  }

  if (failed) {
    console.error(`[RESULT] DIAGNOSTIC AUDIT FAILED`)
    process.exit(1)
  }

  console.log(`[RESULT] DIAGNOSTIC AUDIT PASSED CLEANLY`)
}

main().catch((err) => {
  console.error('[CRASH] Diagnostic script error:', err)
  process.exit(1)
})
