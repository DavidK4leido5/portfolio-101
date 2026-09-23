import { useEffect, useRef } from 'react'

/** Anything the ring should open up for. */
const INTERACTIVE = 'a, button, [role="button"], label, summary, input[type="range"], [data-cursor]'
/** Fields keep the native caret; a custom cursor over a text box hides where you type. */
const TEXT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]'

/** The word shown inside the ring, first match wins. `data-cursor` overrides it. */
const LABELS: [string, string][] = [
  ['.project-index__link', 'View'],
  ['.project-beat__link', 'Visit'],
  ['a[href^="mailto:"]', 'Email'],
  ['a[target="_blank"]', 'Open'],
]

/**
 * The accent under the pointer, from the most specific scope that sets one.
 * Checked by scope rather than by reading the nearest variable, because
 * `--project-accent` is a registered property: it has an initial value
 * everywhere, so reading it outside the timeline would always come back set.
 */
function accentAt(el: Element): string {
  const scoped: [string, string][] = [
    ['.project-index__row', '--row-accent'],
    ['.project-journey', '--project-accent'],
    ['.trace-beat', '--stage-color'],
    ['.spine-section', '--section-color'],
  ]
  for (const [sel, prop] of scoped) {
    const host = el.closest(sel)
    if (host) {
      const v = getComputedStyle(host).getPropertyValue(prop).trim()
      if (v) return v
    }
  }
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
}

/**
 * A dot that sits exactly on the pointer and a ring that trails it.
 *
 * The ring opens up over anything clickable, carries a one-word label on the
 * links that go somewhere specific, squeezes on press, and takes the accent of
 * whatever it is over. Only mouse and trackpad get it: on touch there is no
 * pointer to replace, so nothing mounts and the native behaviour is untouched.
 *
 * Per frame it writes two transforms and nothing else. The ring's lag is a
 * frame-rate independent ease, and the loop stops the moment it settles, so a
 * still pointer costs nothing. State changes (hover, press, label, colour)
 * come from pointer events and land as attributes the CSS transitions.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    if (!fine.matches) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const dot = root.querySelector<HTMLElement>('.cursor__dot')!
    const ring = root.querySelector<HTMLElement>('.cursor__ring')!
    const label = root.querySelector<HTMLElement>('.cursor__label')!
    document.documentElement.classList.add('has-cursor')

    let x = -100
    let y = -100
    let rx = x
    let ry = y
    let raf = 0
    let last = 0
    let over: Element | null = null

    const place = (el: HTMLElement, px: number, py: number) => {
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`
    }

    const loop = (t: number) => {
      // Same feel at 60Hz and 120Hz: the share of the gap closed scales with dt
      const dt = last ? Math.min(64, t - last) : 16.7
      last = t
      const k = reduced ? 1 : 1 - Math.pow(0.78, dt / 16.7)
      rx += (x - rx) * k
      ry += (y - ry) * k
      place(ring, rx, ry)
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.2) raf = requestAnimationFrame(loop)
      else {
        raf = 0
        last = 0
      }
    }

    const setTarget = (el: Element | null) => {
      if (el === over) return
      over = el
      const text = el?.closest(TEXT)
      const hit = text ? null : el?.closest(INTERACTIVE)
      root.dataset.state = text ? 'text' : hit ? 'hover' : 'idle'
      const word = hit
        ? (hit.getAttribute('data-cursor') ?? LABELS.find(([sel]) => hit.matches(sel))?.[1] ?? '')
        : ''
      label.textContent = word
      root.toggleAttribute('data-label', word !== '')
      if (el) root.style.setProperty('--cursor-accent', accentAt(el))
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      place(dot, x, y)
      if (root.dataset.visible !== 'true') {
        // Arrive where the pointer is rather than sliding in from the corner
        rx = x
        ry = y
        place(ring, rx, ry)
        root.dataset.visible = 'true'
      }
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onOver = (e: PointerEvent) => setTarget(e.target as Element)
    const onDown = () => root.toggleAttribute('data-down', true)
    const onUp = () => root.toggleAttribute('data-down', false)
    const onLeave = (e: PointerEvent) => {
      if (!e.relatedTarget) root.dataset.visible = 'false'
    }
    const onBlur = () => { root.dataset.visible = 'false' }

    /*
     * The page scrolls under a still pointer (the timeline changes accent as it
     * does), so re-read what is under it once scrolling settles. One hit test,
     * not one per frame.
     */
    let scrollTo: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(scrollTo)
      scrollTo = setTimeout(() => {
        if (root.dataset.visible !== 'true') return
        over = null
        setTarget(document.elementFromPoint(x, y))
      }, 120)
    }

    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerover', onOver, { passive: true })
    addEventListener('pointerdown', onDown, { passive: true })
    addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('blur', onBlur)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(scrollTo)
      document.documentElement.classList.remove('has-cursor')
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerover', onOver)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerout', onLeave)
      removeEventListener('scroll', onScroll)
      removeEventListener('blur', onBlur)
    }
  }, [])

  return (
    <div className="cursor" ref={rootRef} data-state="idle" data-visible="false" aria-hidden>
      <div className="cursor__ring">
        <span className="cursor__shape" />
        <span className="cursor__label" />
      </div>
      <div className="cursor__dot" />
    </div>
  )
}
