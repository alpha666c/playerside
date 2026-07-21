'use client'
import { Homepage } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Homepage['sampleOperators']>[number]>()

  const label = data?.data?.name
    ? `Operator ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.name}`
    : 'Row'

  return <div>{label}</div>
}
