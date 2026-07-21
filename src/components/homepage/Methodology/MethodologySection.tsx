import React from 'react'

import { SectionHead } from '@/components/homepage/shared/SectionHead'
import { methodologyColumns } from './data'
import { MethodologyRow } from './MethodologyRow'

export const MethodologySection: React.FC = () => (
  <section className="scroll-mt-24 py-16 sm:py-20 lg:py-24" id="method">
    <div className="container">
      <SectionHead
        eyebrow="How we grade"
        heading="Nine categories. Logged evidence. No exceptions."
      />
      <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {methodologyColumns.map((column, i) => (
          <div key={i}>
            {column.map((row) => (
              <MethodologyRow key={row.label} label={row.label} weight={row.weight} />
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
)
