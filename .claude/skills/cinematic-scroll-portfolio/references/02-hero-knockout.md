# 02. Hero: words cut out of a veil, zooming into a letter

The background (WebGL scene, video, image) sits behind a dark veil. The words are
holes in the veil, so the background shows at full strength only inside the
letterforms. Scrolling flies the frame into one letter until its solid stem fills
the screen; only then does the veil dissolve.

## Why it is built this way

- **Inline SVG `<mask>`, not CSS `mask-image`.** A mask loaded from a URL or data URI
  renders without access to the document's fonts, so the glyphs silently come out in
  a fallback face and the holes are the wrong shape.
- **Measure the copy outside `<defs>`.** Text inside a `<mask>` is never laid out, so
  `getComputedTextLength()` and `getBBox()` return zero on it. Keep a visible
  hairline copy of each line and measure that one.
- **Real cap height, not the em box.** `getBBox()` on SVG text returns the em box,
  whose top is the font's ascent, well above the caps. Spacing lines from it puts
  them a third of a cap apart and they read as two words. Use canvas
  `measureText(word).actualBoundingBoxAscent`.
- **Zoom into a stem, measured from pixels.** Pick a letter with a tall solid stem
  (T, I, L, H). Render it on a canvas at a 400px reference size, scan one row for the
  stem's left and right edges and one column beside it for the crossbar's underside.
  Scale results down to the real size. At small sizes a 1px rounding error times a
  35x zoom leaves a strip of veil at the edge.
- **Pan the stem to the center while zooming.** Covering the frame from off-center
  needs roughly 1.5x the scale, and past the next limit.
- **Swap text for a rectangle past ~6000px glyph height.** Chrome's mask renderer
  breaks on glyphs around 10,000px tall: the hole closes and the veil covers the
  whole frame again (seen as the page dimming near the end of the zoom). By 6000px
  only the stem is on screen, so a `<rect>` cut to its measured edges replaces the
  text invisibly and scales without limit.
- **Treat the stem as narrower than measured.** Zoomed in, SVG stops rounding glyph
  advances and the letter slides up to ~1.6px of glyph space. Subtract a slack of
  `max(2px, 1.2% of font size)` from the stem half-width and half-height.
- **`vector-effect: non-scaling-stroke` on the hairline.** Otherwise the outline
  scales with the zoom into thick grey bars sweeping across the frame.
- **Hold the veil until the stem covers the frame.** Solve the end scale so the
  cover scale is reached exactly when the veil starts to fade. The fade then happens
  while no veil is visible, so the handover is seamless.

## Markup

```html
<div class="hero-mark" aria-hidden="true">
  <p class="sr-only">Full-stack engineer</p>
  <svg class="hero-mark__svg">
    <defs>
      <mask id="knockout" maskUnits="userSpaceOnUse">
        <rect class="knockout__white" fill="#fff" />
        <g class="knockout__zoom">
          <rect class="knockout__stem" fill="#000" visibility="hidden" />
          <g class="knockout__words">
            <text class="glyph" text-anchor="middle" fill="#000">FULL</text>
            <text class="glyph" text-anchor="middle" fill="#000">STACK</text>
          </g>
        </g>
      </mask>
    </defs>
    <rect class="hero-mark__veil" mask="url(#knockout)" />
    <g class="hairline__zoom">
      <text class="glyph hairline" text-anchor="middle">FULL</text>
      <text class="glyph hairline" text-anchor="middle">STACK</text>
    </g>
    <text class="hero-mark__sub" text-anchor="middle">Engineer</text>
  </svg>
</div>
```

```css
.hero-mark { position: fixed; inset: 0; z-index: 6; pointer-events: none; }
.hero-mark__svg { display: block; width: 100%; height: 100%; }
.hero-mark__veil { fill: rgba(3, 3, 8, 0.82); }   /* dark, but the scene still reads */
.glyph { font-family: 'Inter Tight', system-ui, sans-serif; font-weight: 800; text-transform: uppercase; }
.hairline {
  fill: none;
  stroke: rgba(244, 237, 228, 0.42);
  stroke-width: 0.006em;
  vector-effect: non-scaling-stroke;
}
.hero-mark__sub {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px; letter-spacing: 0.62em; text-transform: uppercase;
  fill: rgba(235, 235, 255, 0.6);
}
```

## The module

Framework-free. Call `fit()` on load, on `document.fonts.ready` and on width
changes. Call `write(p)` with the exit progress 0..1 (0 = hero at rest, 1 = the next
section has fully covered it) on every rAF-throttled scroll tick.

```ts
const LINES_GAP = 0.14        // gap between lines, share of the first cap height
const TRACKING = -0.03        // em
const MEASURE = 0.76          // block width, share of viewport width (0.62 on phones)
const BAND = { top: 96, bottom: 224 }   // chrome to keep clear (CTA, sliders)
const AIM = { line: 1, index: 1 }       // the T in STACK
const ZOOM_MIN = 26
const ZOOM_EASE = 1.9          // >1 accelerates: reads as falling into the words
const VEIL_HOLD = 0.84         // veil starts to go here...
const VEIL_GONE = 0.96         // ...and is gone here
const SWAP_PX = 6000           // glyph size past which text is replaced by a rect
const STEM_REF = 400
const SLACK = 0.012, SLACK_MIN = 2

let ctx: CanvasRenderingContext2D | null = null
const metrics = (family: string, px: number) => {
  ctx ??= document.createElement('canvas').getContext('2d')!
  ctx.font = `800 ${px}px ${family}`
  return ctx
}

function stemOf(family: string, px: number, cap: number, ch: string) {
  const k = px / STEM_REF, refCap = cap / k, pad = STEM_REF * 0.2
  const c = document.createElement('canvas')
  c.width = STEM_REF * 1.4; c.height = STEM_REF * 1.2
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.font = `800 ${STEM_REF}px ${family}`
  g.fillText(ch, pad, STEM_REF)
  const row = g.getImageData(0, Math.round(STEM_REF - refCap * 0.25), c.width, 1).data
  let left = -1, right = -1
  for (let x = 0; x < c.width; x++) if (row[x * 4 + 3] > 127) { if (left < 0) left = x; right = x + 1 }
  if (left < 0) return { left: 0, right: px * 0.18, clear: cap * 0.8 }
  const col = g.getImageData(Math.max(0, left - 4), 0, 1, c.height).data
  let bottom = STEM_REF - refCap
  for (let y = 0; y < STEM_REF; y++) if (col[y * 4 + 3] > 127) bottom = y + 1
  return { left: (left - pad) * k, right: (right - pad) * k, clear: (STEM_REF - bottom) * k }
}

const smooth = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }

export function createKnockout(svg: SVGSVGElement) {
  const maskText = [...svg.querySelectorAll<SVGTextElement>('.knockout__words text')]
  const hair = [...svg.querySelectorAll<SVGTextElement>('.hairline')]
  const zoomGroups = [svg.querySelector('.knockout__zoom')!, svg.querySelector('.hairline__zoom')!]
  const words = svg.querySelector<SVGGElement>('.knockout__words')!
  const stemRect = svg.querySelector<SVGRectElement>('.knockout__stem')!
  const veil = svg.querySelector<SVGRectElement>('.hero-mark__veil')!
  const sub = svg.querySelector<SVGTextElement>('.hero-mark__sub')!
  let origin = { x: 0, y: 0 }, aim = { x: 0, y: 0, panBy: 1, swapAt: Infinity }, zoomTo = ZOOM_MIN

  const setSize = (i: number, px: number) => {
    for (const n of [maskText[i], hair[i]]) {
      n.style.fontSize = `${px}px`
      n.style.letterSpacing = `${TRACKING * px}px`
    }
  }

  function fit() {
    const w = innerWidth, h = innerHeight
    for (const el of [svg, ...svg.querySelectorAll('rect.knockout__white, .hero-mark__veil')]) {
      el.setAttribute('width', String(w)); el.setAttribute('height', String(h))
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    const measure = w * MEASURE
    const band = h - BAND.top - BAND.bottom
    // Solve each line to the measure (measure the visible hairline copy)
    const sizes = hair.map((t, i) => {
      setSize(i, 200)
      let px = (200 * measure) / Math.max(1, t.getComputedTextLength())
      setSize(i, px)
      for (let s = 0; s < 4 && t.getComputedTextLength() > measure; s++) { px *= 0.996; setSize(i, px) }
      return px
    })
    const family = getComputedStyle(hair[0]).fontFamily
    const capOf = (i: number, px: number) =>
      metrics(family, px).measureText(hair[i].textContent ?? '').actualBoundingBoxAscent || px * 0.727
    const subGap = (cap: number) => Math.max(30, cap * 0.24)
    const plan = (scale: number) => {
      const caps = sizes.map((px, i) => capOf(i, px * scale))
      const offsets = [0]
      for (let i = 1; i < caps.length; i++) offsets.push(offsets[i - 1] + caps[i] + caps[0] * LINES_GAP)
      return { caps, offsets, height: caps[0] + offsets.at(-1)! + subGap(caps[0]) }
    }
    let scale = 1, p = plan(1)
    if (p.height > band) { scale = band / p.height; sizes.forEach((px, i) => setSize(i, px * scale)); p = plan(scale) }
    const first = BAND.top + (band - p.height) / 2 + p.caps[0]
    hair.forEach((_, i) => {
      for (const n of [maskText[i], hair[i]]) { n.setAttribute('x', String(w / 2)); n.setAttribute('y', String(first + p.offsets[i])) }
    })
    const last = first + p.offsets.at(-1)!
    const tracking = parseFloat(getComputedStyle(sub).letterSpacing) || 0
    sub.setAttribute('x', String(w / 2 + tracking / 2))       // trailing spacing, re-centre
    sub.setAttribute('y', String(last + subGap(p.caps[0])))

    // Aim at the stem
    const t = hair[AIM.line]
    const px = parseFloat(t.style.fontSize), cap = p.caps[AIM.line]
    const baseline = first + p.offsets[AIM.line]
    const ch = (t.textContent ?? '')[AIM.index]
    let pen = w / 2
    try { pen = t.getStartPositionOfChar(AIM.index).x } catch {}
    const stem = stemOf(family, px, cap, ch)
    const clearTop = baseline - stem.clear
    origin = { x: pen + (stem.left + stem.right) / 2, y: (clearTop + baseline) / 2 }
    stemRect.setAttribute('x', String(pen + stem.left))
    stemRect.setAttribute('y', String(baseline - cap))
    stemRect.setAttribute('width', String(stem.right - stem.left))
    stemRect.setAttribute('height', String(cap))
    const slack = Math.max(SLACK_MIN, px * SLACK)
    const cover = 1.1 * Math.max(
      w / 2 / Math.max(1, (stem.right - stem.left) / 2 - slack),
      h / 2 / Math.max(1, (baseline - clearTop) / 2 - slack),
    )
    const swapAt = Math.max(1, SWAP_PX / px)
    aim = { x: w / 2, y: h / 2, panBy: Math.min(cover, swapAt), swapAt }
    zoomTo = Math.max(ZOOM_MIN, 1 + (cover - 1) / Math.pow(VEIL_HOLD, ZOOM_EASE))
  }

  function write(p: number) {
    const s = 1 + (zoomTo - 1) * Math.pow(p, ZOOM_EASE)
    const k = smooth((s - 1) / Math.max(1e-3, aim.panBy - 1))
    const tx = origin.x + (aim.x - origin.x) * k
    const ty = origin.y + (aim.y - origin.y) * k
    const tf = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-origin.x} ${-origin.y})`
    for (const g of zoomGroups) g.setAttribute('transform', tf)
    const swapped = s >= aim.swapAt
    words.setAttribute('visibility', swapped ? 'hidden' : 'visible')
    stemRect.setAttribute('visibility', swapped ? 'visible' : 'hidden')
    const veilO = Math.min(1, Math.max(0, 1 - (p - VEIL_HOLD) / (VEIL_GONE - VEIL_HOLD)))
    veil.style.opacity = String(veilO)
    ;(zoomGroups[1] as SVGGElement).style.opacity = String(veilO * Math.min(1, Math.max(0, 1 - (p - 0.5) / 0.2)))
    ;(zoomGroups[1] as SVGGElement).setAttribute('visibility', swapped ? 'hidden' : 'visible')
    sub.style.opacity = String(Math.max(0, 1 - p / 0.35))   // supporting type leaves early
  }

  return { fit, write }
}
```

Scroll wiring. The hero spacer is `100dvh` tall and the next section follows it, so
the exit progress is simply `scrollY / innerHeight`:

```ts
const k = createKnockout(document.querySelector('.hero-mark__svg')!)
const refit = () => { k.fit(); k.write(Math.min(1, scrollY / innerHeight)) }
refit(); document.fonts.ready.then(refit)
let lastW = innerWidth
addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; refit() } })
let ticking = false
addEventListener('scroll', () => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => { ticking = false; k.write(Math.min(1, scrollY / innerHeight)) })
}, { passive: true })
```

## Entrance

Play once when the background is ready: each line group rises about 44px into place
with `expo.out` over ~1.15s, staggered 0.14s. Write the rise as a `translate` on a per-line
`<g>` inside the zoom group (mask content cannot run CSS animations, so do it in JS).
The veil fades in with a CSS `fill-opacity` keyframe, not `opacity`, because the
scroll exit owns the inline opacity.

## Checks

Run the veil-coverage probe from `06-verify-and-perf.md` at 390x844, 1440x900 and
2560x1440. The veil must cover 0% of the frame by `p = VEIL_HOLD`. If it does not:
- A strip at one edge: the stem is off-center. Increase `SLACK_MIN`.
- The whole frame goes dark near the end: the glyphs passed the mask limit before
  the swap. Lower `SWAP_PX`.
- Letters other than the aimed one are still visible when the veil starts to go:
  the zoom is too small. Check `cover` and `zoomTo`.
