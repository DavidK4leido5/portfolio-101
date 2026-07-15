import { loadChromium } from './playwright-env.mjs'

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:4173'
const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`)
})

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 90000 })
await page.waitForTimeout(2500)

const diag = await page.evaluate(() => ({
  tier: document.querySelector('.ui')?.getAttribute('data-quality-tier'),
  ambient: window.__scene?.ambient ?? null,
  hero: document.querySelector('[data-testid="hero-typography"]')?.getAttribute('data-hero-bottom'),
  loadPhase: document.querySelector('.ui')?.getAttribute('data-load-phase'),
}))

console.log('=== ambient diagnostics ===')
console.log('URL:', URL)
console.log(JSON.stringify(diag, null, 2))
console.log('Errors:', errors.length ? errors : 'none')

await page.screenshot({ path: 'tests/artifacts/ambient-check.png', fullPage: false })
console.log('Screenshot: tests/artifacts/ambient-check.png')

await browser.close()

if (errors.length) {
  console.error('FAIL: runtime errors')
  process.exit(1)
}
if (!diag.ambient || diag.ambient.count < 1) {
  console.error('FAIL: ambient particles not active')
  process.exit(1)
}
if (diag.ambient.fade < 0.85) {
  console.error(`FAIL: ambient fade too low (${diag.ambient.fade})`)
  process.exit(1)
}
console.log('PASS: ambient particles verified')
