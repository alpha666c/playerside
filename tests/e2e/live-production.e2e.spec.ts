import { test, expect } from '@playwright/test'
import { createHash } from 'crypto'

test('Live production URL contains ZERO banned strings and contains sample labels', async ({
  page,
}, testInfo) => {
  const targetUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://playerside.vercel.app/'

  // Start tracing for this test
  await page.context().tracing.start({ screenshots: true, snapshots: true })

  const response = await page.goto(targetUrl, { waitUntil: 'networkidle' })

  // Capture x-vercel-id from the response headers
  const vercelId = (await response?.headerValue('x-vercel-id')) ?? 'unknown'
  const vercelCache = (await response?.headerValue('x-vercel-cache')) ?? 'unknown'

  const bodyText = await page.locator('body').innerText()

  // Banned content assertions
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

  for (const banned of bannedPatterns) {
    expect(
      bodyText,
      `Page at ${targetUrl} should not contain "${banned}"`,
    ).not.toContain(banned)
  }

  // Assert sample labels are visible
  expect(bodyText).toMatch(/Illustrative|\[Sample\]|Not Measured/)

  // Compute body-text SHA256
  const bodySha256 = createHash('sha256').update(bodyText).digest('hex')

  // Save screenshot
  const screenshotPath = testInfo.outputPath('production-homepage.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await testInfo.attach('production-homepage-screenshot', {
    path: screenshotPath,
    contentType: 'image/png',
  })

  // Save trace
  const tracePath = testInfo.outputPath('trace.zip')
  await page.context().tracing.stop({ path: tracePath })
  await testInfo.attach('trace', {
    path: tracePath,
    contentType: 'application/zip',
  })

  // Report artifact values as annotations
  testInfo.annotations.push(
    { type: 'page-url', description: page.url() },
    { type: 'body-text-sha256', description: bodySha256 },
    { type: 'x-vercel-id', description: vercelId },
    { type: 'x-vercel-cache', description: vercelCache },
  )

  // Also print to stdout for easy retrieval
  console.log(`[ARTIFACT] page-url: ${page.url()}`)
  console.log(`[ARTIFACT] body-text-sha256: ${bodySha256}`)
  console.log(`[ARTIFACT] x-vercel-id: ${vercelId}`)
  console.log(`[ARTIFACT] x-vercel-cache: ${vercelCache}`)
})
