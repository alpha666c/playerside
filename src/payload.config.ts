import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { AgentLogs } from './collections/AgentLogs'
import { Categories } from './collections/Categories'
import { CryptoCasinoReviews } from './collections/CryptoCasinoReviews'
import { GamificationProfiles } from './collections/GamificationProfiles'
import { Media } from './collections/Media'
import { NoWageringBonuses } from './collections/NoWageringBonuses'
import { Operator } from './collections/Operator'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Quests } from './collections/Quests'
import { ResearchQueue } from './collections/ResearchQueue'
import { TraditionalCasinoReviews } from './collections/TraditionalCasinoReviews'
import { UserQuests } from './collections/UserQuests'
import { Users } from './collections/Users'
import { WageringBonuses } from './collections/WageringBonuses'
import { XpEvents } from './collections/XpEvents'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { Homepage } from './Homepage/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // Phase 5: the dashboard home is now an operations summary (the template
      // 'welcome + seed' block was Payload-template boilerplate).
      beforeDashboard: ['@/components/BeforeDashboard'],
      views: {
        // Phase 5: read-only Review Intelligence System pipeline board.
        pipeline: {
          Component: '@/components/admin/PipelineView',
          exact: true,
          path: '/pipeline',
        },
        // Phase 5: read-only mission roster / vex-ledger audit surface.
        gamification: {
          Component: '@/components/admin/GamificationView',
          exact: true,
          path: '/gamification',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    // The schema is migration-driven now (9 formal migrations) — dev-mode
    // auto-push computed a broken diff against an unrelated table during
    // e2e runs (tried to drop a constraint that doesn't exist). Disabling
    // it removes an entire class of undocumented, un-reviewed schema
    // drift; `payload migrate` is the only path that changes the schema.
    push: false,
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    Users,
    TraditionalCasinoReviews,
    CryptoCasinoReviews,
    WageringBonuses,
    NoWageringBonuses,
    AgentLogs,
    Operator,
    ResearchQueue,
    Quests,
    GamificationProfiles,
    UserQuests,
    XpEvents,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, Homepage],
  plugins,
  // FIX-02 (audit 2026-08-07): a hardcoded fallback secret would let anyone
  // forge admin JWTs in any env that misses PAYLOAD_SECRET. Dev keeps a
  // fallback so `pnpm dev` boots without ceremony; everything else must fail
  // loudly at config load instead of silently running with a public secret.
  secret: (() => {
    const secret = process.env.PAYLOAD_SECRET
    if (!secret) {
      if (process.env.NODE_ENV === 'development') {
        return 'development-secret-key-change-in-production'
      }
      throw new Error(
        'PAYLOAD_SECRET is required in non-development environments (audit FIX-02, 2026-08-07)',
      )
    }
    return secret
  })(),

  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
