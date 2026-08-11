/**
 * Assert client-work folder resolves to at least one shot.
 * Run: node --experimental-strip-types tests/client-works-check.mjs
 * (or after build: import from dist — this file mirrors the glob contract)
 */
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/content/assets/client-work')
const ok = /\.(png|jpe?g|webp|svg|gif|avif)$/i
const files = readdirSync(dir).filter((f) => ok.test(f))

if (files.length < 1) {
  console.error('FAIL: no client-work assets in', dir)
  process.exit(1)
}

console.log(`ok: ${files.length} client-work asset(s)`)
