/**
 * Text reveal helpers.
 *
 * Two mechanisms, both taken from the reference sites:
 *
 *  - `toWords` splits a string for rendering as per-word spans, so a scroll
 *    handler can resolve them one after another. The caller renders an
 *    `sr-only` copy of the original alongside, because a sentence chopped into
 *    thirty spans reads badly out loud.
 *  - `observeReveal` is the one-shot version for content that only needs to
 *    arrive once: an IntersectionObserver adds `is-in` and CSS does the rest.
 *
 * The splitting happens in React rather than by mutating the DOM, so there is
 * nothing for React to reconcile away on the next render.
 */

/** Words and the spaces between them, ready to render as spans. */
export function toWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/** One-shot reveal for anything tagged `data-reveal`. Returns a cleanup fn. */
export function observeReveal(root: ParentNode, selector = '[data-reveal]'): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {}

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    // Hold off until the element is properly on screen rather than clipping the
    // bottom edge, which is where a reveal reads as a glitch
    { rootMargin: '0px 0px -10% 0px', threshold: 0.2 },
  )

  for (const el of root.querySelectorAll(selector)) io.observe(el)
  return () => io.disconnect()
}
