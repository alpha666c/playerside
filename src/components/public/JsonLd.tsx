import React from 'react'

/**
 * Emits a schema.org JSON-LD script block. Server component — the payload is
 * always built server-side (from CMS data), never from client input.
 */
export const JsonLd: React.FC<{ data: object }> = ({ data }) => (
  <script
    // Reviewer pass (2026-08-08): JSON.stringify does not escape `</script>`;
    // escaping `<` as \u003c keeps a CMS-authored title from breaking out of
    // the script tag (admin-gated input, but hardening is one line).
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    type="application/ld+json"
  />
)
