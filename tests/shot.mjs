// Dev-only visual check. Headless GL is too slow to catch live intro frames,
// so after load we drive uSpawn manually to photograph each morph stage,
// then restore and capture idle brain-activity frames.
import { loadChromium } from './playwright-env.mjs'

const chromium = await loadChromium()

const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 90000 })
await page.waitForTimeout(1000)

const setSpawn = (v) =>
  page.evaluate((val) => {
    const u = window.__scene.uniforms
    u.uRevealFrom.value = 1e9
    u.uSpawn.value = val
    u.uConnect.value = val >= 1 ? 1 : 0
  }, v)

for (const [v, name] of [[0, 'spawn-000'], [0.25, 'spawn-025'], [0.55, 'spawn-055'], [0.85, 'spawn-085'], [1, 'spawn-100']]) {
  await setSpawn(v)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `tests/shots/${name}.png` })
}

// Idle brain-activity frames, spaced to show the color waves moving
await page.waitForTimeout(1500)
await page.screenshot({ path: 'tests/shots/ready-0.png' })
await page.waitForTimeout(2500)
await page.screenshot({ path: 'tests/shots/ready-1.png' })
await page.waitForTimeout(2500)
await page.screenshot({ path: 'tests/shots/ready-2.png' })

await browser.close()
console.log('shots written')
