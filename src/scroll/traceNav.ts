export const TRACE_TRACK_SELECTOR = '[data-testid="trace-track"]'

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Document scroll offset for a point in the trace, given as 0–1 progress.
 *
 * Mirrors the ScrollTrigger that drives `traceProgress`: it runs the track from
 * `top top` to `bottom bottom`, so progress spans the track's height minus one
 * viewport.
 */
export function scrollOffsetForProgress(progress: number): number | null {
  const track = document.querySelector<HTMLElement>(TRACE_TRACK_SELECTOR)
  if (!track) return null
  const rect = track.getBoundingClientRect()
  const span = Math.max(1, rect.height - innerHeight)
  return rect.top + scrollY + span * Math.min(1, Math.max(0, progress))
}

export function scrollToBeat(progress: number) {
  const top = scrollOffsetForProgress(progress)
  if (top == null) return
  scrollTo({ top, behavior: prefersReduced() ? 'auto' : 'smooth' })
}

/**
 * Scroll to a document offset. Far jumps cut to a viewport short of the target
 * and glide the rest: smooth-scrolling the whole twenty-viewport project
 * timeline to reach the section after it takes seconds and plays every beat of
 * it on the way past.
 */
export function glideTo(top: number) {
  if (prefersReduced()) {
    scrollTo({ top, behavior: 'auto' })
    return
  }
  const far = innerHeight * 3
  if (Math.abs(top - scrollY) > far) {
    scrollTo({ top: top - Math.sign(top - scrollY) * innerHeight, behavior: 'auto' })
  }
  scrollTo({ top, behavior: 'smooth' })
}

/** Jump to a portfolio section further down the page. */
export function scrollToSection(id: string) {
  const el = document.getElementById(`section-${id}`)
  if (!el) return
  glideTo(el.getBoundingClientRect().top + scrollY)
}
