import crypto from 'crypto'
// @ts-ignore
import { JSDOM } from 'jsdom'


async function verifyLiveUrl() {
  const url = process.env.LIVE_URL || 'https://playerside.vercel.app/'
  console.log(`[VERIFY-LIVE] Fetching live rendered URL: ${url}`)

  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  })
  if (!res.ok) {
    throw new Error(`[VERIFY-LIVE] HTTP request failed with status: ${res.status}`)
  }

  const html = await res.text()
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const bodyText = doc.body.textContent || ''
  const bodySha256 = crypto.createHash('sha256').update(bodyText).digest('hex')
  console.log(`[VERIFY-LIVE] Rendered Body SHA256: ${bodySha256}`)

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
    '4m 12s',
    'USDT (TRC-20)',
  ]

  const foundBanned: string[] = []
  for (const banned of bannedPatterns) {
    if (bodyText.includes(banned) || html.includes(banned)) {
      foundBanned.push(banned)
      const idx = html.indexOf(banned)
      const snippet = html.substring(Math.max(0, idx - 50), Math.min(html.length, idx + 100))
      console.error(`[VERIFY-LIVE] Match Context for "${banned}": ...${snippet}...`)
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
