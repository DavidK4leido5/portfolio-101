# 03. Section patterns

Every section below uses the tokens, fitted type and reveal system from
`01-foundations.md`. Class names are suggestions; keep the structure.

## Section shell

```html
<main class="spine">
  <section id="section-projects" class="spine-section" style="--section-color:#7c5cff"
           aria-labelledby="section-projects-title">
    <span class="spine-ghost" aria-hidden="true">02</span>
    <div class="spine-inner">
      <header class="spine-head">
        <p class="spine-index label" data-reveal>02<i> / 05</i></p>
        <h2 class="title" id="section-projects-title">
          <span class="title__mask" data-reveal>
            <span class="title__line display" data-fit>Projects<span class="title__dot" aria-hidden="true">.</span></span>
          </span>
        </h2>
        <p class="spine-lede" data-reveal style="--reveal-delay:.1s">
          Six client builds, from a Manila events venue on Webflow to an LLM product on AWS.
        </p>
      </header>
      <div class="spine-body"><!-- section content --></div>
    </div>
    <!-- full-bleed extras (marquee, timeline) go here, outside .spine-inner -->
  </section>
</main>
```

```css
.spine { position: relative; z-index: 20; }
.spine-section {
  position: relative;
  padding: clamp(72px, 12vh, 148px) var(--gutter) clamp(80px, 14vh, 168px);
  background:
    radial-gradient(70% 48vh at 12% 0%, color-mix(in srgb, var(--section-color) 11%, transparent), transparent 72%),
    #05050a;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  /* clip, not hidden: trims the bleeding ghost without becoming a scroll
     container, which would break every position: sticky inside */
  overflow: clip;
}
.spine-inner { position: relative; z-index: 1; max-width: 1180px; margin-inline: auto; }
.spine-head { margin-bottom: clamp(36px, 6vh, 72px); }
.spine-index { color: var(--section-color); margin-bottom: clamp(12px, 2vh, 22px); }
.spine-index i { font-style: normal; color: rgba(235, 235, 255, 0.28); }
.spine-lede { max-width: 46rem; font-size: clamp(15px, 1.5vw, 18px); line-height: 1.6; color: rgba(235,235,255,.6); }

.spine-ghost {
  position: absolute;
  top: clamp(24px, 4vh, 56px);
  right: -0.06em;
  z-index: 0;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(180px, 42vw, 720px);
  line-height: 0.8;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 0.005em color-mix(in srgb, var(--section-color) 55%, transparent);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
  will-change: transform;
}

/* Full-bleed extras cancel the section gutter */
.spine-section > .bleed { margin-inline: calc(-1 * var(--gutter)); margin-top: clamp(48px, 8vh, 96px); }
```

If a fixed side nav sits on the right edge, give every section the same extra right
padding (`padding-right: calc(var(--gutter) + 124px)` above 900px) so all sections
share one left and right edge. Test that: every `.spine-inner` must report identical
left and right edges at 1440px.

### Ghost drift

The ghost number lags the page by 14% from the moment its section enters, capped at
40% of the viewport. One rect read per visible section, reads before writes.

```ts
export function driftGhosts(root: HTMLElement): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const visible = new Set<HTMLElement>()
  let raf = 0
  const frame = () => {
    raf = 0
    const vh = innerHeight
    const moves = [...visible].map((s) => {
      const top = s.getBoundingClientRect().top
      return [s.querySelector<HTMLElement>('.spine-ghost'), Math.min(vh * 0.4, Math.max(0, (vh - top) * 0.14))] as const
    })
    for (const [g, y] of moves) if (g) g.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
  }
  const onScroll = () => { if (!raf && visible.size) raf = requestAnimationFrame(frame) }
  const io = new IntersectionObserver((es) => {
    for (const e of es) e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement)
    onScroll()
  })
  root.querySelectorAll<HTMLElement>('.spine-section').forEach((el) => io.observe(el))
  addEventListener('scroll', onScroll, { passive: true })
  return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('scroll', onScroll) }
}
```

## Softened image fill (for any image inside letters)

A raw screenshot inside letters is noise: its own text reads through the glyphs.
Dark screenshots vanish into the ground; light ones go flat grey under a uniform
darkening. So: shrink to 160px (the browser's upscale blurs it on every engine), add
a canvas blur where supported, stretch the image's own brightness range into a fixed
band (0.30 to 0.74), and pull each pixel 42% toward an accent at the same brightness.

```ts
const WIDTH = 160, LOW = 0.3, HIGH = 0.74, TINT = 0.42
const cache = new Map<string, Promise<string>>()
const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }

export function soften(src: string, accent: string): Promise<string> {
  const key = `${src}|${accent}`
  let job = cache.get(key)
  if (job) return job
  job = (async () => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement('canvas')
    c.width = WIDTH
    c.height = Math.max(1, Math.round((WIDTH * img.naturalHeight) / img.naturalWidth))
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.filter = 'blur(2px)'                 // ignored where unsupported; fine
    g.drawImage(img, 0, 0, c.width, c.height)
    g.filter = 'none'
    const d = g.getImageData(0, 0, c.width, c.height), px = d.data
    let min = 1, max = 0
    for (let i = 0; i < px.length; i += 4) { const l = lum(px[i], px[i+1], px[i+2]); if (l < min) min = l; if (l > max) max = l }
    const span = Math.max(0.05, max - min)
    const [ar, ag, ab] = hex(accent), aL = Math.max(0.05, lum(ar, ag, ab))
    for (let i = 0; i < px.length; i += 4) {
      const l = Math.max(0.01, lum(px[i], px[i+1], px[i+2]))
      const t = LOW + (HIGH - LOW) * ((l - min) / span)
      const k = t / l, ka = t / aL
      px[i]   = Math.min(255, px[i]   * k * (1 - TINT) + ar * ka * TINT)
      px[i+1] = Math.min(255, px[i+1] * k * (1 - TINT) + ag * ka * TINT)
      px[i+2] = Math.min(255, px[i+2] * k * (1 - TINT) + ab * ka * TINT)
    }
    g.putImageData(d, 0, 0)
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.85))
    if (!blob) throw new Error('export failed')
    return URL.createObjectURL(blob)
  })()
  cache.set(key, job)
  job.catch(() => cache.delete(key))
  return job
}
```

Apply the result as an **inline** `background-image` (a relative `url()` inside a
custom property resolves against the stylesheet's folder, not the page, and the text
silently renders transparent). Add the fill class only once the URL is ready, so the
prerendered page and a failed decode show solid type.

### Title filled with an image

```css
.title__line.is-filled {
  color: transparent;
  background-size: cover;
  background-position: center 30%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 0.008em rgba(244, 237, 228, 0.55);   /* always outline image text */
}
.title__line.is-filled .title__dot { -webkit-text-stroke: 0; }  /* zero it on small parts */
```

```ts
soften(shotUrl, sectionColor).then((url) => {
  line.style.backgroundImage = `url("${url}")`
  line.classList.add('is-filled')
})
```

## Typographic index rows (instead of project cards)

One row per project: rule, two-digit index, the name at display scale, one line of
description, role and dates, an arrow. Each row links to that project's chapter.
On hover, the name fills with its softened screenshot by shrinking a flat cream layer
stacked over the image inside the same `background-clip: text`.

```html
<ol class="index">
  <li class="index__row" data-reveal style="--row-accent:#35e0c8">
    <a class="index__link" href="#project-revive">
      <span class="index__num label">02</span>
      <span class="index__word">Revive Pharmacy</span>
      <span class="index__meta">
        <span class="index__desc">Pharmacy platform split into Node.js microservices...</span>
        <span class="index__role label">Systems Engineer · Mar 2025 - Aug 2026</span>
      </span>
      <span class="index__arrow" aria-hidden="true">↘</span>
    </a>
  </li>
</ol>
```

```css
.index { list-style: none; margin: 0; padding: 0; border-bottom: 1px solid rgba(255,255,255,.08); }
.index__row { border-top: 1px solid rgba(255,255,255,.08); }
.index__link {
  display: grid;
  grid-template-columns: clamp(36px, 5vw, 72px) minmax(0, 1fr) auto;
  grid-template-areas: 'num word arrow' '. meta meta';
  align-items: baseline;
  column-gap: clamp(12px, 2vw, 28px); row-gap: 10px;
  padding-block: clamp(18px, 3vh, 34px);
  color: inherit; text-decoration: none;
}
.index__num { grid-area: num; }
.index__word {
  grid-area: word;
  font: 800 clamp(2.4rem, 6.4vw, 7.4rem)/0.88 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -0.035em; text-transform: uppercase;
  color: var(--cream);
  background-repeat: no-repeat, no-repeat;          /* both layers, or the cover tiles */
  background-size: 100% 100%, cover;
  background-position: right center, center 20%;    /* cover layer anchored opposite the wipe */
  -webkit-text-stroke: 0.008em rgba(244, 237, 228, 0.5);
  transition: background-size 0.82s cubic-bezier(0.5, 0.12, 0.34, 0.94);  /* even pace, soft ends */
}
.index__word[style] { color: transparent; -webkit-background-clip: text; background-clip: text; }
.index__link:hover .index__word,
.index__link:focus-visible .index__word { background-size: 0% 100%, cover; }  /* animate %, never `cover` */
.index__meta { grid-area: meta; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 32px; }
.index__desc { max-width: 58ch; font-size: 13px; line-height: 1.6; color: rgba(235,235,255,.55); }
.index__arrow { grid-area: arrow; font-size: clamp(1.4rem, 3vw, 2.6rem); color: rgba(235,235,255,.35);
  transition: transform .6s var(--ease-osmo), color .4s; }
.index__link:hover .index__arrow, .index__link:focus-visible .index__arrow {
  color: var(--row-accent); transform: translate3d(0, .12em, 0) rotate(-45deg);
}
.index__link:focus-visible { outline: 1px solid var(--row-accent); outline-offset: 6px; }
```

```ts
soften(firstShot, accent).then((url) => {
  word.style.backgroundImage = `linear-gradient(var(--cream), var(--cream)), url("${url}")`
})
```

## Big-type marquee break

Giant names alternating outline and solid, each followed by one small tilted
screenshot, running as a pure CSS marquee (compositor only). The whole strip is
`aria-hidden`: the names are already on the page.

```html
<div class="bleed marquee" aria-hidden="true">
  <div class="marquee__track">
    <div class="marquee__group"><!-- items --></div>
    <div class="marquee__group"><!-- the same items again --></div>
  </div>
</div>
```

```css
.marquee { overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.marquee__track { display: flex; width: max-content; will-change: transform;
  animation: marquee 60s linear infinite; }
.marquee__group { display: flex; align-items: center; gap: clamp(28px, 4vw, 64px); padding-inline: clamp(14px, 2vw, 32px); }
@keyframes marquee { to { transform: translateX(-50%); } }
.marquee__word { font: 800 clamp(4rem, 13vw, 13rem)/.9 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -.04em; text-transform: uppercase; white-space: nowrap;
  color: transparent; -webkit-text-stroke: .012em rgba(235,235,255,.35); }
.marquee__word.is-solid { color: var(--cream); -webkit-text-stroke: 0; }
.marquee__shot { width: clamp(120px, 14vw, 220px); aspect-ratio: 3/2; object-fit: cover;
  border: 1px solid rgba(255,255,255,.1); border-radius: 10px; transform: rotate(-4deg); }
@media (prefers-reduced-motion: reduce) { .marquee__track { animation: none; } }
```

Each group must be at least as wide as the viewport, or a gap opens. Repeat the items
inside a group until `group.scrollWidth >= viewport width`.

## Editorial numbers (instead of stat tiles)

```css
.numbers { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
  gap: clamp(28px, 4vh, 48px) clamp(24px, 4vw, 56px); }
.numbers li { display: flex; flex-direction: column; gap: 10px; padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--section-color) 45%, transparent); }
.numbers__value { font: 800 clamp(3rem, 9vw, 8.4rem)/.84 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -.05em; color: var(--cream); }
.numbers__label { /* use .label */ }
```

## Statement lead

Set a section's first sentence at display scale inside its own paragraph, so it is
said once:

```ts
const [lead, rest] = para.match(/^(.+?[.!?])\s+(.*)$/s)?.slice(1) ?? ['', para]
// <p><strong class="statement">{lead}</strong> {rest}</p>
```

```css
.statement { display: block; margin-bottom: .9em;
  font: 800 clamp(1.9rem, 4.6vw, 4.2rem)/.98 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -.035em; text-transform: uppercase; color: var(--cream); }
```

## Experience rows

Index, the company at display scale, role and dates as a label, the write-up, and the
first percentage in the write-up pulled out as an outlined number:

```ts
const metric = description.match(/\d+(?:\.\d+)?%/)?.[0]
```

```css
.exp-row { display: grid; grid-template-columns: clamp(36px,5vw,72px) minmax(0,1fr);
  column-gap: clamp(12px,2vw,28px); row-gap: 18px; padding-block: clamp(26px,4vh,44px);
  border-top: 1px solid rgba(255,255,255,.08); }
@media (min-width: 901px) { .exp-row { grid-template-columns: clamp(36px,5vw,72px) minmax(0,1fr) auto; } }
.exp-row__company { font: 800 clamp(2rem,5.2vw,5rem)/.9 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -.035em; text-transform: uppercase; color: var(--cream); margin: 0 0 12px; }
.exp-row__metric { font: 800 clamp(2.8rem,6vw,5.6rem)/.84 'Inter Tight', system-ui, sans-serif;
  letter-spacing: -.05em; color: transparent; -webkit-text-stroke: .012em var(--section-color); }
```

## Contact: the address is the headline

Fit the email address to the column (`data-fit` on an inline-block span inside the
link). Big underline inputs instead of boxes. Two columns above 900px:
`'email email' 'lead form' 'tags form' 'meta form'`.

```css
.contact__email { display: block; padding-bottom: clamp(18px,3vh,30px); border-bottom: 1px solid rgba(255,255,255,.1); text-decoration: none; }
.contact__email-value { display: inline-block; white-space: nowrap;
  font-family: 'Inter Tight', system-ui, sans-serif; font-weight: 800; line-height: .95; color: var(--cream); transition: color .3s; }
.contact__email:hover .contact__email-value { color: var(--section-color); }
.field input, .field textarea { width: 100%; font-size: clamp(16px,1.5vw,20px); padding: 12px 0;
  background: none; border: 0; border-bottom: 1px solid rgba(255,255,255,.16); border-radius: 0; color: inherit; }
.field input:focus, .field textarea:focus { outline: none; border-color: var(--section-color); }
```

## Footer: end credits

The full name fitted to the width, outlined with a faint fill (a stroke alone breaks
up at phone sizes, where 0.006em is a fraction of a pixel):

```css
.foot__name { max-width: 1180px; margin: clamp(40px,8vh,96px) auto 0; overflow: hidden; }
.foot__name span { display: inline-block; white-space: nowrap;
  font-family: 'Inter Tight', system-ui, sans-serif; font-weight: 800; line-height: .84; text-transform: uppercase;
  color: rgba(235,235,255,.08); -webkit-text-stroke: .006em rgba(235,235,255,.4); }
```

## Far jumps (nav and index links)

Smooth-scrolling through a 20-viewport timeline takes seconds and plays every beat on
the way past. Cut to one viewport short of far targets, then glide:

```ts
export function glideTo(top: number) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return scrollTo({ top })
  if (Math.abs(top - scrollY) > innerHeight * 3) {
    scrollTo({ top: top - Math.sign(top - scrollY) * innerHeight, behavior: 'auto' })
  }
  scrollTo({ top, behavior: 'smooth' })
}
```
