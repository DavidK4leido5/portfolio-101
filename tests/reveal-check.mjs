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

const readWords = (beat) => page.evaluate((b) => {
  const el = document.querySelector(`[data-beat="${b}"]`)
  if (!el) return { count: 0 }
  const words = [...el.querySelectorAll('.word')].map((w) => Number(getComputedStyle(w).opacity))
  const mask = el.querySelector('.mask-line')
  return {
    first: words[0],
    last: words[words.length - 1],
    min: Math.min(...words),
    count: words.length,
    mask: mask ? getComputedStyle(mask).transform : 'none',
  }
}, beat)

/*
 * Not beat 0: ProjectJourney clamps its position to >= 0 so the first beat is
 * already settled when you arrive rather than sitting dim, which means it can
 * never show an approach. Beat 6 opens the third project, so it has the masked
 * heading as well as the word body.
 */
const PROBE_BEAT = 6

if (beatCentres.length <= PROBE_BEAT) fail('projects walkthrough missing beats')
else {
  /*
   * The stagger belongs to the beat's approach, and every word has to be fully
   * resolved by the time the beat is centred. It used to run so that the tail
   * of a long paragraph never got past about 0.7 even at the centre, so the
   * copy sat permanently half-loaded — which is why this checks the two
   * positions separately rather than looking for a gradient at the centre.
   */
  /*
   * Scan the approach rather than trusting one magic offset: where the spread
   * is widest depends on the beat's pitch and on the row's own place in the
   * stagger, and the window has moved before.
   */
  let widest = { spread: -1 }
  for (const back of [560, 460, 380, 300, 220]) {
    await goTo(beatCentres[PROBE_BEAT] - back)
    const at = await readWords(PROBE_BEAT)
    const spread = (at.first ?? 0) - (at.last ?? 0)
    if (spread > widest.spread) widest = { ...at, back, spread }
  }
  if (!widest.count || widest.count < 5) {
    fail(`expected the beat body to be split into words, got ${widest.count}`)
  } else if (!(widest.spread > 0.05)) {
    fail(`no word stagger anywhere on the approach (widest spread ${widest.spread.toFixed(2)})`)
  } else {
    console.log(`ok: words stagger on approach (${widest.first.toFixed(2)} → ${widest.last.toFixed(2)} at ${widest.back}px out)`)
  }

  await goTo(beatCentres[PROBE_BEAT])
  const settled = await readWords(PROBE_BEAT)
  if (!(settled.min > 0.95)) {
    fail(`beat not fully resolved at its centre: dimmest word ${settled.min}`)
  } else if (settled.mask !== 'none' && settled.mask !== 'matrix(1, 0, 0, 1, 0, 0)') {
    fail(`masked heading not settled at the beat centre: ${settled.mask}`)
  } else console.log('ok: every word and the heading are fully resolved at the beat centre')

  /*
   * The copy must never reverse direction. The reveal offsets used to be driven
   * off the unsigned distance to the beat's centre, so every word and row that
   * had just risen into place turned round and sank again the moment the beat
   * passed centre — read as the whole column juddering rather than scrolling.
   * Past the centre the offsets have to stay put and only fade.
   */
  const readY = () => page.evaluate((b) => {
    const el = document.querySelector(`[data-beat="${b}"]`)
    const y = (node) => {
      const t = getComputedStyle(node).transform
      return t === 'none' ? 0 : new DOMMatrixReadOnly(t).m42
    }
    const words = [...el.querySelectorAll('.word')]
    return {
      // Worst offender, so one stubborn word cannot hide behind an average
      maxWord: Math.max(...words.map(y)),
      rows: [...el.querySelectorAll('[data-row]')].map(y),
    }
  }, PROBE_BEAT)

  const samples = []
  for (const off of [-320, -140, 0, 140, 320, 520]) {
    await goTo(beatCentres[PROBE_BEAT] + off)
    samples.push({ off, ...(await readY()) })
  }
  const past = samples.filter((s) => s.off >= 0)
  const roseAgain = past.find((s) => s.maxWord > 1 || s.rows.some((v) => v > 1))
  const approached = samples.find((s) => s.off < 0 && s.maxWord > 1)
  if (!approached) {
    fail('no word offset anywhere on the approach, so the reversal check proves nothing')
  } else if (roseAgain) {
    fail(
      `copy re-offsets after the beat centre (${roseAgain.off}px past: ` +
        `word ${roseAgain.maxWord.toFixed(1)}px, rows ${JSON.stringify(
          roseAgain.rows.map((v) => Math.round(v)),
        )})`,
    )
  } else {
    console.log(
      `ok: copy rises in (${approached.maxWord.toFixed(1)}px at ${approached.off}px) and holds past centre`,
    )
  }

  /*
   * `will-change` on every one of the ~630 word spans put each on its own
   * compositor layer for the whole page, and the layer tree then had to be
   * rebuilt on every scroll frame. Only the beats actually animating should
   * carry the hint.
   */
  await goTo(beatCentres[PROBE_BEAT])
  const hinted = await page.evaluate(() => {
    const words = [...document.querySelectorAll('.project-beat .word')]
    return {
      total: words.length,
      hinted: words.filter((w) => getComputedStyle(w).willChange !== 'auto').length,
      nearBeats: document.querySelectorAll('.project-beat.is-near').length,
      beats: document.querySelectorAll('.project-beat').length,
    }
  })
  if (hinted.nearBeats === 0) fail('no beat got is-near, so nothing is hinted to the compositor')
  else if (hinted.hinted === 0) fail('the animating beat got no will-change hint')
  else if (hinted.hinted > hinted.total * 0.5) {
    fail(`will-change left on ${hinted.hinted}/${hinted.total} words — the hint is not gated`)
  } else {
    console.log(
      `ok: will-change limited to ${hinted.nearBeats}/${hinted.beats} beats (${hinted.hinted}/${hinted.total} words)`,
    )
  }

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
