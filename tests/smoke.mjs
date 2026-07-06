import { chromium } from 'playwright'

const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const SECTIONS = ['projects', 'experience', 'skills', 'about', 'contact']
const LOOPS = Number(process.env.SMOKE_LOOPS ?? 2)
const CI = !!process.env.CI
// Headless software GL on GitHub runners is much slower than local dev
const T = {
  ready: CI ? 120_000 : 60_000,
  idle: CI ? 60_000 : 30_000,
  overlay: CI ? 120_000 : 90_000,
  mobileOverlay: CI ? 90_000 : 30_000,
  return: CI ? 120_000 : 90_000,
}

const errors = []
const fail = (msg) => { errors.push(msg); console.error('FAIL:', msg) }

const browser = await chromium.launch({ args: CI ? ['--disable-dev-shm-usage'] : [] })

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

await desktop.waitForSelector('[data-testid="sector-indicators"][data-sectors-ready="true"]', { timeout: T.ready })
await desktop.waitForTimeout(700)
// Container stays pointer-events:none by design; verify visibility + that a
// sector button actually receives pointer hits
const sectorState = await desktop.evaluate(() => {
  const wrap = document.querySelector('[data-testid="sector-indicators"]')
  const btn = document.querySelector('[data-section="projects"]')
  const s = getComputedStyle(wrap)
  const r = btn.getBoundingClientRect()
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return { opacity: Number(s.opacity), visibility: s.visibility, hit: btn.contains(el) }
})
if (sectorState.opacity < 0.9 || sectorState.visibility !== 'visible' || !sectorState.hit) {
  fail(`desktop ready: sectors not interactive ${JSON.stringify(sectorState)}`)
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
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: T.idle })

// Uniform assertions need VITE_SMOKE build (preview) or dev server — not production deploy
const sceneOk = await desktop.evaluate(() => !!window.__scene?.uniforms)
if (!sceneOk) fail('desktop: window.__scene missing — build with VITE_SMOKE=true for preview tests')
else console.log('ok: __scene exposed for smoke assertions')

// Density slider must be clickable (not covered by the indicators layer) in idle
const sliderHit = () => desktop.evaluate(() => {
  const s = document.querySelector('[data-testid="node-slider"]')
  if (!s) return 'missing'
  const r = s.getBoundingClientRect()
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return el === s ? 'ok' : `blocked by ${el?.className || el?.tagName}`
})
let hit = await sliderHit()
if (hit !== 'ok') fail(`idle: slider not interactive (${hit})`)
else console.log('ok: slider interactive while idle')

// Hover fires a sector shockwave (uWaveSection set, uWaveT animating from 0)
await desktop.hover('[data-section="skills"]', { force: true })
await desktop.waitForTimeout(300)
const wave = await desktop.evaluate(() => ({
  section: window.__scene?.uniforms.uWaveSection.value ?? -2,
  t: window.__scene?.uniforms.uWaveT.value ?? -1,
}))
if (wave.section !== 2) fail(`hover wave: uWaveSection=${wave.section}, expected 2 (skills)`)
else if (!(wave.t > 0 && wave.t < 1)) fail(`hover wave: uWaveT=${wave.t}, expected animating in (0,1)`)
else console.log('ok: hover triggers sector shockwave')
await desktop.mouse.move(0, 0)
await desktop.waitForTimeout(200)

await desktop.click('[data-section="projects"]', { force: true })
await desktop.waitForSelector('[data-testid="overlay-title"]', { timeout: T.overlay })
hit = await sliderHit()
if (hit !== 'ok') fail(`arrived: slider not interactive (${hit})`)
else console.log('ok: slider interactive while arrived')
await desktop.waitForTimeout(2500)
let fx = await readFx()
if (!(fx.active === 0)) fail(`desktop arrived: uActive=${fx.active}, expected 0 (projects)`)
else console.log('ok: active lobe set on projects')
if (!(fx.focus > 0.5)) fail(`desktop arrived: uFocus=${fx.focus}, expected >0.5 after modal`)
else console.log('ok: lobe nodes highlighted after modal')
if (!(fx.dim > 0.4)) fail(`desktop arrived: uDim=${fx.dim}, expected >0.4`)
await desktop.keyboard.press('Escape')
await desktop.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: T.return })
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: T.return })
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
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: T.ready })
await page.waitForTimeout(500)

const idle = () => page.waitForSelector('.ui[data-phase="idle"]', { timeout: T.idle })

for (let loop = 1; loop <= LOOPS; loop++) {
  console.log(`--- loop ${loop}/${LOOPS} ---`)
  for (const s of SECTIONS) {
    await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: T.ready })
    await idle()
    await page.hover(`[data-section="${s}"]`, { force: true })
    await page.waitForTimeout(250)
    await page.click(`[data-section="${s}"]`, { force: true })
    await page.waitForSelector('[data-testid="overlay-title"]', { timeout: T.mobileOverlay })
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
    await page.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: T.mobileOverlay })
  }
}

// Escape key path
await idle()
await page.click('[data-section="projects"]', { force: true })
await page.waitForSelector('[data-testid="overlay-title"]', { timeout: T.mobileOverlay })
await page.keyboard.press('Escape')
await page.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: T.mobileOverlay })
await idle()
console.log('ok: escape returns home')

await browser.close()

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`)
  process.exit(1)
}
console.log('\nSMOKE PASS')
