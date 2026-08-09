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
const failed: string[] = []
const badResponses: string[] = []
const consoleErrors: string[] = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`))
page.on('requestfailed', (r) => failed.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/_next/')) {
    badResponses.push(`${r.status()} ${r.url().slice(0, 160)}`)
  }
})
page.setDefaultTimeout(30_000)

await page.goto(`${SERVER}/admin/login`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#field-email')
await page.fill('#field-email', ADMIN_EMAIL)
await page.fill('#field-password', ADMIN_PW)
await page.click('button[type="submit"]')
await page.waitForURL(`${SERVER}/admin`)

await page.goto(`${SERVER}/admin/cofounder`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(10000)

console.log('FINAL_URL:', page.url())
const html = await page.content()
console.log('HTML_LEN:', html.length)
// find the react root and what's inside
const m = html.match(/<div[^>]*id="app"[^>]*>([\s\S]*?)<\/div>/)
console.log('APP_ROOT_SNIPPET:', m ? m[1].slice(0, 400) : '(no #app div)')
const bodyText = await page.locator('body').innerText().catch(() => 'ERR')
console.log('BODY_TEXT_LEN:', bodyText.length)
console.log('BODY_TEXT_SNIPPET:', bodyText.slice(0, 300))
console.log('\nFAILED_REQUESTS:', failed.length ? failed.slice(0, 10).join('\n  ') : '(none)')
console.log('BAD_NEXT_RESPONSES:', badResponses.length ? badResponses.slice(0, 10).join('\n  ') : '(none)')
console.log('CONSOLE_ERRORS:', consoleErrors.length ? consoleErrors.slice(0, 8).join('\n  ') : '(none)')

await browser.close()
await payload.delete({ collection: 'users', where: { email: { equals: ADMIN_EMAIL } } })
console.log('DONE')
