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
const allConsole: string[] = []
page.on('console', (m) => allConsole.push(`[${m.type()}] ${m.text().slice(0, 220)}`))
page.on('pageerror', (e) => allConsole.push(`[pageerror] ${String(e).slice(0, 220)}`))

await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`)
await page.waitForSelector('span[title="Dashboard"]')

// --- 1) Hard-load the other custom views ---
for (const [name, url] of [
  ['pipeline', '/admin/pipeline'],
  ['gamification', '/admin/gamification'],
] as const) {
  await page.goto(`${SERVER}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8000)
  const t = (await page.locator('body').innerText().catch(() => 'ERR')).slice(0, 120)
  console.log(`HARD_NAV[${name}] body:`, JSON.stringify(t))
}

// --- 2) Hard-load cofounder ---
await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(10000)
const t = (await page.locator('body').innerText().catch(() => 'ERR')).slice(0, 120)
console.log('HARD_NAV[cofounder] body:', JSON.stringify(t))

// --- 3) Client-side nav: back to dashboard, then click the BeforeDashboard link ---
await page.goto(`${SERVER}/admin`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('span[title="Dashboard"]')
await page.waitForTimeout(2000)
const links = await page.locator('a[href*="cofounder"]').count()
console.log('COFOUNDER_LINKS_ON_DASH:', links)
if (links > 0) {
  await page.locator('a[href*="cofounder"]').first().click()
  await page.waitForTimeout(10000)
  const t2 = (await page.locator('body').innerText().catch(() => 'ERR')).slice(0, 200)
  console.log('CLIENT_NAV[cofounder] body:', JSON.stringify(t2))
  console.log('CLIENT_NAV URL:', page.url())
}

console.log('\nCONSOLE (last 25):')
for (const c of allConsole.slice(-25)) console.log(' ', c)

await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
console.log('DONE')
