# 07. Cursor, start gate, progress bar and other page chrome

Small pieces that make the page feel alive. Each is independent: take the ones the
brief asks for.

## Custom cursor

A 6px dot exactly on the pointer and a 36px ring that trails it. The ring opens over
anything clickable, shows a one-word label on links that go somewhere specific,
squeezes on press, and takes the accent colour of whatever it is over.

Rules that came from bugs:
- **Only for a fine pointer.** Check `matchMedia('(hover: hover) and (pointer: fine)')`.
  On touch nothing mounts and the native cursor is never hidden.
- **Hide the native cursor only after the custom one mounts:** the script adds
  `html.has-cursor`, and CSS hides the native cursor under that class. Keep the text
  caret on inputs, textareas and selects.
- **The wrapper must not isolate the blend.** A wrapper with its own `z-index` or
  `opacity` makes a stacking context, and the dot's `mix-blend-mode: difference` then
  blends with the wrapper's empty box instead of the page. Use `display: contents`
  on the wrapper and give the dot and ring their own `position: fixed; z-index`.
- **Scale lives on a child.** The ring's per-frame `transform` is the follow; its
  hover growth is the CSS `scale` property on an inner span, so they never fight.
- **Frame-rate independent lag:** `k = 1 - 0.78 ** (dt / 16.7)`. The rAF loop stops
  once the ring has caught up, so a still mouse costs nothing.
- **Accent by scope, not by nearest variable.** A registered `@property` has an
  initial value everywhere, so reading it outside its scope always returns something.
  Walk known scopes with `closest()` (row, timeline, trace stage, section) and read
  that scope's own variable.
- **Re-read after scrolling.** Content moves under a still pointer. 120ms after the
  last scroll event, run one `elementFromPoint` and update the state.

```tsx
const INTERACTIVE = 'a, button, [role="button"], label, summary, input[type="range"], [data-cursor]'
const TEXT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]'
const LABELS: [string, string][] = [
  ['.index__link', 'View'], ['.tl-beat__link', 'Visit'],
  ['a[href^="mailto:"]', 'Email'], ['a[target="_blank"]', 'Open'],
]

export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dot = root.querySelector<HTMLElement>('.cursor__dot')!
    const ring = root.querySelector<HTMLElement>('.cursor__ring')!
    const label = root.querySelector<HTMLElement>('.cursor__label')!
    document.documentElement.classList.add('has-cursor')
    let x = -100, y = -100, rx = x, ry = y, raf = 0, last = 0
    let over: Element | null = null
    const place = (el: HTMLElement, px: number, py: number) => {
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`
    }
    const loop = (t: number) => {
      const dt = last ? Math.min(64, t - last) : 16.7
      last = t
      const k = reduced ? 1 : 1 - Math.pow(0.78, dt / 16.7)
      rx += (x - rx) * k; ry += (y - ry) * k
      place(ring, rx, ry)
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.2) raf = requestAnimationFrame(loop)
      else { raf = 0; last = 0 }
    }
    const setTarget = (el: Element | null) => {
      if (el === over) return
      over = el
      const text = el?.closest(TEXT)
      const hit = text ? null : el?.closest(INTERACTIVE)
      root.dataset.state = text ? 'text' : hit ? 'hover' : 'idle'
      const word = hit ? hit.getAttribute('data-cursor') ?? LABELS.find(([s]) => hit.matches(s))?.[1] ?? '' : ''
      label.textContent = word
      root.toggleAttribute('data-label', word !== '')
      if (el) root.style.setProperty('--cursor-accent', accentAt(el))   // walk scopes, see above
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX; y = e.clientY
      place(dot, x, y)
      if (root.dataset.visible !== 'true') { rx = x; ry = y; place(ring, x, y); root.dataset.visible = 'true' }
      if (!raf) raf = requestAnimationFrame(loop)
    }
    // pointerover -> setTarget(e.target); pointerdown/up -> data-down; pointerout with
    // no relatedTarget or window blur -> data-visible=false; scroll -> re-read (above)
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerover', (e) => setTarget(e.target as Element), { passive: true })
    return () => { cancelAnimationFrame(raf); document.documentElement.classList.remove('has-cursor') /* + remove listeners */ }
  }, [])
  return (
    <div className="cursor" ref={rootRef} data-state="idle" data-visible="false" aria-hidden>
      <div className="cursor__ring"><span className="cursor__shape" /><span className="cursor__label" /></div>
      <div className="cursor__dot" />
    </div>
  )
}
```

```css
html.has-cursor, html.has-cursor * { cursor: none !important; }
html.has-cursor :is(input:not([type="range"]), textarea, select, [contenteditable="true"]) { cursor: text !important; }
.cursor { --cursor-accent: var(--accent); display: contents; }
.cursor__dot, .cursor__ring { position: fixed; top: 0; left: 0; z-index: 10000; pointer-events: none; will-change: transform; }
.cursor[data-visible="false"] :is(.cursor__dot, .cursor__ring) { visibility: hidden; }
.cursor__dot { width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: #fff;
  mix-blend-mode: difference; transition: scale .35s var(--ease-osmo), opacity .25s; }
.cursor__ring { width: 36px; height: 36px; margin: -18px 0 0 -18px; display: grid; place-items: center; }
.cursor__shape { grid-area: 1/1; position: relative; width: 100%; height: 100%; border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--cursor-accent) 70%, #fff);
  transition: scale .45s var(--ease-osmo), background-color .35s, border-color .35s, opacity .25s; }
.cursor__label { grid-area: 1/1; font: 9px ui-monospace, monospace; letter-spacing: .24em; text-indent: .24em;
  text-transform: uppercase; color: #fff; opacity: 0; scale: .6; transition: opacity .25s, scale .45s var(--ease-osmo); }
.cursor[data-state="hover"] .cursor__shape { scale: 1.55; background: color-mix(in srgb, var(--cursor-accent) 16%, transparent); border-color: var(--cursor-accent); }
.cursor[data-state="hover"] .cursor__dot { scale: 0; }
.cursor[data-label] .cursor__shape { scale: 2.3; background: color-mix(in srgb, var(--cursor-accent) 26%, rgba(5,5,10,.55)); }
.cursor[data-label] .cursor__label { opacity: 1; scale: 1; }
.cursor[data-down] .cursor__shape { scale: .8; }
.cursor[data-state="text"] :is(.cursor__shape, .cursor__dot) { opacity: 0; }
```

### A line that follows the cursor

To tell people something can be touched ("Don't touch. The swarm is alive."), put a
two-line label inside the ring, positioned `left: calc(100% + 14px)`, so it trails
with the ring and never covers what is being pointed at. Show it only while the
pointer is over the interactive thing (`data-swarm` set from its enter/leave events)
and the ring is idle. Touch devices get a fixed version of the same line instead, placed
in the hero, answering the first tap and then leaving.

Copy rules: short, in the page's own voice, a dare rather than an instruction. Swap to
an answer ("It felt that.") for about three seconds after an interaction.

### Damage feedback (the cursor being attacked)

When something "bites" the cursor:
- **Chunks out of the ring.** A conic-gradient mask with random gaps, rebuilt on
  each bite and grown back one gap at a time (every ~260ms) after the attack ends.
  Build it in JS:

```ts
const bites: { at: number; size: number }[] = []   // degrees
function paintBites(shape: HTMLElement) {
  if (!bites.length) return shape.style.removeProperty('--bites')
  const gaps = [...bites].sort((a, b) => a.at - b.at)
  let at = 0
  const stops: string[] = []
  for (const g of gaps) {
    const from = Math.max(at, g.at)
    stops.push(`#000 ${at}deg ${from}deg`, `transparent ${from}deg ${from + g.size}deg`)
    at = from + g.size
  }
  stops.push(`#000 ${at}deg 360deg`)
  shape.style.setProperty('--bites', `conic-gradient(${stops.join(', ')})`)
}
// on bite: bites.push({ at: Math.random() * 340, size: 14 + Math.random() * 26 }) (cap ~7)
```

- **Chromatic split and slices:** two `::before`/`::after` copies of the ring, one red
  and one cyan, each offset and clipped into shifting horizontal slices with a
  stepped animation. Restart the flash on each bite by removing the attribute and
  setting it again on the next frame.
- **Jolt:** a stepped `translate` jitter on the ring and the dot.
- **Words:** the label switches to a glitchy red word ("Ouch!", "Hey!", "Ahhh!",
  "Run.", "It bites!", "Stop that."), never the same one twice in a row.
- **Everything times itself out.** If the thing driving the attack stops (the scene
  unmounts mid-attack), the cursor still heals, so a stuck state is impossible.

```css
.cursor__shape { -webkit-mask: var(--bites, none); mask: var(--bites, none); }
.cursor[data-attacked] .cursor__shape { border-color: #ff4d6d; }
.cursor__shape::before, .cursor__shape::after { content: ''; position: absolute; inset: -1px; border-radius: 50%;
  border: 1px solid transparent; opacity: 0; }
.cursor[data-hurt] .cursor__shape::before { border-color: rgba(255,40,90,.95); opacity: 1; animation: slice-a .3s steps(3) both; }
.cursor[data-hurt] .cursor__shape::after { border-color: rgba(40,230,255,.9); opacity: 1; animation: slice-b .3s steps(3) both; }
.cursor[data-hurt] :is(.cursor__shape, .cursor__dot) { animation: jolt .3s steps(4) both; }
@keyframes jolt { 0% { translate: 3px -2px } 25% { translate: -4px 1px } 50% { translate: 2px 3px } 75% { translate: -2px -3px } 100% { translate: 0 0 } }
@keyframes slice-a { 0% { translate: 4px 0; clip-path: inset(0 0 62% 0) } 33% { translate: -3px 0; clip-path: inset(40% 0 22% 0) } 66% { translate: 5px 0; clip-path: inset(70% 0 0 0) } 100% { translate: 0; clip-path: inset(0 0 100% 0) } }
@keyframes slice-b { 0% { translate: -4px 0; clip-path: inset(55% 0 10% 0) } 33% { translate: 3px 0; clip-path: inset(10% 0 60% 0) } 66% { translate: -5px 0; clip-path: inset(30% 0 45% 0) } 100% { translate: 0; clip-path: inset(100% 0 0 0) } }
```

## Start gate (needed for sound, useful for intros)

Browsers block audio until the visitor clicks, taps or presses a key. Autoplay
policies cannot be bypassed and should not be tried. If the page has sound, end the
loading screen on a button and start the intro from its click. That click is the
gesture, so sound is running from the very first frame of the intro.

- Primary button with in-context copy ("Wake the swarm"), a small line under it
  ("Sound on. Best with headphones."), and a quieter "Enter without sound".
- Focus the primary button when it appears, so Enter works.
- The gate's own buttons make no click sound: the page's first sound should be the
  intro's.
- Hide any mute toggle while the gate is up, so the two choices do not compete.
- **Automation has nobody to press it.** Under `navigator.webdriver` skip the gate
  and start the intro on a timer, or every Playwright test hangs on the loader.

```tsx
useEffect(() => {
  if (!sceneReady || navigator.webdriver) return
  const t = setTimeout(() => setGate(true), 700)
  return () => clearTimeout(t)
}, [sceneReady])
const enter = (withSound: boolean) => { audio.setMuted(!withSound); audio.unlock(); startIntro() }
```

## Scroll progress bar

A 2px accent hairline across the top. Drive it with a CSS scroll timeline (runs on
the compositor, no script) and fall back to one rAF-throttled transform where
unsupported.

```css
.scroll-progress { position: fixed; top: 0; left: 0; right: 0; z-index: 9000; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 60%, transparent);
  transform: scaleX(0); transform-origin: 0 50%; }
@supports (animation-timeline: scroll()) {
  .scroll-progress { animation: progress linear both; animation-timeline: scroll(root block); }
}
@keyframes progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
```

```ts
if (!CSS.supports('animation-timeline: scroll()')) {
  const write = () => {
    const max = document.documentElement.scrollHeight - innerHeight
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
  }
  // passive scroll + resize listeners, rAF-throttled, calling write()
}
```

## Mute toggle

Always on screen: bottom right on desktop, top right on phones, above the page chrome.
Equaliser bars animate only while sound is actually playing. States:
`on` (playing), `waiting` (on, but the browser has not let it start yet), `muted`.
Remember the choice in `localStorage`, inside try/catch.

The trap: a page-wide `pointerdown` listener that resumes audio fires before the
toggle's `click`. Without care, the first press on the toggle wakes the audio and then
immediately mutes it. Record `wasPlaying` in the toggle's own `onPointerDown` (React's
listener runs before the window's) and only toggle if sound was already playing.
