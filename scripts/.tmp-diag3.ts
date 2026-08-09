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
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
await payload.create({ collection: 'users', data: { email: ADMIN_EMAIL, password: ADMIN_PW, name: 'Verify Bot' } })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(30_000)

await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`)

// Dashboard render check
await page.waitForSelector('span[title="Dashboard"]', { timeout: 30_000 }).catch(() => {})
await page.waitForTimeout(3000)
const dashText = (await page.locator('body').innerText().catch(() => 'ERR')).slice(0, 250)
console.log('DASHBOARD_BODY:', JSON.stringify(dashText))

// Cofounder view
await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(12000)
const body = await page.locator('body').innerText().catch(() => 'ERR')
console.log('COFOUNDER_BODY_LEN:', body.length)
console.log('COFOUNDER_BODY:', JSON.stringify(body.slice(0, 300)))
const html = await page.content()
for (const marker of ['cofounder', 'CofounderView', 'Tickets & today', 'cofounder-sessions']) {
  console.log(`HTML_HAS[${marker}]:`, html.toLowerCase().includes(marker.toLowerCase()))
}
// what's the actual main container?
const main = await page.locator('main').count()
console.log('MAIN_COUNT:', main)
const nav = await page.locator('nav').count()
console.log('NAV_COUNT:', nav)
// try the sidebar links text
const side = await page.locator('a,button').allInnerTexts()
console.log('LINK/BUTTON TEXTS (first 20):', JSON.stringify(side.slice(0, 20).map((s) => s.trim()).filter(Boolean)))

await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
console.log('DONE')
