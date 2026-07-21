import type { Metadata } from 'next'

import { HomepageView } from '@/components/homepage/HomepageView'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import React from 'react'

// The homepage is a dedicated, hand-built page (not the generic CMS
// pages/blocks pipeline used by `/[slug]`) — see the Homepage global
// (`src/Homepage/config.ts`) for the editable content behind it.
export default async function HomePage() {
  const data = await getCachedGlobal('homepage', 1)()

  return (
    <article>
      <HomepageView data={data} />
    </article>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCachedGlobal('homepage', 1)()

  const title = data.heroHeadline || 'Playerside'
  const description =
    data.heroSubhead ||
    'Commission-blind casino reviews — evidence-backed scores, exact bonus terms.'

  return {
    description,
    openGraph: mergeOpenGraph({
      description,
      title,
      url: '/',
    }),
    title,
  }
}
