# 04. The cinematic scroll timeline

A journey from project to project. Three beats per project (intro, tech, build),
each one viewport tall, so scroll length comes from real content (good for SEO and
for scroll restoration). Behind the copy, a sticky full-viewport stage holds:

- a line down the center that is lit up to the viewport center, with a comet on its
  tip and a node per project,
- a giant outlined project number that rolls at each handover,
- two CSS 3D screenshot decks, one per lane. Even projects put copy left and deck
  right; odd projects swap, so the decks cross at each handover,
- a glow in the current project's accent, which crossfades at each handover.

Desktop (above 900px) uses three columns: `[lane] [spine] [lane]`. Mobile uses one
lane, puts the line in the left gutter, and pins the deck in a 44dvh band at the top.

## Performance contract

- One rAF-throttled scroll listener. It returns immediately while an
  IntersectionObserver says the timeline is off screen.
- Per frame it writes only: `transform` on the comet and on two line wrappers,
  `opacity` and `transform` on rows and words of beats within 1.4 beats of the
  center, and `transform`/`opacity` on the current project's cards.
- Layout is read in `measure()` only, on resize and on body `ResizeObserver`.
- The line scrolls with the page natively (it spans the full timeline height), so
  moving it costs nothing. Only its lit half is written per frame.
- `will-change` goes on at most ~3 beats at a time (`is-near`), never on every word.
- `filter: blur()` on cards only on desktop. On phones fold the dimming into opacity.
- No `content-visibility` here: the engine measures document offsets.
- Beats far from the center get one final write at their clamped values, then are
  skipped until they come back. One write, not zero: a fast fling can jump a beat
  from mid-fade to far away.

## Data

```ts
type Beat = { id: 'intro' | 'tech' | 'build'; label: string; body: string }
type Story = {
  id: string; title: string; role: string; period: string   // "Mar 2025 - Aug 2026"
  domain?: string; accent: string; stack: string[]
  beats: Beat[]                                             // exactly three
  shots: { src: string }[]                                  // screenshots, in order
}
```

## Markup

Render this on the server (or at build time) so the copy is in the HTML. Words are
split into spans for the per-word resolve, **without** a duplicate `sr-only` copy.

```html
<div class="tl" style="--project-accent:#e8b86b">
  <div class="tl-line" aria-hidden="true">
    <svg class="tl-line__base"><path/></svg>
    <div class="tl-line__clip"><div class="tl-line__clip-inner">
      <svg><path class="tl-line__glow"/><path/></svg>
    </div></div>
    <!-- one per story -->
    <span class="tl-line__node" data-node="0" style="color:#e8b86b"><span class="tl-line__label">Aug 2026</span></span>
    <span class="tl-line__comet"></span>
  </div>

  <div class="tl-grid">
    <div class="tl-stage">
      <div class="tl-numeral" aria-hidden="true"><span class="is-active">01</span><span>02</span></div>
      <div class="tl-deck tl-deck--left"><!-- cards of odd stories --></div>
      <div class="tl-deck tl-deck--right">
        <!-- cards of even stories -->
        <figure class="tl-card" data-story="0" data-shot="0">
          <span class="tl-card__bar" aria-hidden="true"><i></i><i></i><i></i><span class="tl-card__url">example.com</span></span>
          <span class="tl-card__screen"><img data-src="shot.webp" alt="Project screenshot 1" width="1024" height="504" decoding="async"></span>
        </figure>
      </div>
      <div class="tl-hud" aria-hidden="true">
        <div class="tl-caption"><span class="tl-caption__name">Project</span><span class="tl-counter"></span></div>
        <div class="tl-rail"><span class="tl-tick is-active"></span><span class="tl-tick"></span></div>
      </div>
    </div>

    <div class="tl-copy">
      <article class="tl-chapter" id="project-palace" aria-labelledby="project-palace-title">
        <div class="tl-beat" data-beat="0" data-side="left">
          <div class="tl-beat__inner">
            <header>
              <span class="tl-beat__num" data-row>01</span>
              <h3 class="tl-beat__title" id="project-palace-title" data-row><span class="mask-line">The Palace Manila</span></h3>
              <p class="tl-beat__role label" data-row>Full Stack Engineer · Aug 2026 - Present</p>
            </header>
            <p class="tl-beat__label" data-row>Project intro</p>
            <p class="tl-beat__body" data-row><span class="word">The</span> <span class="word">Palace</span> ...</p>
          </div>
        </div>
        <!-- beats 1 and 2: label + body; the tech beat adds a <ul data-row> of the stack,
             the build beat adds <a data-row href> to the live site -->
      </article>
    </div>
  </div>
</div>
```

Card image `src` is set by the engine only for the active story and its neighbours
(`data-src` otherwise), so 30+ screenshots do not load at once.

## CSS

```css
@property --project-accent { syntax: '<color>'; inherits: true; initial-value: #8b5cf6; }

.tl {
  --lane-gap: clamp(96px, 10vw, 160px);
  --tl-pad: clamp(20px, 5vw, 64px);
  position: relative;
  background: #05050a;
  overflow: clip;                                   /* not hidden: keeps sticky working */
  transition: --project-accent 0.9s var(--ease-soft);  /* every derived colour crossfades */
}

/* The line */
.tl-line { position: absolute; top: 0; bottom: 0; left: 50%; z-index: 2;
  width: var(--lane-gap); margin-left: calc(var(--lane-gap) / -2);
  pointer-events: none; color: var(--project-accent); }
.tl-line svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.tl-line path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tl-line__base path { stroke: rgba(255,255,255,.12); stroke-width: 1; stroke-dasharray: 2 7; }
.tl-line path.tl-line__glow { stroke-width: 12; opacity: .16; }   /* glow without a filter */
.tl-line__clip, .tl-line__clip-inner { position: absolute; inset: 0; will-change: transform; }
.tl-line__clip { overflow: hidden; }
.tl-line__comet { position: absolute; top: 0; left: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px;
  border-radius: 50%; background: #fff; will-change: transform;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 28%, transparent),
              0 0 28px 8px color-mix(in srgb, currentColor 55%, transparent); }
.tl-line__comet::before { content: ''; position: absolute; left: 50%; bottom: 50%; width: 2px; height: 140px;
  margin-left: -1px; background: linear-gradient(to top, currentColor, transparent); }
.tl-line__node { position: absolute; top: 0; left: 50%; width: 0; height: 0; }
.tl-line__node::before { content: ''; position: absolute; left: -7px; top: -7px; width: 14px; height: 14px;
  border-radius: 50%; border: 1px solid rgba(255,255,255,.28); background: #05050a;
  transition: background-color .5s, border-color .5s, transform .6s var(--ease-osmo); }
.tl-line__node.is-lit::before { background: currentColor; border-color: currentColor; transform: scale(1.4); }
.tl-line__label { position: absolute; bottom: 18px; left: 0; transform: translateX(-50%);
  font: 9.5px/1 ui-monospace, Consolas, monospace; letter-spacing: .2em; text-transform: uppercase;
  white-space: nowrap; color: rgba(235,235,255,.35); transition: color .5s; }
.tl-line__node.is-lit .tl-line__label { color: rgba(235,235,255,.85); }

/* The stage */
.tl-grid { position: relative; }
.tl-stage { position: sticky; top: 0; z-index: 1; height: 100vh; height: 100dvh;
  display: grid; grid-template-columns: minmax(0,1fr) var(--lane-gap) minmax(0,1fr);
  align-items: center; padding-inline: var(--tl-pad); contain: layout paint; }
/* The glow lives on the sticky stage so every project gets it, not just the first */
.tl-stage::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(70% 55% at 50% 0%, color-mix(in srgb, var(--project-accent) 11%, transparent), transparent 72%),
    radial-gradient(50% 45% at 50% 100%, color-mix(in srgb, var(--project-accent) 6%, transparent), transparent 70%); }

.tl-numeral { position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden; pointer-events: none; }
.tl-numeral span { grid-area: 1 / 1;
  font: 800 clamp(160px, 34vw, 560px)/.8 'Inter Tight', system-ui, sans-serif; letter-spacing: -.05em;
  color: transparent; -webkit-text-stroke: .006em var(--project-accent);
  opacity: 0; transform: translate3d(0, 70%, 0);
  transition: transform 1.1s var(--ease-osmo), opacity .9s var(--ease-soft); }
.tl-numeral span.is-active { opacity: .3; transform: none; }
.tl-numeral span.is-past { transform: translate3d(0, -70%, 0); }

.tl-deck { grid-row: 1; position: relative; width: 100%; aspect-ratio: 16/10; max-height: 64vh;
  perspective: 1500px; transform-style: preserve-3d; }
.tl-deck--left { grid-column: 1; perspective-origin: 38% 45%; }
.tl-deck--right { grid-column: 3; perspective-origin: 62% 45%; }
.tl-card { position: absolute; inset: 0; margin: 0; overflow: hidden; opacity: 0; background: #07070e;
  border: 1px solid rgba(255,255,255,.11); box-shadow: 0 40px 70px -30px rgba(0,0,0,.95);
  will-change: transform, opacity; backface-visibility: hidden; }
.tl-card__bar { position: absolute; inset: 0 0 auto 0; z-index: 2; height: 30px; display: flex; align-items: center;
  gap: 5px; padding-inline: 12px; background: rgba(16,16,24,.92); border-bottom: 1px solid rgba(255,255,255,.08); }
.tl-card__bar i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.18); }
.tl-card__url { margin-inline: auto; font: 8.5px ui-monospace, monospace; letter-spacing: .22em; text-transform: uppercase; color: rgba(235,235,255,.42); }
.tl-card__screen { position: absolute; inset: 30px 0 0 0; overflow: hidden; }
.tl-card img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; }

.tl-hud { position: absolute; left: var(--tl-pad); bottom: 5vh; width: min(340px, 28vw); display: grid; gap: 10px; }
.tl-caption { display: flex; justify-content: space-between; font: 10px ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; }
.tl-counter { color: var(--project-accent); }
.tl-rail { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.tl-tick { position: relative; height: 2px; background: rgba(255,255,255,.1); overflow: hidden; }
.tl-tick::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 0; background: var(--project-accent); }
.tl-tick.is-done::after { width: 100%; background: rgba(255,255,255,.28); }
.tl-tick.is-active::after { width: calc(var(--rail-q, 0) * 100%); }

/* The copy, pulled up over the stage so beat 0 is centred with it */
.tl-copy { position: relative; z-index: 3; margin-top: -100vh; margin-top: -100dvh; }
.tl-beat { min-height: 100vh; min-height: 100dvh; display: grid;
  grid-template-columns: minmax(0,1fr) var(--lane-gap) minmax(0,1fr); align-items: center; padding-inline: var(--tl-pad); }
.tl-beat__inner { max-width: 34rem; padding-block: 10vh; }
.tl-beat[data-side="left"] .tl-beat__inner { grid-column: 1; justify-self: end; }
.tl-beat[data-side="right"] .tl-beat__inner { grid-column: 3; justify-self: start; }
.reveal-armed .tl-beat [data-row] { opacity: 0; }          /* hidden only when JS is live */
.tl-beat.is-near [data-row], .tl-beat.is-near .word, .tl-beat.is-near .mask-line { will-change: opacity, transform; }
.tl-beat__num { display: block; font: 11px ui-monospace, monospace; letter-spacing: .3em; color: var(--project-accent); margin-bottom: 14px; }
.tl-beat__title { font: 800 clamp(2.4rem, 5vw, 4.6rem)/.92 'Inter Tight', system-ui, sans-serif; letter-spacing: -.035em;
  text-transform: uppercase; overflow: hidden; padding-bottom: .1em; margin: 0 0 calc(12px - .1em); }
.mask-line { display: inline-block; }
.tl-beat__label { font: 9.5px ui-monospace, monospace; letter-spacing: .32em; text-transform: uppercase;
  color: color-mix(in srgb, var(--project-accent) 80%, #fff); margin-bottom: 12px; }
.tl-beat__body { font-size: clamp(.98rem, 1.25vw, 1.12rem); line-height: 1.7; color: rgba(232,232,240,.7); }
.word { display: inline-block; }

@media (max-width: 900px) {
  .tl { --lane-gap: 40px; }
  .tl-line { left: 0; margin-left: 0; }
  .tl-line__label { display: none; }
  .tl-stage { display: block; z-index: 4; height: 44dvh; background: #05050a; box-shadow: 0 18px 24px -18px rgba(0,0,0,.9); }
  .tl-deck { position: absolute; inset: 10px var(--tl-pad) 44px; width: auto; aspect-ratio: auto; max-height: none; perspective: 1100px; }
  .tl-numeral span { font-size: 50vw; }
  .tl-numeral span.is-active { opacity: .25; }
  .tl-hud { left: var(--tl-pad); right: var(--tl-pad); bottom: 10px; width: auto; gap: 8px; }
  .tl-copy { margin-top: -44dvh; }
  .tl-beat { display: block; padding-inline: var(--lane-gap) var(--tl-pad); }
  .tl-beat__inner { padding-top: 47dvh; padding-bottom: 4vh; max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tl-beat [data-row], .tl-beat .word, .tl-beat .mask-line { opacity: 1; transform: none; }
  .tl-line__comet { display: none; }
  .tl-numeral span { transition: none; }
}
```

## The engine

```ts
const BEATS = 3
const NEAR = 1.4
const WORD_SPREAD = 0.34, WORD_FLOOR = 0.06
const SWING = 0.3, SWING_MAX = 56
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const settle = (t: number) => 1 - Math.pow(1 - t, 3)   // entrances decelerate into place
const pad = (n: number) => String(n).padStart(2, '0')

export function createTimeline(root: HTMLElement, stories: { accent: string; title: string; shots: unknown[] }[]) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const line = root.querySelector<HTMLElement>('.tl-line')!
  const svgs = [...line.querySelectorAll('svg')]
  const paths = [...line.querySelectorAll('path')]
  const clip = line.querySelector<HTMLElement>('.tl-line__clip')!
  const clipInner = line.querySelector<HTMLElement>('.tl-line__clip-inner')!
  const comet = line.querySelector<HTMLElement>('.tl-line__comet')!
  const nodes = [...line.querySelectorAll<HTMLElement>('[data-node]')]
  const numerals = [...root.querySelectorAll<HTMLElement>('.tl-numeral span')]
  const ticks = [...root.querySelectorAll<HTMLElement>('.tl-tick')]
  const rail = root.querySelector<HTMLElement>('.tl-rail')!
  const counter = root.querySelector<HTMLElement>('.tl-counter')!
  const caption = root.querySelector<HTMLElement>('.tl-caption__name')!
  const cards = [...root.querySelectorAll<HTMLElement>('[data-shot]')]
  const total = stories.length * BEATS
  const lit = nodes.map(() => false)

  let vh = innerHeight, first = 0, pitch = vh, top = 0, lw = 0, lh = 0, swing = 0
  let wide = true, blurOk = true, inView = true, active = -1
  type Row = { el: HTMLElement; words: HTMLElement[]; mask: HTMLElement | null }
  let beats: { el: HTMLElement; i: number; side: number; rows: Row[]; near: boolean; settled: boolean }[] = []

  /** Line x at a y in the line's own space; zero swing at every beat centre. */
  const xAt = (y: number) => lw / 2 + swing * Math.sin((Math.PI * (y - (first - top))) / pitch)
  const centre = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2 }

  function measure() {
    vh = innerHeight
    wide = matchMedia('(min-width: 901px)').matches
    blurOk = wide && matchMedia('(min-width: 1101px)').matches   // or your own quality tier
    const els = [...root.querySelectorAll<HTMLElement>('[data-beat]')]
    beats = els.map((el) => ({
      el, i: Number(el.dataset.beat),
      side: wide ? (el.dataset.side === 'left' ? -1 : 1) : 0,
      rows: [...el.querySelectorAll<HTMLElement>('[data-row]')].map((r) => ({
        el: r, words: [...r.querySelectorAll<HTMLElement>('.word')], mask: r.querySelector<HTMLElement>('.mask-line'),
      })),
      near: false, settled: false,
    }))
    if (!els.length) return
    first = centre(els[0])
    pitch = Math.max(1, els.length > 1 ? centre(els[1]) - first : els[0].offsetHeight)
    top = root.getBoundingClientRect().top + scrollY
    lw = line.offsetWidth; lh = line.offsetHeight
    swing = wide ? Math.min(lw * SWING, SWING_MAX) : 0
    const y0 = first - top, y1 = y0 + pitch * (total - 1)
    let d = `M${xAt(y0).toFixed(1)} ${y0.toFixed(1)}`
    for (let y = y0 + 12; y < y1; y += 12) d += `L${xAt(y).toFixed(1)} ${y.toFixed(1)}`
    d += `L${xAt(y1).toFixed(1)} ${y1.toFixed(1)}`
    for (const s of svgs) s.setAttribute('viewBox', `0 0 ${lw} ${lh}`)
    for (const p of paths) p.setAttribute('d', d)
    nodes.forEach((n, i) => { n.style.transform = `translate3d(0, ${(y0 + i * BEATS * pitch).toFixed(1)}px, 0)` })
  }

  function handover(si: number) {
    active = si
    root.style.setProperty('--project-accent', stories[si].accent)
    numerals.forEach((n, i) => { n.classList.toggle('is-active', i === si); n.classList.toggle('is-past', i < si) })
    ticks.forEach((t, i) => { t.classList.toggle('is-active', i === si); t.classList.toggle('is-done', i < si) })
    caption.textContent = stories[si].title
    // Load the current project's shots and its neighbours' only
    for (const c of cards) {
      const img = c.querySelector('img')
      if (img?.dataset.src && Math.abs(Number(c.dataset.story) - si) <= 1) { img.src = img.dataset.src; delete img.dataset.src }
    }
  }

  function apply() {
    const pos = Math.min(total - 1, Math.max(0, (scrollY + vh / 2 - first) / pitch))
    const si = Math.min(stories.length - 1, Math.floor(Math.round(pos) / BEATS))
    if (si !== active) handover(si)

    // Lit line: wrapper up, inner back down, so the lit copy ends exactly at the tip.
    // A dash offset drifts off the comet on a curve; a clip-path repaints every frame.
    const tip = first - top + (reduced ? total - 1 : pos) * pitch
    clip.style.transform = `translate3d(0, ${(tip - lh).toFixed(1)}px, 0)`
    clipInner.style.transform = `translate3d(0, ${(lh - tip).toFixed(1)}px, 0)`
    comet.style.transform = `translate3d(${xAt(tip).toFixed(1)}px, ${tip.toFixed(1)}px, 0)`
    nodes.forEach((n, i) => {
      const on = reduced || pos >= i * BEATS - 0.02
      if (on !== lit[i]) { lit[i] = on; n.classList.toggle('is-lit', on) }
    })

    for (const b of beats) {
      const signed = pos - b.i, d = Math.abs(signed)
      b.el.toggleAttribute('inert', clamp01((0.55 - d) / 0.3) < 0.05)   // no invisible focused links
      if (reduced) continue
      const near = d < NEAR
      if (near !== b.near) { b.near = near; b.el.classList.toggle('is-near', near) }
      if (d > NEAR + 0.3) { if (b.settled) continue; b.settled = true } else b.settled = false
      const inbound = signed <= 0   // ride in on approach, only fade on the way out
      b.rows.forEach((row, k) => {
        const rd = d + k * 0.05                       // reading-order stagger
        const ro = settle(clamp01((0.55 - rd) / 0.3))
        if (row.mask) {
          row.el.style.opacity = '1'
          row.mask.style.transform = inbound
            ? `translate3d(0, ${((1 - ro) * 105).toFixed(1)}%, 0) rotate(${((1 - ro) * 3.5).toFixed(2)}deg)` : 'none'
          return
        }
        if (row.words.length) {
          row.el.style.opacity = '1'
          const step = WORD_SPREAD / row.words.length
          row.words.forEach((w, i) => {
            const wo = settle(clamp01((0.55 + WORD_SPREAD - (rd + i * step)) / 0.3))
            w.style.opacity = String(WORD_FLOOR + (1 - WORD_FLOOR) * wo)
            w.style.transform = inbound ? `translate3d(0, ${((1 - wo) * 14).toFixed(1)}px, 0)` : 'none'
          })
          return
        }
        const x = inbound ? b.side * (1 - ro) * 28 : 0    // in from the lane's outer edge
        const y = inbound ? (1 - ro) * (22 + k * 6) : 0
        row.el.style.opacity = String(ro)
        row.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      })
    }

    // Deck: the three beats scrub through the project's shots
    const local = pos - si * BEATS
    const q = clamp01(local / (BEATS - 1))
    const enter = clamp01((local + 0.5) / 0.45)      // wipe-in at a handover
    const n = stories[si].shots.length
    const u = n > 1 ? q * (n - 1) : 0
    for (const el of cards) {
      const s = Number(el.dataset.story)
      const sign = wide && s % 2 === 1 ? -1 : 1       // left-lane decks spill left
      if (s === si - 1) {                              // outgoing: hold its last shot, dissolve
        const last = Number(el.dataset.shot) === stories[s].shots.length - 1
        el.style.opacity = last && !reduced ? String(1 - enter) : '0'
        el.style.transform = reduced ? 'none' : `translate3d(${(sign * enter * 10).toFixed(2)}%, 0, 0)`
        el.style.filter = blurOk ? `blur(${(enter * 9).toFixed(1)}px)` : 'none'
        el.style.zIndex = '900'
        continue
      }
      if (s !== si) { el.style.opacity = '0'; continue }
      const rel = Number(el.dataset.shot) - u
      let o = 0, tx = 0, ty = 0, tz = 0, ry = 0, blur = 0, bright = 1
      if (rel <= 0) {                                  // front card, banking toward the viewer
        const t = -rel
        if (t < 1) { o = Math.pow(1 - t, 1.7); tx = -8 * t; ty = -2 * t; tz = 110 * t; ry = 13 * t; blur = 14 * t }
      } else {                                         // stacked behind, dimmer the deeper
        const t = Math.min(rel, 3)
        o = rel > 2 ? clamp01(3 - rel) : 1; tx = 8 * t; ty = 3.2 * t; tz = -190 * t; ry = -9 * t; bright = 1 - 0.15 * t
      }
      if (reduced) { el.style.opacity = rel === 0 ? '1' : '0'; el.style.transform = 'none'; continue }
      el.style.opacity = String(o * enter * (blurOk ? 1 : bright))
      el.style.transform = `translate3d(${(sign * tx).toFixed(2)}%, ${ty.toFixed(2)}%, ${tz.toFixed(1)}px) rotateY(${(sign * ry).toFixed(2)}deg)`
      el.style.filter = blurOk ? `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})` : 'none'
      el.style.clipPath = Number(el.dataset.shot) === 0 && enter < 1 ? `inset(0 0 ${((1 - enter) * 100).toFixed(1)}% 0)` : 'none'
      el.style.zIndex = String(1000 + Math.round(tz))   // filter flattens 3D sorting; order by hand
    }
    counter.textContent = n ? `${pad(Math.round(u) + 1)} / ${pad(n)}` : ''
    rail.style.setProperty('--rail-q', q.toFixed(4))
  }

  let ticking = false
  const onScroll = () => {
    if (ticking || !inView) return
    ticking = true
    requestAnimationFrame(() => { ticking = false; apply() })
  }
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; apply() })
  io.observe(root)
  let rto: ReturnType<typeof setTimeout>
  const ro = new ResizeObserver(() => { clearTimeout(rto); rto = setTimeout(() => { measure(); apply() }, 80) })
  ro.observe(document.body)                          // titles re-fit and lazy images change offsets
  measure(); apply()
  addEventListener('scroll', onScroll, { passive: true })
  return () => { io.disconnect(); ro.disconnect(); removeEventListener('scroll', onScroll) }
}
```

If you use React: render the markup from data, memoise the copy column (hundreds of
word spans), call `createTimeline` in one `useEffect` with no dependency on the active
index, and let the engine own every class and style it writes. Never re-render the
copy on a handover.

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| Copy "bounces" past the centre | Counter-scroll parallax on the copy block, or offsets driven by `d` both ways | Remove parallax; animate only inbound, fade outbound |
| Glow only on the first project | Glow painted on the timeline root, which scrolls away | Put it on the sticky stage |
| Accent snaps at handover | Custom property not registered | `@property --project-accent { syntax: '<color>' ... }` and transition it |
| Deck blinks empty at a handover | Outgoing cards hidden before incoming wipe in | Hold the outgoing last shot and fade it with `1 - enter` |
| Words never resolve after load | Offsets cached before titles fitted / images loaded | Body `ResizeObserver` re-measure |
| Sticky stage does not stick | An ancestor has `overflow: hidden` | Use `overflow: clip` |
| Janky on phones | `filter: blur()` per frame on big bitmaps | Disable blur below desktop |
