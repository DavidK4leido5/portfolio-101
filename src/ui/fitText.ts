/**
 * Solve a line's font size instead of clamping it.
 *
 * Type metrics scale linearly, so one measurement at a reference size gives the
 * size that fills exactly the width you asked for. A clamp cannot do this: its
 * ceiling is a guess, so the long words overflow and the short ones leave a
 * gutter. Set in `em` terms via letter-spacing so tracking tracks the size.
 */
const REF_PX = 200
/** How far one shrink step backs the size off. */
const STEP = 0.004
/** Steps allowed before giving up — 4 covers a staircase tread comfortably. */
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

  /*
   * Shrink to fit, rather than iterating toward the target.
   *
   * Rendered width is not a smooth function of font size: glyph advances snap
   * to the pixel grid, so the width climbs in steps — for a seven-letter word
   * around 220px, a 0.2px size change moves the measured width by about 7px.
   * A correction loop aiming at the target oscillates across that tread
   * forever and can settle on the wrong side of it.
   *
   * Overflow is the failure that shows: a fitted line overhanging its own
   * container makes every block beside it look wrongly inset. Undershooting by
   * a fraction of a percent is invisible. So step down until it fits and stop.
   */
  for (let step = 0; step < MAX_STEPS; step++) {
    if (el.getBoundingClientRect().width <= targetPx) break
    size *= 1 - STEP
    setSize(size)
  }
}

/**
 * Keep every `[data-fit]` line inside `root` filling its own parent's width.
 * Re-fits on resize and once webfonts land, since a face swapping in after
 * first paint changes every metric.
 */
export function observeFit(root: ParentNode, trackingEm = -0.035): () => void {
  const run = () => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-fit]')) {
      const parent = el.parentElement
      if (!parent) continue
      const style = getComputedStyle(parent)
      const inner =
        parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      fitToWidth(el, inner, trackingEm)
    }
  }

  run()
  document.fonts?.ready.then(run).catch(() => {})

  /*
   * Width is the only input, so a height-only resize is not worth a re-fit —
   * and on mobile those fire constantly as the address bar moves, each one
   * changing every title's size and so the height of the page above the
   * reader.
   */
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
