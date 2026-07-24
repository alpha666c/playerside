import { JSDOM } from 'jsdom'

async function verifyLiveUrl() {
  const url = process.env.LIVE_URL || 'https://playerside.vercel.app/'
  console.log(`[VERIFY-LIVE] Fetching live rendered URL: ${url}`)

  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
  if (!res.ok) {
    throw new Error(`[VERIFY-LIVE] HTTP request failed with status: ${res.status}`)
  }

  const html = await res.text()
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const bodyText = doc.body.textContent || ''

  const bannedPatterns = [
    'Stake.com',
    'BitStarz',
    'BC.Game',
    'Roobet',
    'EV-PAYOUT-',
    'Real Tested Payouts',
    'Live Verified Intel',
  ]

  const foundBanned: string[] = []
  for (const banned of bannedPatterns) {
    if (bodyText.includes(banned) || html.includes(banned)) {
      foundBanned.push(banned)
    }
  }

  if (foundBanned.length > 0) {
    console.error(`[VERIFY-LIVE] FAIL: Found banned strings in live rendered HTML: ${foundBanned.join(', ')}`)
    process.exit(1)
  }

  const sampleMatches = bodyText.match(/Illustrative|\[Sample\]|Not Measured/i) || html.match(/Illustrative|\[Sample\]|Not Measured/i)
  if (!sampleMatches) {
    console.error('[VERIFY-LIVE] FAIL: Required sample indicators (Illustrative / [Sample] / Not Measured) not found in live HTML')
    process.exit(1)
  }

  console.log('[VERIFY-LIVE] PASS: 0 banned strings found in live rendered DOM. Sample indicators verified.')
}

verifyLiveUrl().catch((err) => {
  console.error(err)
  process.exit(1)
})
