import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'

const TARGET_URLS = [
  { name: 'Production Alias', url: 'https://playerside.vercel.app/' },
  { name: 'Active Deployment URL', url: 'https://playerside-dapmjh7l8-alpha666cs-projects.vercel.app/' },
  { name: 'Git Main Alias', url: 'https://playerside-git-main-alpha666cs-projects.vercel.app/' },
]

const USER_AGENTS = [
  { name: 'Default curl UA', ua: 'curl/8.7.1' },
  { name: 'Chrome Browser UA', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
]

const BANNED_PATTERNS = [
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

const SAMPLE_PATTERNS = [
  'Aurora Bay',
  '[Sample]',
  'Illustrative',
  'Not Measured',
  'SAMPLE-REF',
]

async function runAudit() {
  console.log(`================================================================================`)
  console.log(`COMPREHENSIVE RUNTIME RESPONSE AUDIT`)
  console.log(`================================================================================\n`)

  let comboIndex = 1
  for (const target of TARGET_URLS) {
    for (const userAgent of USER_AGENTS) {
      console.log(`--------------------------------------------------------------------------------`)
      console.log(`[COMBO ${comboIndex++}] Target: ${target.name} (${target.url})`)
      console.log(`User-Agent: ${userAgent.name} (${userAgent.ua})`)
      console.log(`--------------------------------------------------------------------------------`)

      try {
        const res = await fetch(target.url, {
          headers: { 'User-Agent': userAgent.ua },
          cache: 'no-store',
          redirect: 'follow',
        })

        const finalUrl = res.url
        const status = res.status
        const vercelId = res.headers.get('x-vercel-id') || 'MISSING'
        const vercelCache = res.headers.get('x-vercel-cache') || 'MISSING'
        const matchedPath = res.headers.get('x-matched-path') || 'MISSING'

        const rawHtml = await res.text()
        const rawSha256 = createHash('sha256').update(rawHtml).digest('hex')

        // Save raw body locally outside git (/tmp)
        const safeTargetName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const safeUaName = userAgent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const filename = `/tmp/raw_body_${safeTargetName}_${safeUaName}.html`
        fs.writeFileSync(filename, rawHtml)

        // Parse markers
        const shaMatch = rawHtml.match(/data-build-sha="([^"]+)"/)
        const parsedSha = shaMatch ? shaMatch[1] : 'NOT_FOUND'

        const sourceMatch = rawHtml.match(/data-homepage-data-source="([^"]+)"/)
        const parsedSource = sourceMatch ? sourceMatch[1] : 'NOT_FOUND'

        const lines = rawHtml.split('\n')

        console.log(`Final URL:                   ${finalUrl}`)
        console.log(`HTTP Status:                 ${status}`)
        console.log(`x-vercel-id:                 ${vercelId}`)
        console.log(`x-vercel-cache:              ${vercelCache}`)
        console.log(`x-matched-path:              ${matchedPath}`)
        console.log(`Saved File Path:             ${filename}`)
        console.log(`Raw HTML SHA256:             ${rawSha256}`)
        console.log(`Parsed data-build-sha:       ${parsedSha}`)
        console.log(`Parsed data-source-marker:   ${parsedSource}`)

        console.log(`\nFIRST 1,500 CHARACTERS:`)
        console.log(rawHtml.slice(0, 1500))
        console.log(`\n--- BANNED STRING MATCHES ---`)
        let bannedMatchCount = 0
        for (const pattern of BANNED_PATTERNS) {
          const matches: { lineNum: number; line: string }[] = []
          lines.forEach((l, idx) => {
            if (l.includes(pattern)) matches.push({ lineNum: idx + 1, line: l.trim() })
          })
          bannedMatchCount += matches.length
          if (matches.length > 0) {
            console.log(`❌ "${pattern}" (${matches.length} matches):`)
            matches.forEach((m) => console.log(`   Line ${m.lineNum}: ${m.line.slice(0, 120)}`))
          } else {
            console.log(`✓ "${pattern}": 0 matches`)
          }
        }

        console.log(`\n--- SAMPLE MARKER MATCHES ---`)
        let sampleMatchCount = 0
        for (const pattern of SAMPLE_PATTERNS) {
          const matches: { lineNum: number; line: string }[] = []
          lines.forEach((l, idx) => {
            if (l.toLowerCase().includes(pattern.toLowerCase())) matches.push({ lineNum: idx + 1, line: l.trim() })
          })
          sampleMatchCount += matches.length
          if (matches.length > 0) {
            console.log(`✓ "${pattern}" (${matches.length} matches):`)
            matches.slice(0, 3).forEach((m) => console.log(`   Line ${m.lineNum}: ${m.line.slice(0, 120)}`))
          } else {
            console.log(`❌ "${pattern}": 0 matches`)
          }
        }
        console.log(`\nCombo Summary: Banned matches=${bannedMatchCount}, Sample matches=${sampleMatchCount}\n`)
      } catch (err) {
        console.error(`ERROR fetching combo:`, err)
      }
    }
  }
}

runAudit()
