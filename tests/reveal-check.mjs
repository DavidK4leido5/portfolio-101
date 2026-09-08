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

/* —— Image wipes ——
 *
 * The image variant is a clip wipe rather than a fade, so that it leaves the
 * resting opacity the screenshots on this page are set at alone — a reveal that
 * animated opacity would have to override that value and then hand it back.
 * Checked as "not 1 and all the same" rather than against a number, since the
 * resting value is a design choice and one of these has moved before.
 *
 * Scrolled to the first screenshot's own position rather than to an offset into
 * its section: the section opens with an index, a display title and a lede, so
 * a fixed offset from the top lands well short of any card.
 */
const shotTop = await page.evaluate(() => {
  const el = document.querySelector('.card__shot[data-wipe]')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return Math.round(r.top + window.scrollY + r.height / 2 - window.innerHeight / 2)
})
if (shotTop == null) fail('no experience screenshots tagged for the wipe')
else {
  await goTo(shotTop)
  await page
    .waitForFunction(
      () => document.querySelectorAll('.card__shot[data-wipe].is-in').length > 0,
      { timeout: SETTLE },
    )
    .catch(() => {})
  const wipes = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.card__shot[data-wipe]')]
    const seen = els.filter((e) => e.classList.contains('is-in'))
    return {
      total: els.length,
      shown: seen.length,
      clips: seen.map((e) => getComputedStyle(e).clipPath),
      opacities: seen.map((e) => Number(getComputedStyle(e).opacity)),
    }
  })
  if (wipes.total === 0) fail('the experience screenshots are not tagged for the wipe')
  else if (wipes.shown === 0) fail(`image wipes never fired (${wipes.total} tagged)`)
  else if (wipes.clips.some((c) => c.includes('100%'))) {
    fail(`an image wipe stayed clipped shut: ${JSON.stringify(wipes.clips)}`)
  } else if (wipes.opacities.some((o) => o > 0.999 || o < 0.05)) {
    fail(`the wipe drove a screenshot's opacity: ${JSON.stringify(wipes.opacities)}`)
  } else if (new Set(wipes.opacities).size !== 1) {
    fail(`screenshots left at different opacities: ${JSON.stringify(wipes.opacities)}`)
  } else {
    console.log(
      `ok: ${wipes.shown}/${wipes.total} image wipes opened, resting opacity intact (${wipes.opacities[0]})`,
    )
  }
}

/* —— Stagger containers hand out increasing delays —— */
const stagger = await page.evaluate(() => {
  const group = document.querySelector('[data-reveal-stagger]')
  if (!group) return null
  const items = [...group.querySelectorAll('[data-reveal],[data-wipe]')]
  return items.map((e) => parseFloat(e.style.getPropertyValue('--reveal-delay')) || 0)
})
if (!stagger) fail('no [data-reveal-stagger] container found')
else if (stagger.length < 2) fail('stagger container has nothing to cascade')
else if (!(stagger[stagger.length - 1] > stagger[0])) {
  fail(`stagger delays did not increase: ${JSON.stringify(stagger)}`)
} else console.log(`ok: stagger delays cascade (${stagger[0]}s -> ${stagger[stagger.length - 1]}s)`)

/*
 * —— Progressive enhancement ——
 *
 * The copy is in the markup, so the hidden state must be the thing that needs
 * the script, not the visible one. Dropping the class observeReveal adds stands
 * in for the script never having arrived: everything it was hiding has to read
 * as ordinary content, including the section titles, which are the largest text
 * on the page and hide themselves with their own transform.
 */
const wasArmed = await page.evaluate(() => {
  const html = document.documentElement
  const armed = html.classList.contains('reveal-armed')
  // Mark what is still waiting before unarming, so the read below can tell the
  // difference between "the unarmed state is visible" and "it had already run"
  for (const el of document.querySelectorAll('[data-reveal],[data-wipe]')) {
    if (!el.classList.contains('is-in')) el.setAttribute('data-pending', '')
  }
  html.classList.remove('reveal-armed')
  return armed
})
/*
 * Long enough for the section titles' 1.25s transition to settle. Unarming
 * takes them from under their mask back to nothing, and reading that in flight
 * reports a position they are only passing through.
 */
await page.waitForTimeout(2200)
const bare = await page.evaluate(() => ({
  reveals: [...document.querySelectorAll('[data-reveal][data-pending]')].map((e) => ({
    opacity: Number(getComputedStyle(e).opacity),
    transform: getComputedStyle(e).transform,
  })),
  wipes: [...document.querySelectorAll('[data-wipe][data-pending]')].map(
    (e) => getComputedStyle(e).clipPath,
  ),
  titles: [...document.querySelectorAll('.spine-title__line')].map(
    (e) => getComputedStyle(e).transform,
  ),
}))
bare.armed = wasArmed
bare.pending = bare.reveals.length
await page.evaluate((armed) => {
  for (const el of document.querySelectorAll('[data-pending]')) {
    el.removeAttribute('data-pending')
  }
  document.documentElement.classList.toggle('reveal-armed', armed)
}, wasArmed)
/**
 * Undisplaced, rather than exactly identity. A settled transition leaves a
 * sub-pixel residue in the matrix — visually flat, and failing on it would be
 * testing the easing curve's last frame rather than the layout.
 */
const flat = (t) => {
  if (t === 'none') return true
  const n = t.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number)
  if (!n || n.length !== 6 || n.some(Number.isNaN)) return false
  const [a, b, c, d, e, f] = n
  const scaled = Math.abs(a - 1) > 0.01 || Math.abs(d - 1) > 0.01
  const skewed = Math.abs(b) > 0.01 || Math.abs(c) > 0.01
  const moved = Math.abs(e) > 2 || Math.abs(f) > 2
  return !scaled && !skewed && !moved
}
if (!bare.armed) fail('observeReveal never armed the hidden state')
else if (bare.pending === 0) {
  fail('every reveal had already fired, so this proves nothing about the unarmed state')
} else if (bare.reveals.some((r) => r.opacity < 0.9)) {
  fail(`unarmed reveals are still transparent: ${JSON.stringify(bare.reveals.slice(0, 3))}`)
} else if (bare.reveals.some((r) => !flat(r.transform))) {
  fail(`unarmed reveals are still displaced: ${JSON.stringify(bare.reveals.slice(0, 3))}`)
} else if (bare.wipes.some((c) => c !== 'none')) {
  fail(`unarmed image wipes are still clipped: ${JSON.stringify(bare.wipes)}`)
} else if (bare.titles.some((t) => !flat(t))) {
  fail(`unarmed section titles are still under their mask: ${JSON.stringify(bare.titles)}`)
} else {
  console.log(
    `ok: unarmed page reads as plain content (${bare.pending} pending reveals, ${bare.titles.length} titles)`,
  )
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
