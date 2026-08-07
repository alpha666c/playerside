/**
 * One-off script: populate the Header/Footer nav globals with real Playerside
 * links. Deliberately narrow — unlike the full `/api/seed` endpoint (which
 * resets the entire demo content set from the Payload website template),
 * this only touches the two nav globals.
 *
 * Now points at real routes rather than homepage anchors wherever a real
 * page exists (ORG.md §3.4 — category clarity means separate top-level nav
 * entries, not one dropdown). "The wall" stays an anchor since the Pressure
 * Test is a homepage-only showcase, not duplicated elsewhere.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-nav.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const navItems = [
  { link: { type: 'custom' as const, label: 'How we grade', url: '/#method' } },
  { link: { type: 'custom' as const, label: 'The wall', url: '/#wall' } },
  { link: { type: 'custom' as const, label: 'Casino reviews', url: '/casinos' } },
  { link: { type: 'custom' as const, label: 'Crypto reviews', url: '/crypto-casinos' } },
  { link: { type: 'custom' as const, label: 'Bonuses', url: '/bonuses' } },
  { link: { type: 'custom' as const, label: 'Missions', url: '/missions' } },
]

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  await payload.updateGlobal({
    slug: 'header',
    data: { navItems },
    context: { disableRevalidate: true },
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: { navItems },
    context: { disableRevalidate: true },
  })

  payload.logger.info('Seeded header/footer nav items.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
