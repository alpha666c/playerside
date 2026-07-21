import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    // Title comes from the Homepage global's hero headline (see app/(frontend)/page.tsx).
    await expect(page).toHaveTitle(/casinos|Playerside/i)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('pressure test blocks offers without moving the score', async ({ page }) => {
    await page.goto('http://localhost:3000')
    const slider = page.locator('.pressure-slider')
    await slider.scrollIntoViewIfNeeded()
    await slider.focus()

    // Escalate the simulated commission to maximum — keyboard only, no hover.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowRight')
    }

    await expect(slider).toHaveValue('4')
    const liveRegion = page.locator('#wall [aria-live="polite"]')
    await expect(liveRegion).toContainText(/offers blocked: 4/i)
    await expect(liveRegion).toContainText(/score moved: 0\.0/i)
    // The sealed score itself never changes.
    await expect(page.locator('#wall')).toContainText('8.2')
  })

  test('redacted commission field reveals the rule, not a number', async ({ page }) => {
    await page.goto('http://localhost:3000')
    const redacted = page.getByRole('button', { name: /commission/i }).first()
    await redacted.scrollIntoViewIfNeeded()
    await redacted.click()
    await expect(redacted).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('Withheld from graders by design').first()).toBeVisible()
  })
})
