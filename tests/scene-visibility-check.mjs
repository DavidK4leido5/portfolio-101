/**
 * The brain stage must stop rendering and then unmount once the section spine
 * paints over it, and come back when the user scrolls up again.
 *
 *   node tests/scene-visibility-check.mjs
 */
import { loadChromium } from './playwright-env.mjs'

const chromium = await loadChromium()
const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const CI = !!process.env.CI
const READY = CI ? 120_000 : 60_000

const errors = []
const fail = (msg) => { errors.push(msg); console.error('FAIL:', msg) }

const browser = await chromium.launch({ args: CI ? ['--disable-dev-shm-usage'] : [] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 15_000 })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: READY })

const sentinel = await page.locator('[data-testid="scene-cover-sentinel"]').count()
if (sentinel !== 1) fail(`expected 1 scene sentinel, found ${sentinel}`)
else console.log('ok: scene cover sentinel present')

const state = () => page.getAttribute('.app-root', 'data-scene-state')
const canvasCount = () => page.locator('canvas').count()

if ((await state()) !== 'live') fail(`initial scene state was ${await state()}, expected live`)
else console.log('ok: scene live at the top of the page')

// Scroll into the section spine so the brain is fully covered
await page.evaluate(() => {
  const el = document.querySelector('[data-testid="sections-spine"]')
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + window.innerHeight)
})

await page.waitForFunction(
  () => document.querySelector('.app-root')?.getAttribute('data-scene-state') === 'paused',
  { timeout: 10_000 },
).catch(() => fail('scene did not pause after scrolling into the section spine'))

if (errors.length === 0) {
  if ((await canvasCount()) !== 1) fail('canvas should still exist while paused')
  else console.log('ok: render loop paused, context kept')
}

await page.waitForFunction(
  () => document.querySelector('.app-root')?.getAttribute('data-scene-state') === 'off',
  { timeout: 15_000 },
).catch(() => fail('scene did not unmount after staying below the brain stage'))

if ((await canvasCount()) !== 0) fail('canvas should be unmounted once the scene state is off')
else console.log('ok: canvas unmounted after the delay')

// Back to the top: the scene must come back
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForFunction(
  () => document.querySelector('.app-root')?.getAttribute('data-scene-state') === 'live',
  { timeout: 10_000 },
).catch(() => fail('scene did not resume after scrolling back up'))

await page.waitForSelector('canvas', { timeout: 20_000 }).catch(() => fail('canvas did not remount'))
const backOk = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return !!c && c.width > 0 && c.height > 0
})
if (!backOk) fail('remounted canvas is missing or zero-sized')
else console.log('ok: scene remounted and rendering')

await browser.close()

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`)
  process.exit(1)
}
console.log('\nSCENE VISIBILITY PASS')
