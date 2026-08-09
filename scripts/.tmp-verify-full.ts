/**
 * Full browser verification of the G.4 Cofounder workspace — v2.
 * domcontentloaded waits + explicit progress logs written to stdout (captured
 * to /tmp/verify.log by the runner) so hangs are visible.
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: path.join(ROOT, '.env') })

const SERVER = 'http://localhost:3001'
const ADMIN_EMAIL = 'verify-browser@example.invalid'
const ADMIN_PW = 'verify-browser-pw-1'
const SHOT_DIR = '/tmp/playerside-verify'

const log = (m: string) => console.log(`LOG ${new Date().toISOString().slice(11, 19)} ${m}`)

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')

log('STEP boot: loading payload')
const payload: any = await getPayload({ config })

log('STEP seed: deleting+creating temp admin')
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
await payload.create({
  collection: 'users',
  data: { email: ADMIN_EMAIL, password: ADMIN_PW, name: 'Verify Bot' },
})
log('STEP seed: done')

log('STEP launch: chromium channel=chrome')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
log('STEP launch: browser up')
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const consoleErrors: string[] = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`))
page.setDefaultTimeout(40_000)

log('STEP goto login')
await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email', { timeout: 30_000 })
log('STEP login form visible, filling')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`, { timeout: 40_000 })
log('STEP login ok, on dashboard')

log('STEP goto cofounder view')
await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })

log('STEP wait for left pane')
await page.waitForSelector('text=Tickets & today', { timeout: 40_000 })
log('CHECK ok: left pane Tickets & today')

const checks: Array<[string, string]> = [
  ['center: Ticket workspace', 'Ticket workspace'],
  ['center: plan board', 'Plan board · '],
  ['right: Tool activity', 'Tool activity'],
  ['right: Delegation queue', 'Delegation queue'],
  ['chat input present', 'Ask the Cofounder to plan, research, or draft'],
]
for (const [label, text] of checks) {
  log(`CHECK ${label}`)
  try {
    await page.waitForSelector(`text=${text}`, { timeout: 15_000 })
    log(`CHECK ok: ${label}`)
  } catch {
    log(`CHECK FAIL: ${label} NOT FOUND`)
  }
}
await page.screenshot({ path: `${SHOT_DIR}/01-workspace.png`, fullPage: true })
log('SHOT 01-workspace.png')

log('STEP chat: fill input')
const chatInput = page.locator('[placeholder*="Ask the Cofounder"]')
await chatInput.fill('Plan today: review Stake casino, then check no-deposit bonuses')
await chatInput.press('Control+Enter')
log('STEP chat: sent, waiting for streamed reply')
try {
  await page.waitForSelector('text=plan is on the board', { timeout: 60_000 })
  log('CHECK ok: chat streamed reply rendered')
} catch {
  log('CHECK FAIL: chat reply did not render')
}
await page.screenshot({ path: `${SHOT_DIR}/02-chat-reply.png`, fullPage: true })

log('STEP plan: add item')
const planInput = page.locator('[placeholder="Operator / bonus / task…"]')
const pc = await planInput.count()
log(`STEP plan: input count=${pc}`)
if (pc > 0) {
  await planInput.fill('Stake — casino review')
  await planInput.press('Enter')
  try {
    await page.waitForSelector('text=Stake — casino review', { timeout: 20_000 })
    log('CHECK ok: plan item added')
  } catch {
    log('CHECK FAIL: plan item text not found')
  }
  await page.screenshot({ path: `${SHOT_DIR}/03-plan-added.png`, fullPage: true })
} else {
  log('CHECK FAIL: plan add input not found')
}

await page.screenshot({ path: `${SHOT_DIR}/04-final.png`, fullPage: true })
log(`CONSOLE_ERRORS: ${consoleErrors.length}`)
for (const e of consoleErrors.slice(0, 10)) log(`  console: ${e}`)

await browser.close()
log('STEP cleanup: removing temp admin')
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
log('DONE_ALL')
