import React from 'react'

import type { Homepage } from '@/payload-types'

import { CtaBand } from './CtaBand/CtaBand'
import { HomepageHero } from './Hero/HomepageHero'
import { MethodologySection } from './Methodology/MethodologySection'
import { SampleReviewsSection } from './SampleReviews/SampleReviewsSection'
import { GrainOverlay } from './shared/GrainOverlay'
import { TheWallSection } from './Wall/TheWallSection'

export const HomepageView: React.FC<{ data: Homepage }> = ({ data }) => (
  <>
    <GrainOverlay />
    <HomepageHero data={data} />
    <MethodologySection />
    <TheWallSection />
    <SampleReviewsSection operators={data.sampleOperators} />
    <CtaBand data={data} />
  </>
)
