import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

/**
 * ORG.md §3.3: "No page publishes without its compliance fields filled in —
 * enforced by the QA agent as a hard gate... an access-control rule, not a
 * policy statement." Payload's field-level `required: true` already blocks
 * a *published* document from saving with those fields empty (drafts are
 * exempt by design, which is correct — this only fires on the publish
 * transition), but that guarantee lives implicitly in the field schema. This
 * hook makes the gate explicit and centrally reviewable, and pins the exact
 * paths ORG.md cares about rather than trusting every future field edit to
 * keep `required: true` in place.
 *
 * Runs at beforeValidate, ahead of Payload's own field validation, so a
 * missing path fails with a clear, attributable error instead of a generic
 * "required field" message buried among unrelated fields.
 */
export const enforcePublishCompliance = (
  requiredPaths: string[],
): CollectionBeforeValidateHook => {
  return ({ data, req }) => {
    const status = data?._status ?? req?.data?._status
    if (status !== 'published') return data

    const missing = requiredPaths.filter((path) => {
      const value = path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in acc) {
          return (acc as Record<string, unknown>)[key]
        }
        return undefined
      }, data)
      return value === undefined || value === null || value === ''
    })

    if (missing.length > 0) {
      throw new APIError(
        `Cannot publish — missing required compliance field(s): ${missing.join(', ')} (ORG.md §3.3).`,
        400,
      )
    }

    return data
  }
}
