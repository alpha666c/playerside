/**
 * Definitive verification of the importMap fix.
 * All three custom admin views must render; the Cofounder workspace gets the
 * full E2E (panes, chat stream, plan item, screenshots, console errors).
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
let fails = 0
const check = (name: string, pass: boolean, detail = '') => {
  log(`CHECK ${pass ? 'OK' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) fails++
}

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')
const payload: any = await getPayload({ config })

log('seed temp admin')
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
await payload.create({ collection: 'users', data: { email: ADMIN_EMAIL, password: ADMIN_PW, name: 'Verify Bot' } })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(40_000)
const consoleErrors: string[] = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 250)) })
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 250)}`))

log('login')
await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`)
await page.waitForSelector('span[title="Dashboard"]')
check('login + dashboard', true)

// --- All three custom views hard-nav ---
const views: Array<[string, string, string]> = [
  ['pipeline', '/admin/pipeline', 'Pipeline'],
  ['gamification', '/admin/gamification', 'Missions'],
  ['cofounder', '/admin/cofounder', 'Tickets & today'],
]
for (const [name, url, expectText] of views) {
  log(`hard-nav ${name}`)
  await page.goto(`${SERVER}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7000)
  const t = await page.locator('body').innerText().catch(() => 'ERR')
  check(`${name} view has body text`, t.trim().length > 50, `len=${t.trim().length}`)
  check(`${name} view shows expected text`, t.includes(expectText), expectText)
  await page.screenshot({ path: `${SHOT_DIR}/view-${name}.png`, fullPage: true })
}

// --- Cofounder workspace full E2E ---
await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Tickets & today', { timeout: 40_000 })
check('cofounder: left pane Tickets & today', true)
for (const [label, text] of [
  ['center: Ticket workspace', 'Ticket workspace'],
  ['center: plan board', 'Plan board · '],
  ['right: Tool activity', 'Tool activity'],
  ['right: Delegation queue', 'Delegation queue'],
] as const) {
  const visible = await page.locator(`text=${text}`).first().isVisible().catch(() => false)
  check(`cofounder: ${label}`, visible)
}
await page.screenshot({ path: `${SHOT_DIR}/01-workspace.png`, fullPage: true })

log('chat turn')
const chatInput = page.locator('[placeholder*="Ask the Cofounder"]')
await chatInput.fill('Plan today: review Stake casino, then check no-deposit bonuses')
await chatInput.press('Control+Enter')
const reply = await page.waitForSelector('text=plan is on the board', { timeout: 60_000 }).catch(() => null)
check('chat: streamed reply rendered', reply !== null)
await page.screenshot({ path: `${SHOT_DIR}/02-chat-reply.png`, fullPage: true })

log('plan item add')
const planInput = page.locator('[placeholder="Operator / bonus / task…"]')
const pc = await planInput.count()
check('plan add input present', pc > 0)
if (pc > 0) {
  await planInput.fill('Stake — casino review')
  await planInput.press('Enter')
  const item = await page.waitForSelector('text=Stake — casino review', { timeout: 20_000 }).catch(() => null)
  check('plan item added to board', item !== null)
  await page.screenshot({ path: `${SHOT_DIR}/03-plan-added.png`, fullPage: true })
}

const importMapErrors = consoleErrors.filter((e) => e.includes('getFromImportMap'))
check('no getFromImportMap errors', importMapErrors.length === 0, `${importMapErrors.length} found`)
check('no other console errors', consoleErrors.length === importMapErrors.length, `${consoleErrors.length} total`)
for (const e of consoleErrors.slice(0, 8)) log(`  console: ${e}`)

await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
log('temp admin removed')
log(`TOTAL_FAILS: ${fails}`)
log('DONE_ALL')
