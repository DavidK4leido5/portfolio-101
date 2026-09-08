/**
 * The scroll reveals must actually fire: one-shot reveals in the section spine,
 * the per-stage glide in the request trace, and the per-word stagger plus
 * masked heading in the projects walkthrough.
 *
 *   node tests/reveal-check.mjs
 */
import { loadChromium } from './playwright-env.mjs'

const chromium = await loadChromium()
const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const CI = !!process.env.CI
const READY = CI ? 120_000 : 60_000
const SETTLE = CI ? 30_000 : 15_000

const errors = []
const fail = (msg) => { errors.push(msg); console.error('FAIL:', msg) }

const browser = await chromium.launch({ args: CI ? ['--disable-dev-shm-usage'] : [] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: READY })
await page.waitForTimeout(1000)

// The reveal curves are ~1s plus up to 0.28s of stagger delay, and both the
// IntersectionObserver callback and the transition itself advance per frame.
// Headless software GL renders this page at a few frames a second, so a wait
// sized to the animation alone samples it before it has started.
const goTo = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y)
  await page.waitForTimeout(CI ? 5000 : 3000)
}
const topOf = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    return el ? el.getBoundingClientRect().top + window.scrollY : null
  }, sel)

// —— The request trace: the landed stage glides its rows in ——
const track = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="trace-track"]')
  return el ? { top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight } : null
})
if (!track) fail('trace track missing')
else {
  await goTo(track.top + (track.h - 900) * 0.2)
  const stage = await page.evaluate(() => {
    const beats = [...document.querySelectorAll('[data-trace-beat]')]
    const live = beats.find((b) => Number(getComputedStyle(b).opacity) > 0.9)
    if (!live) return { live: null }
    const rows = [...live.children].map((c) => Number(getComputedStyle(c).opacity))
    return {
      live: live.querySelector('.trace-beat__title')?.textContent?.trim(),
      isIn: live.classList.contains('is-in'),
      rows,
    }
  })
  if (!stage.live) fail('no trace stage reached full opacity at 20% of the track')
  else if (!stage.isIn) fail(`trace stage "${stage.live}" never got is-in`)
  else if (!stage.rows.every((o) => o > 0.9)) {
    fail(`trace stage rows did not glide in: ${JSON.stringify(stage.rows)}`)
  } else console.log(`ok: trace stage "${stage.live}" glided its rows in`)
}

// —— One-shot reveals in the section spine ——
const aboutTop = await topOf('#section-about')
if (aboutTop == null) fail('about section missing')
else {
  // Far enough in that the header sits mid-viewport. Landing exactly on the
  // section top puts it just above the fold, where nothing has intersected.
  await goTo(aboutTop - 200)
  // The transitions run in real time but the page only paints a couple of
  // frames a second under software GL, so poll for the arrival instead of
  // sampling once after a fixed wait
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('#section-about [data-reveal]')].some(
          (e) => Number(getComputedStyle(e).opacity) > 0.9,
        ),
      { timeout: SETTLE },
    )
    .catch(() => {})
  const state = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#section-about [data-reveal]')]
    return {
      total: els.length,
      shown: els.filter((e) => e.classList.contains('is-in')).length,
      opacity: els.map((e) => Number(getComputedStyle(e).opacity)),
      scrollY: Math.round(window.scrollY),
    }
  })
  if (state.total === 0) fail('no [data-reveal] elements in the about section')
  else if (state.shown === 0) fail(`about reveals never fired (${state.total} tagged, 0 in)`)
  else if (!state.opacity.some((o) => o > 0.9)) {
    fail(`about reveals stuck invisible: ${JSON.stringify(state)}`)
  } else console.log(`ok: ${state.shown}/${state.total} about-section reveals fired`)
}

// —— Projects walkthrough: word stagger and masked heading ——
/*
 * Scroll off the beats' own centres rather than the walkthrough's top. The
 * walkthrough sits nested inside the projects section now, so its top is no
 * longer one viewport above the first beat's centre, and ProjectJourney drives
 * everything from `scrollY + vh/2` against those centres.
 */
const beatCentres = await page.evaluate(() =>
  [...document.querySelectorAll('[data-beat]')].map((el) => {
    const r = el.getBoundingClientRect()
    return Math.round(r.top + window.scrollY + r.height / 2 - window.innerHeight / 2)
  }))

if (beatCentres.length === 0) fail('projects walkthrough missing')
else {
  // Centre of the first beat: heading settled, words resolving front to back
  await goTo(beatCentres[0])
  const settled = await page.evaluate(() => {
    const beat = document.querySelector('[data-beat="0"]')
    if (!beat) return { count: 0 }
    const words = [...beat.querySelectorAll('.word')].map((w) => Number(getComputedStyle(w).opacity))
    const mask = beat.querySelector('.mask-line')
    return {
      first: words[0],
      last: words[words.length - 1],
      count: words.length,
      mask: getComputedStyle(mask).transform,
    }
  })
  if (settled.count < 5) fail(`expected the beat body to be split into words, got ${settled.count}`)
  else if (!(settled.first > 0.95)) fail(`first word not resolved: ${settled.first}`)
  else if (!(settled.last < settled.first)) {
    fail(`no word stagger: first ${settled.first}, last ${settled.last}`)
  } else if (settled.mask !== 'none' && settled.mask !== 'matrix(1, 0, 0, 1, 0, 0)') {
    fail(`masked heading not settled at the beat centre: ${settled.mask}`)
  } else console.log(`ok: word stagger live (${settled.first.toFixed(2)} → ${settled.last.toFixed(2)}) and heading settled`)

  // Mid-handover: the outgoing project's last card holds while the next wipes in.
  // Three beats per project, so halfway between beat 2 and beat 3 is the seam.
  await goTo(Math.round((beatCentres[2] + beatCentres[3]) / 2))
  const handover = await page.evaluate(() =>
    [...document.querySelectorAll('.project-journey__card')]
      .map((c) => ({ story: Number(c.dataset.story), o: Number(getComputedStyle(c).opacity) }))
      .filter((c) => c.o > 0.05))
  if (handover.length === 0) fail('deck went empty during the project handover')
  else console.log(`ok: deck covered during handover (${handover.length} card(s) visible)`)

  // Browser chrome present on every card
  const chrome = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.project-journey__card')]
    return {
      cards: cards.length,
      withBar: cards.filter((c) => c.querySelector('.project-journey__bar')).length,
      url: document.querySelector('.project-journey__url')?.textContent?.trim() ?? '',
    }
  })
  if (chrome.cards === 0) fail('no project cards mounted')
  else if (chrome.withBar !== chrome.cards) {
    fail(`${chrome.cards - chrome.withBar} card(s) missing browser chrome`)
  } else console.log(`ok: browser chrome on all ${chrome.cards} cards (e.g. "${chrome.url}")`)
}

await browser.close()

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`)
  process.exit(1)
}
console.log('\nREVEAL PASS')
