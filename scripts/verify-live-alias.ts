/**
 * Post-Deploy Production-Alias Verification Script
 *
 * Fetches the live production alias (https://playerside.vercel.app/) anonymously,
 * verifies headers, short commit marker, body-text SHA256, banned strings (0 required),
 * and sample-label requirements. Exits with 1 on any failure to block CI/release on violation.
 *
 * Usage: npx tsx scripts/verify-live-alias.ts
 */

import { createHash } from 'crypto'

const TARGET_URL = process.env.LIVE_VERIFY_URL || 'https://playerside.vercel.app/'

async function main() {
  console.log(`[VERIFY-LIVE-ALIAS] Target: ${TARGET_URL}`)

  const res = await fetch(TARGET_URL, {
    headers: {
      'User-Agent': 'Playerside-Release-Verification/1.0',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error(`[FAIL] HTTP status ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const vercelId = res.headers.get('x-vercel-id') || 'unknown'
  const vercelCache = res.headers.get('x-vercel-cache') || 'unknown'
  const html = await res.text()

  // Extract body text approximately for SHA256 calculation
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  // Strip tags for text-only SHA256
  const bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const bodySha256 = createHash('sha256').update(bodyText).digest('hex')

  // Extract short commit marker from data-build-sha attribute
  const shaMatch = html.match(/data-build-sha="([^"]+)"/)
  const shortCommitMarker = shaMatch ? shaMatch[1] : 'NOT_FOUND'

  // Extract data source marker
  const sourceMatch = html.match(/data-homepage-data-source="([^"]+)"/)
  const dataSourceMarker = sourceMatch ? sourceMatch[1] : 'NOT_FOUND'

  // Banned patterns check
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

  const bannedFound: string[] = []
  for (const pattern of bannedPatterns) {
    if (html.includes(pattern)) {
      bannedFound.push(pattern)
    }
  }

  // Sample labels check
  const sampleRegex = /Aurora Bay|\[Sample\]|Illustrative|Not Measured/i
  const sampleFound = sampleRegex.test(html)

  console.log('--- POST-DEPLOY ALIAS AUDIT RESULTS ---')
  console.log(`Deployment ID (x-vercel-id):  ${vercelId}`)
  console.log(`Cache Status (x-vercel-cache): ${vercelCache}`)
  console.log(`Short Commit Marker:            ${shortCommitMarker}`)
  console.log(`Data Source Marker:             ${dataSourceMarker}`)
  console.log(`Body-Text SHA256:               ${bodySha256}`)
  console.log(`Banned Strings Found (0 req):   ${bannedFound.length} ${bannedFound.length > 0 ? `(${bannedFound.join(', ')})` : 'PASSED (0)'}`)
  console.log(`Sample Labels Result:           ${sampleFound ? 'PASSED (Found)' : 'FAILED (Missing)'}`)
  console.log('---------------------------------------')

  let failed = false

  if (bannedFound.length > 0) {
    console.error(`[CRITICAL FAIL] Banned content found on live alias: ${bannedFound.join(', ')}`)
    failed = true
  }

  if (!sampleFound) {
    console.error('[CRITICAL FAIL] Sample labels (Aurora Bay / [Sample] / Illustrative / Not Measured) missing from live alias')
    failed = true
  }

  if (shortCommitMarker === 'NOT_FOUND') {
    console.error('[CRITICAL FAIL] data-build-sha attribute missing from live HTML')
    failed = true
  }

  if (failed) {
    console.error('[VERIFY-LIVE-ALIAS] Verification FAILED.')
    process.exit(1)
  }

  console.log('[VERIFY-LIVE-ALIAS] Verification PASSED cleanly.')
}

main().catch((err) => {
  console.error('[VERIFY-LIVE-ALIAS] Unhandled exception:', err)
  process.exit(1)
})
