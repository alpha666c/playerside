import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Phase 2 (F2.5): defensive aliases so the canonical new routes are the
  // only ones that get indexed.
  const phase2Redirects = [
    { source: '/best-casino', destination: '/best-casinos', permanent: true },
    { source: '/no-wagering', destination: '/bonuses/no-wagering', permanent: true },
    { source: '/markets', destination: '/casinos', permanent: true },
  ]

  return [internetExplorerRedirect, ...phase2Redirects]
}
