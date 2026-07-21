/**
 * One-off script: populate the Header/Footer nav globals with real Playerside
 * links now that the homepage sections exist. Deliberately narrow — unlike
 * the full `/api/seed` endpoint (which resets the entire demo content set
 * from the Payload website template), this only touches the two nav globals.
 *
 * Usage: npx cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-nav.ts
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const { getPayload } = await import('payload')
const { default: configPromise } = await import('../src/payload.config')

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  await payload.updateGlobal({
    slug: 'header',
    data: {
      navItems: [
        { link: { type: 'custom', label: 'How we grade', url: '/#method' } },
        { link: { type: 'custom', label: 'The wall', url: '/#wall' } },
        { link: { type: 'custom', label: 'Sample reviews', url: '/#reviews' } },
      ],
    },
    context: { disableRevalidate: true },
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      navItems: [
        { link: { type: 'custom', label: 'How we grade', url: '/#method' } },
        { link: { type: 'custom', label: 'The wall', url: '/#wall' } },
        { link: { type: 'custom', label: 'Sample reviews', url: '/#reviews' } },
      ],
    },
    context: { disableRevalidate: true },
  })

  payload.logger.info('Seeded header/footer nav items.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
