const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/posts-sitemap.xml', '/pages-sitemap.xml', '/*', '/posts/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        disallow: '/admin/*',
      },
    ],
    additionalSitemaps: [
      `${SITE_URL}/pages-sitemap.xml`,
      `${SITE_URL}/posts-sitemap.xml`,
      // Phase 2 (F2.5): /sitemap.xml is the app-router sitemap (see
      // src/app/sitemap.ts) — it covers every public route (reviews,
      // bonuses, market archives, best-of lists) and is regenerated from the
      // CMS on request. next-sitemap must NOT emit its own public/sitemap.xml
      // index over it — the postbuild script removes that file (package.json).
      `${SITE_URL}/sitemap.xml`,
    ],
  },
}
