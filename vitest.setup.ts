// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Local/CI test runs don't have a real Vercel Blob token. `@vercel/blob`'s
// put/get/del are mocked at the module level in tests/int/media.int.spec.ts,
// so this placeholder only needs to be a truthy string to enable the
// cloudStoragePlugin wiring in src/plugins/index.ts — it is never sent to
// Vercel and is not a real credential. A real token (if pulled locally)
// takes precedence via `||=`.
process.env.BLOB_READ_WRITE_TOKEN ||= 'test-placeholder-not-a-real-token'
