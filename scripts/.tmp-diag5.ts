import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnv({ path: path.join(ROOT, '.env') })
const SERVER = 'http://localhost:3000' // dev server
const ADMIN_EMAIL = 'verify-browser@example.invalid'
const ADMIN_PW = 'verify-browser-pw-1'

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')
const payload: any = await getPayload({ config })
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
await payload.create({ collection: 'users', data: { email: ADMIN_EMAIL, password: ADMIN_PW, name: 'Verify Bot' } })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(60_000)
const consoleErrors: string[] = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`))

await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email', { timeout: 60_000 })
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`, { timeout: 60_000 })
await page.waitForSelector('span[title="Dashboard"]', { timeout: 60_000 })
console.log('DEV_LOGIN: ok')

for (const [name, url] of [
  ['pipeline', '/admin/pipeline'],
  ['gamification', '/admin/gamification'],
  ['cofounder', '/admin/cofounder'],
] as const) {
  await page.goto(`${SERVER}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(12000) // dev compiles on demand — be generous
  const t = (await page.locator('body').innerText().catch(() => 'ERR')).slice(0, 150)
  console.log(`DEV_HARD_NAV[${name}] body:`, JSON.stringify(t))
}

console.log('DEV_CONSOLE_ERRORS:', consoleErrors.length ? consoleErrors.slice(0, 6).join('\n  ') : '(none)')
await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
console.log('DONE')
