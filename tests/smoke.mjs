import { chromium } from 'playwright'

const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const SECTIONS = ['projects', 'experience', 'skills', 'about', 'contact']
const LOOPS = Number(process.env.SMOKE_LOOPS ?? 2)

const errors = []
const fail = (msg) => { errors.push(msg); console.error('FAIL:', msg) }

const browser = await chromium.launch()

function watch(page) {
  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) fail(`console: ${m.text()}`)
  })
}

const sectorHidden = async (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="sector-indicators"]')
  if (!el) return { missing: true }
  const s = getComputedStyle(el)
  return {
    opacity: s.opacity,
    visibility: s.visibility,
    pointerEvents: s.pointerEvents,
    loadPhase: document.querySelector('.ui')?.getAttribute('data-load-phase'),
  }
})

// Desktop tier: load + render + no errors (headless software GL is too slow for full desktop navigation)
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
watch(desktop)
await desktop.goto(URL, { waitUntil: 'domcontentloaded' })
await desktop.waitForSelector('canvas', { timeout: 15000 })

// Sectors hidden until brain assembled
await desktop.waitForTimeout(800)
let sectors = await sectorHidden(desktop)
if (sectors.missing) fail('desktop: sector indicators missing')
else if (sectors.loadPhase !== 'ready' && (sectors.opacity !== '0' || sectors.visibility !== 'hidden')) {
  fail(`desktop intro: sectors visible too early opacity=${sectors.opacity} visibility=${sectors.visibility}`)
} else console.log('ok: sectors hidden during intro')

await desktop.waitForSelector('[data-testid="sector-indicators"][data-sectors-ready="true"]', { timeout: 60000 })
sectors = await sectorHidden(desktop)
if (sectors.pointerEvents === 'none' || Number(sectors.opacity) < 0.9) {
  fail(`desktop ready: sectors not interactive opacity=${sectors.opacity} pointerEvents=${sectors.pointerEvents}`)
} else console.log('ok: sectors visible after brain assembled')

await desktop.waitForTimeout(500)
const glOk = await desktop.evaluate(() => {
  const c = document.querySelector('canvas')
  return !!c && c.width > 0 && c.height > 0
})
if (!glOk) fail('desktop: canvas missing or zero-sized')
else console.log('ok: desktop tier renders')
const fps = await desktop.evaluate(
  () => new Promise((r) => {
    let n = 0
    const t0 = performance.now()
    const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(Math.round(n / 2)) }
    requestAnimationFrame(f)
  }),
)
console.log(`desktop fps (headless, software GL): ~${fps}`)

// One desktop navigation: lobe highlight via uFocus after modal
const readFx = () => desktop.evaluate(() => ({
  focus: window.__scene?.uniforms.uFocus.value ?? -1,
  dim: window.__scene?.uniforms.uDim.value ?? -1,
  active: window.__scene?.uniforms.uActive.value ?? -2,
}))
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: 30000 })
await desktop.click('[data-section="projects"]', { force: true })
await desktop.waitForSelector('[data-testid="overlay-title"]', { timeout: 90000 })
await desktop.waitForTimeout(2500)
let fx = await readFx()
if (!(fx.active === 0)) fail(`desktop arrived: uActive=${fx.active}, expected 0 (projects)`)
else console.log('ok: active lobe set on projects')
if (!(fx.focus > 0.5)) fail(`desktop arrived: uFocus=${fx.focus}, expected >0.5 after modal`)
else console.log('ok: lobe nodes highlighted after modal')
if (!(fx.dim > 0.4)) fail(`desktop arrived: uDim=${fx.dim}, expected >0.4`)
await desktop.keyboard.press('Escape')
await desktop.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: 90000 })
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: 90000 })
await desktop.mouse.move(0, 0)
await desktop.waitForTimeout(800)
fx = await readFx()
if (!(fx.focus < 0.05)) fail(`desktop returned: uFocus=${fx.focus}, expected <0.05`)
if (!(fx.dim < 0.05)) fail(`desktop returned: uDim=${fx.dim}, expected <0.05`)
if (fx.focus < 0.05 && fx.dim < 0.05) console.log('ok: lobe highlight dissolved on return')
await desktop.close()

// Mobile tier: full navigation loop (light enough for software GL to animate in real time)
const page = await browser.newPage({ viewport: { width: 720, height: 540 } })
watch(page)
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 90000 })
await page.waitForTimeout(500)

const idle = () => page.waitForSelector('.ui[data-phase="idle"]', { timeout: 30000 })

for (let loop = 1; loop <= LOOPS; loop++) {
  console.log(`--- loop ${loop}/${LOOPS} ---`)
  for (const s of SECTIONS) {
    await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 60000 })
    await idle()
    await page.hover(`[data-section="${s}"]`, { force: true })
    await page.waitForTimeout(250)
    await page.click(`[data-section="${s}"]`, { force: true })
    await page.waitForSelector('[data-testid="overlay-title"]', { timeout: 30000 })
    const title = (await page.textContent('[data-testid="overlay-title"]'))?.trim().toLowerCase()
    if (title !== s) fail(`section ${s}: overlay title was "${title}"`)
    else console.log(`ok: ${s} overlay shown`)
    await page.waitForTimeout(2000)
    const mfx = await page.evaluate((sectionId) => ({
      focus: window.__scene?.uniforms.uFocus.value ?? -1,
      active: window.__scene?.uniforms.uActive.value ?? -2,
      expected: ['projects', 'experience', 'skills', 'about', 'contact'].indexOf(sectionId),
    }), s)
    if (mfx.active !== mfx.expected) fail(`section ${s}: uActive=${mfx.active}, expected ${mfx.expected}`)
    if (!(mfx.focus > 0.4)) fail(`section ${s}: uFocus=${mfx.focus}, expected >0.4`)
    await page.click('[data-testid="overlay-back"]')
    await page.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: 30000 })
  }
}

// Escape key path
await idle()
await page.click('[data-section="projects"]', { force: true })
await page.waitForSelector('[data-testid="overlay-title"]', { timeout: 30000 })
await page.keyboard.press('Escape')
await page.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: 30000 })
await idle()
console.log('ok: escape returns home')

await browser.close()

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`)
  process.exit(1)
}
console.log('\nSMOKE PASS')
