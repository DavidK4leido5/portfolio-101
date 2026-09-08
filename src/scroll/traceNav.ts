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

/** Jump to a portfolio section further down the page. */
export function scrollToSection(id: string) {
  const el = document.getElementById(`section-${id}`)
  if (!el) return
  scrollTo({
    top: el.getBoundingClientRect().top + scrollY,
    behavior: prefersReduced() ? 'auto' : 'smooth',
  })
}
