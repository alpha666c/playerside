import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: path.join(ROOT, '.env') })
const SERVER = 'http://localhost:3001'
const ADMIN_EMAIL = 'verify-browser@example.invalid'
const ADMIN_PW = 'verify-browser-pw-1'

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')
const payload: any = await getPayload({ config })
// ensure user exists (previous crash may have left it, delete+create is idempotent)
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
await payload.create({ collection: 'users', data: { email: ADMIN_EMAIL, password: ADMIN_PW, name: 'Verify Bot' } })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const consoleErrors: string[] = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)) })
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 400)}`))
page.setDefaultTimeout(30_000)

await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`)

await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(9000)

console.log('=== BODY TEXT (first 1500) ===')
const txt = (await page.locator('body').innerText()).slice(0, 1500)
console.log(txt || '(EMPTY BODY)')
console.log('\n=== ERROR BOUNDARY / ALERT TEXT ===')
for (const sel of ['.error', '[role="alert"]', '.toast-error', 'h1', 'h2']) {
  const n = await page.locator(sel).count()
  if (n > 0) {
    for (let i = 0; i < Math.min(n, 3); i++) {
      console.log(`${sel}[${i}]:`, (await page.locator(sel).nth(i).innerText().catch(() => '')).slice(0, 200))
    }
  }
}
console.log('\n=== CONSOLE ERRORS ===')
console.log(consoleErrors.length ? consoleErrors.slice(0, 12).join('\n') : '(none)')

// API check with the session cookie
const cookie = (await page.context().cookies()).find((c) => c.name === 'payload-token')
console.log('\n=== API /api/cofounder/tickets/today (with session) ===')
if (cookie) {
  const res = await page.request.get(`${SERVER}/api/cofounder/tickets/today`, {
    headers: { Cookie: `payload-token=${cookie.value}` },
  })
  console.log('status:', res.status())
  console.log('body:', (await res.text()).slice(0, 500))
} else {
  console.log('NO payload-token cookie found')
}

await page.screenshot({ path: '/tmp/playerside-verify/diag.png', fullPage: true })
await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
console.log('DONE')
