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

// Desktop tier: load + render + no errors (headless software GL is too slow for full desktop navigation)
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
watch(desktop)
await desktop.goto(URL, { waitUntil: 'domcontentloaded' })
await desktop.waitForSelector('canvas', { timeout: 15000 })
await desktop.waitForTimeout(3000)
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

// One desktop navigation: constellation reveal + DoF must engage on arrival
const readFx = () => desktop.evaluate(() => ({
  constel: window.__scene?.uniforms.uConstel.value ?? -1,
  bokeh: window.__scene?.dofState.bokeh ?? -1,
}))
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: 30000 })
await desktop.click('[data-section="projects"]', { force: true })
await desktop.waitForSelector('[data-testid="overlay-title"]', { timeout: 90000 })
await desktop.waitForTimeout(300)
let fx = await readFx()
if (!(fx.constel > 0.95)) fail(`desktop arrived: uConstel=${fx.constel}, expected >0.95`)
else console.log('ok: constellation revealed on arrival')
if (!(fx.bokeh > 0.5)) fail(`desktop arrived: dof bokeh=${fx.bokeh}, expected >0.5`)
else console.log('ok: DoF engaged on arrival')
await desktop.keyboard.press('Escape')
await desktop.waitForSelector('[data-testid="overlay-title"]', { state: 'detached', timeout: 90000 })
await desktop.waitForSelector('.ui[data-phase="idle"]', { timeout: 90000 })
fx = await readFx()
if (!(fx.constel < 0.05)) fail(`desktop returned: uConstel=${fx.constel}, expected <0.05`)
if (!(fx.bokeh < 0.05)) fail(`desktop returned: dof bokeh=${fx.bokeh}, expected <0.05`)
if (fx.constel < 0.05 && fx.bokeh < 0.05) console.log('ok: constellation + DoF dissolved on return')
await desktop.close()

// Mobile tier: full navigation loop (light enough for software GL to animate in real time)
const page = await browser.newPage({ viewport: { width: 720, height: 540 } })
watch(page)
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForTimeout(1500)

const idle = () => page.waitForSelector('.ui[data-phase="idle"]', { timeout: 30000 })

for (let loop = 1; loop <= LOOPS; loop++) {
  console.log(`--- loop ${loop}/${LOOPS} ---`)
  for (const s of SECTIONS) {
    await idle()
    await page.hover(`[data-section="${s}"]`, { force: true })
    await page.waitForTimeout(250)
    await page.click(`[data-section="${s}"]`, { force: true })
    await page.waitForSelector('[data-testid="overlay-title"]', { timeout: 30000 })
    const title = (await page.textContent('[data-testid="overlay-title"]'))?.trim().toLowerCase()
    if (title !== s) fail(`section ${s}: overlay title was "${title}"`)
    else console.log(`ok: ${s} overlay shown`)
    await page.waitForTimeout(200)
    const mfx = await page.evaluate(() => ({
      constel: window.__scene?.uniforms.uConstel.value ?? -1,
      bokeh: window.__scene?.dofState.bokeh ?? -1,
    }))
    if (!(mfx.constel > 0.95)) fail(`section ${s}: uConstel=${mfx.constel}, expected >0.95`)
    if (mfx.bokeh !== 0) fail(`section ${s}: mobile tier dof bokeh=${mfx.bokeh}, expected 0`)
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
