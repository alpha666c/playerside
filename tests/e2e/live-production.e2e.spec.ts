import { test, expect } from '@playwright/test'

test('Live production URL contains ZERO banned strings and contains sample labels', async ({ page }) => {
  const targetUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://playerside.vercel.app/'

  await page.goto(targetUrl, { waitUntil: 'networkidle' })

  const bodyText = await page.locator('body').innerText()

  const bannedPatterns = [
    'Stake.com',
    'BitStarz',
    'BC.Game',
    'Roobet',
    'EV-PAYOUT-',
    'Real Tested Payouts',
    'Live Verified Intel',
  ]

  for (const banned of bannedPatterns) {
    expect(bodyText, `Page at ${targetUrl} should not contain "${banned}"`).not.toContain(banned)
  }

  // Assert sample labels are visible
  expect(bodyText).toMatch(/Illustrative|\[Sample\]|Not Measured/)
})
