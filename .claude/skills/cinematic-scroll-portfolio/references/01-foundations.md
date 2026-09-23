# 01. Foundations: tokens, fitted type, reveals

Everything later depends on these three pieces. Build them first and test them alone.

## Tokens

Put this at the top of the global stylesheet. Change the accent and cream if the
brand needs it. Keep the easing curves: the long slow tail is what makes large type
arrive instead of snap.

```css
:root {
  --ease-osmo: cubic-bezier(0.625, 0.05, 0, 1); /* entrances of big type */
  --ease-soft: cubic-bezier(0.32, 0.72, 0, 1);  /* fades, colour changes */
  --accent: #8b5cf6;
  --cream: #ece9f2;                              /* type on the dark ground */
  --gutter: clamp(20px, 5vw, 64px);
  color-scheme: dark;
}

html { scroll-behavior: auto; }      /* smooth scroll is done in JS, per jump */
body {
  margin: 0;
  background: #020204;
  color: #e8e8f0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.display {                           /* the one display face, one weight */
  font-family: 'Inter Tight', 'Segoe UI', system-ui, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  line-height: 0.86;
  letter-spacing: -0.035em;
}

.label {                             /* every small supporting label */
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(235, 235, 255, 0.45);
}

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

Load the font with only the weight you use:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@800&display=swap" rel="stylesheet" />
```

If any rule asks for `font-weight: 600` or `700` while only 800 is loaded, the browser
synthesises it and the letters look smeared. Set every display rule to 800.

## Film grain

A fixed overlay, animated with `steps()` so it jumps between positions. A smooth
animation reads as a moving gradient instead of film. Skip it on phones.

```css
.page::after {
  content: '';
  position: fixed;
  inset: -50%;
  z-index: 50;
  pointer-events: none;
  opacity: 0.022;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  animation: film-grain 0.8s steps(3) infinite;
}
@keyframes film-grain {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2%, -3%); }
  50% { transform: translate(3%, 1%); }
  75% { transform: translate(-1%, 4%); }
  100% { transform: translate(2%, -2%); }
}
@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  .page::after { display: none; }
}
```

## Fitted type

A word that must fill its column exactly. Metrics scale linearly with font size, so
one measurement at a reference size gives the answer. Then step down until it fits,
because rendered width snaps to the pixel grid and a correction loop oscillates.

`fitText.ts`:

```ts
const REF_PX = 200
const STEP = 0.004
const MAX_STEPS = 4

export function fitToWidth(el: HTMLElement, targetPx: number, trackingEm: number) {
  if (targetPx <= 0) return
  const setSize = (px: number) => {
    el.style.fontSize = `${px.toFixed(2)}px`
    el.style.letterSpacing = `${(trackingEm * px).toFixed(3)}px`
  }
  setSize(REF_PX)
  const measured = el.getBoundingClientRect().width
  if (measured < 1) return
  let size = (REF_PX * targetPx) / measured
  setSize(size)
  // Overflow is the failure that shows; undershooting 0.4% is invisible
  for (let step = 0; step < MAX_STEPS; step++) {
    if (el.getBoundingClientRect().width <= targetPx) break
    size *= 1 - STEP
    setSize(size)
  }
}

/** Fit every [data-fit] inside root to its parent's content width. */
export function observeFit(root: ParentNode, trackingEm = -0.035): () => void {
  const run = () => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-fit]')) {
      const parent = el.parentElement
      if (!parent) continue
      const cs = getComputedStyle(parent)
      const inner = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      fitToWidth(el, inner, trackingEm)
    }
  }
  run()
  document.fonts?.ready.then(run).catch(() => {})   // the webfont changes every metric
  // Width is the only input. Height-only resizes (mobile URL bar) must not re-fit,
  // or every title jumps and the page height changes under the reader.
  let lastWidth = innerWidth
  let to: ReturnType<typeof setTimeout>
  const onResize = () => {
    if (innerWidth === lastWidth) return
    lastWidth = innerWidth
    clearTimeout(to)
    to = setTimeout(run, 120)
  }
  addEventListener('resize', onResize)
  return () => { clearTimeout(to); removeEventListener('resize', onResize) }
}
```

Markup and CSS for a fitted line:

```html
<span class="fit-parent"><span class="fit-line display" data-fit>Projects</span></span>
```

```css
.fit-parent { display: block; }
/* inline-block, not block: a block is always its container's width, so the
   measurement would never change and the fit would do nothing */
.fit-line { display: inline-block; white-space: nowrap; }
```

Rules:
- The fitted element must be one unbroken text run with `white-space: nowrap`.
  An inline child span (a coloured trailing dot) is fine.
- Run the fit after the reveal system arms (see below). If a hidden state adds a
  transform, and you measure with `getBoundingClientRect`, measure consistently.
- Tracking is set in px from the em value so it scales with the solved size.

## Reveal system (one-shot)

An IntersectionObserver adds `is-in`; CSS does the motion. The hidden state only
exists under `html.reveal-armed`, which the script adds once the observer is live.
With no JS, a thrown module, or reduced motion, everything is visible.

`textReveal.ts`:

```ts
export const REVEAL_SELECTOR = '[data-reveal],[data-wipe]'
const WIPE = '[data-wipe]'
const ARMED = 'reveal-armed'
const STAGGER_STEP = 0.07
const STAGGER_CAP = 0.45

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export const toWords = (text: string) => text.split(/\s+/).filter(Boolean)

function stampStagger(root: ParentNode) {
  for (const group of root.querySelectorAll('[data-reveal-stagger]')) {
    ;[...group.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)].forEach((el, i) => {
      if (el.style.getPropertyValue('--reveal-delay')) return
      el.style.setProperty('--reveal-delay', `${Math.min(i * STAGGER_STEP, STAGGER_CAP).toFixed(3)}s`)
    })
  }
}

/** Targets are collected once. Do not tag nodes that mount later. */
export function observeReveal(root: ParentNode, selector = '[data-reveal]'): () => void {
  const targets = [...root.querySelectorAll(selector)]
  const wipes = [...root.querySelectorAll(WIPE)]
  if (typeof IntersectionObserver === 'undefined' || prefersReduced()) {
    for (const el of [...targets, ...wipes]) el.classList.add('is-in')
    return () => {}
  }
  stampStagger(root)
  document.documentElement.classList.add(ARMED)
  // A clipped-shut image has zero visible area, so it can never trigger itself.
  // It opens with the nearest [data-reveal] around it, or now if there is none.
  for (const el of wipes) if (!el.closest(selector)) el.classList.add('is-in')
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-in')
      for (const w of entry.target.querySelectorAll(WIPE)) w.classList.add('is-in')
      io.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 })
  for (const el of targets) io.observe(el)
  return () => io.disconnect()
}
```

CSS. The arrival is an `animation`, not a `transition`, so it cannot clobber an
element's own hover transition.

```css
.reveal-armed [data-reveal] {
  --reveal-x: 0px; --reveal-y: 34px; --reveal-scale: 1;
  opacity: 0;
  transform: translate3d(var(--reveal-x), var(--reveal-y), 0) scale(var(--reveal-scale));
}
.reveal-armed [data-reveal='card'] { --reveal-y: 48px; --reveal-scale: 0.976; }
.reveal-armed [data-reveal='left'] { --reveal-x: -28px; --reveal-y: 0px; }
.reveal-armed [data-wipe] { clip-path: inset(0 0 100% 0); transform: scale(1.05); }

@keyframes reveal-in {
  from { opacity: 0; transform: translate3d(var(--reveal-x), var(--reveal-y), 0) scale(var(--reveal-scale)); }
}
@keyframes reveal-wipe { from { clip-path: inset(0 0 100% 0); transform: scale(1.05); } }

.reveal-armed [data-reveal].is-in {
  opacity: 1; transform: none;
  animation: reveal-in 1s var(--ease-osmo) var(--reveal-delay, 0s) backwards;
}
.reveal-armed [data-wipe].is-in {
  transform: none; clip-path: inset(0 0 0 0);
  animation: reveal-wipe 1.1s var(--ease-osmo) var(--reveal-delay, 0s) backwards;
}
@media (prefers-reduced-motion: reduce) {
  .reveal-armed [data-reveal] { opacity: 1; transform: none; }
  .reveal-armed [data-wipe] { clip-path: none; transform: none; }
}
```

## Masked title reveal (the giant section word)

Big type does not fade in: at display scale a fade reads as nothing happening. It
rides up from under a clip with a slight tilt. Two elements are required, because a
clip on the moving element would move with it.

```html
<h2 class="title" id="section-projects-title">
  <span class="title__mask" data-reveal>                 <!-- observed, never moves -->
    <span class="title__line display" data-fit>Projects<span class="title__dot" aria-hidden>.</span></span>
  </span>
</h2>
```

```css
/* Negative top: at line-height .84 the caps overshoot the line box */
.title__mask { display: block; clip-path: inset(-35% 0 -0.03em 0); }
.title__mask[data-reveal] { opacity: 1; transform: none; animation: none; }
.title__line {
  display: inline-block; white-space: nowrap; color: var(--cream);
  transform-origin: 0% 100%;
  transition: transform 1.25s var(--ease-osmo);
}
.reveal-armed .title__line { transform: translate3d(0, 108%, 0) rotate(2.2deg); }
.reveal-armed .title__mask.is-in .title__line { transform: none; }
.title__dot { color: var(--section-color, var(--accent)); }
@media (prefers-reduced-motion: reduce) {
  .reveal-armed .title__line { transform: none; transition: none; }
}
```

Wiring (React; the same calls work from plain JS on DOMContentLoaded):

```tsx
useEffect(() => {
  const root = rootRef.current
  if (!root) return
  const stopReveal = observeReveal(root)   // arm first
  const stopFit = observeFit(root)          // then fit
  return () => { stopFit(); stopReveal() }
}, [])
```

## Checks for this step

- Remove `reveal-armed` from `<html>` in devtools: every title and paragraph must be
  visible and in place.
- Resize from 1440 to 390: every fitted word stays inside its column, no horizontal
  scrollbar appears.
- Scroll a title into view: it rides up once and stays.
