# 06. Verify it, and prove it is fast

A screenshot cannot tell a snap from a transition, or a 60fps scroll from a 20fps one.
These Playwright scripts can. Run them against the dev server or `vite preview`.

## Setup

```js
import { chromium } from 'playwright'
const browser = await chromium.launch()
const desktop = { viewport: { width: 1440, height: 900 } }
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const page = await (await browser.newContext(desktop)).newPage()
await page.goto(URL, { waitUntil: 'load' })
await page.waitForSelector('[data-ready]')      // whatever marks "intro finished"
```

Scroll in steps, not one jump, so scroll handlers and observers see the path:

```js
async function scrollToY(y) {
  const from = await page.evaluate(() => scrollY)
  for (let k = 1; k <= 12; k++) { await page.evaluate((v) => scrollTo(0, v), from + ((y - from) * k) / 12); await page.waitForTimeout(40) }
  await page.waitForTimeout(1300)   // reveals are ~1s; headless software GL is slow
}
```

## 1. No horizontal overflow (both sizes)

```js
const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
if (over > 0) throw new Error(`${over}px horizontal overflow`)
```

## 2. Shared section edges

```js
const edges = await page.evaluate(() => [...document.querySelectorAll('.spine-inner')].map((e) => {
  const r = e.getBoundingClientRect(); return `${Math.round(r.left)}..${Math.round(r.right)}` }))
if (new Set(edges).size !== 1) throw new Error(`sections disagree: ${edges.join(' ')}`)
```

## 3. Fitted titles fill but never overhang

```js
const bad = await page.evaluate(() => [...document.querySelectorAll('[data-fit]')].filter((el) => {
  const w = el.getBoundingClientRect().width, p = el.parentElement.clientWidth
  return w > p + 1 || w < p * 0.975 }).map((el) => el.textContent))
```

## 4. Progressive enhancement

```js
await page.evaluate(() => document.documentElement.classList.remove('reveal-armed'))
const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], .title__line')]
  .filter((e) => Number(getComputedStyle(e).opacity) < 0.99).length)
if (hidden) throw new Error(`${hidden} elements stay hidden without the script`)
```

## 5. Timeline: comet on centre, lit line on comet, lanes alternate

```js
const firstBeat = await page.evaluate(() => {
  const r = document.querySelector('[data-beat="0"]').getBoundingClientRect()
  return r.top + scrollY + r.height / 2 - innerHeight / 2
})
const pitch = await page.evaluate(() => document.querySelector('[data-beat="1"]').getBoundingClientRect().top
  - document.querySelector('[data-beat="0"]').getBoundingClientRect().top)
for (const b of [1, 1.5, 4]) {
  await scrollToY(firstBeat + b * pitch)
  const s = await page.evaluate(() => {
    const c = document.querySelector('.tl-line__comet').getBoundingClientRect()
    return { comet: c.top + c.height / 2, lit: document.querySelector('.tl-line__clip').getBoundingClientRect().bottom, mid: innerHeight / 2 }
  })
  if (Math.abs(s.comet - s.mid) > 2) throw new Error('comet off centre')
  if (Math.abs(s.lit - s.comet) > 4) throw new Error('lit line off the comet')
}
const sides = await page.evaluate(() => [0, 3, 6].map((i) => document.querySelector(`[data-beat="${i}"]`).dataset.side))
if (sides.join() !== 'left,right,left') throw new Error('lanes do not alternate')
```

## 6. Hero zoom: no veil left before it fades

Paint the veil solid white, hide everything else, and count white pixels while
scrolling the real exit. Run at 390x844, 1440x900 and 2560x1440.

```js
await page.addStyleTag({ content: '.scene,.ui,.hero-mark__sub{visibility:hidden!important} .hero-mark__veil{fill:#fff!important;opacity:1!important;animation:none!important} .hairline{stroke:#f00!important} body{background:#000!important}' })
for (const p of [0.6, 0.7, 0.75, 0.8, 0.84]) {
  await page.evaluate((p) => scrollTo(0, innerHeight * p), p)
  await page.waitForTimeout(900)
  const b64 = (await page.screenshot({ scale: 'css' })).toString('base64')
  const veil = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height   // keep the aspect ratio
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let w = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 128) w++
    return w / (d.length / 4)
  }, b64)
  console.log(`p ${p}: veil covers ${(veil * 100).toFixed(1)}%`)
}
// Required: 0.0% by p = VEIL_HOLD (0.84) at every size.
```

When a number is not zero, find where the white is (per-column counts) before
changing constants: a strip at one edge is an off-centre stem; the whole frame white
near the end is the mask size limit.

## 7. A transition really animates

```js
row.classList.add('is-open')
const a = el.getAnimations()[0]            // missing = it snaps
a.currentTime = a.effect.getTiming().duration / 2
getComputedStyle(el).backgroundSize         // the real interpolated midpoint
```

## 8. Frame time, as an A/B, under CPU throttling

Headless Chromium rasterises on the CPU, so absolute numbers are pessimistic even
unthrottled. Compare against the previous build instead of gating on 60fps.

```js
const cdp = await context.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
const r = await page.evaluate(async () => {
  const deltas = []
  const end = document.querySelector('.tl').getBoundingClientRect().bottom + scrollY - innerHeight
  let last = performance.now()
  await new Promise((done) => {
    const step = (t) => { deltas.push(t - last); last = t; if (scrollY >= end) return done(); scrollBy(0, 24); requestAnimationFrame(step) }
    requestAnimationFrame(step)
  })
  deltas.shift()
  const s = [...deltas].sort((a, b) => a - b)
  return { p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], over33: deltas.filter((d) => d > 33.4).length / deltas.length }
})
```

Build the previous commit in a scratch `git worktree`, serve both with
`vite preview` on two ports, and run this twice per build, per device. The new build
must be equal or better.

## Performance rules, one list

- Per-frame writes: `transform`, `opacity` only. Colour changes via a registered
  custom property transition, at discrete moments.
- `will-change` on at most a handful of elements at a time.
- No `backdrop-filter`, no animated `box-shadow`, no per-frame `filter` on phones.
- Glows are gradients or a wide low-opacity stroke, never `filter: drop-shadow`.
- Images: `width`/`height`, `decoding="async"`, load only what the next few seconds need.
- WebGL: pause the render loop (`frameloop="never"` or stop rAF) when covered, and
  unmount it after ~2s covered. Never run a canvas behind opaque sections.
- Marquees are CSS keyframes on one track element.
- Scroll handlers are passive, rAF-throttled, and idle when their element is off screen.
