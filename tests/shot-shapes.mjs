// Visual check: force each hero shape via the debug bridge and screenshot it.
// (The reel is on wall time; the headless software renderer runs ~2fps, so
// racing the live timeline is flaky — pinning uniforms per frame is not.)
// Usage: SMOKE_URL=http://127.0.0.1:4173 node tests/shot-shapes.mjs
import { mkdirSync } from 'node:fs'
import { loadChromium } from './playwright-env.mjs'

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173'
const OUT = 'tests/artifacts'
mkdirSync(OUT, { recursive: true })

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 120000 })
await page.waitForSelector('.ui[data-phase="idle"]', { timeout: 60000 })

const shapes = [
  { id: 0, file: 'shape-brain.png' },
  { id: 1, file: 'shape-network.png' },
  { id: 2, file: 'shape-stack.png' },
]

for (const { id, file } of shapes) {
  await page.evaluate((shape) => {
    const u = window.__scene.uniforms
    clearInterval(window.__shapePin)
    window.__shapePin = setInterval(() => {
      u.uShapeFrom.value = shape
      u.uShapeTo.value = shape
      u.uShapeMorph.value = 0
      u.uShapeAlt.value = shape === 0 ? 0 : 0.85
    }, 16)
  }, id)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${file}` })
  console.log('captured', file)
}

await browser.close()
