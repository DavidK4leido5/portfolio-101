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

/** Everything the one-shot reveal drives. `data-wipe` is the image variant. */
export const REVEAL_SELECTOR = '[data-reveal],[data-wipe]'

/**
 * A wipe cannot watch for itself.
 *
 * The image variant hides by clipping to `inset(0 0 100% 0)`, and an
 * IntersectionObserver measures the target's visible area — which for
 * something clipped to nothing is nothing, whatever the threshold. Observed
 * directly, a wipe would sit clipped shut forever waiting to be seen.
 *
 * So wipes are not observed at all: they arrive with the nearest `data-reveal`
 * around them, which is the card or avatar the image sits in.
 */
const WIPE = '[data-wipe]'

/**
 * Class on <html> that arms the hidden state in CSS.
 *
 * Nothing is hidden until this lands, which is the whole point: the copy is in
 * the markup, so a slow chunk, a thrown module or a browser with no
 * IntersectionObserver has to leave readable text rather than a blank column.
 * Hiding first and revealing later would make the animation load-bearing.
 */
const ARMED = 'reveal-armed'

/** Delay added per item inside a `[data-reveal-stagger]` container, seconds. */
const STAGGER_STEP = 0.07
/** Ceiling on that delay. Past about here a cascade reads as a page hanging. */
const STAGGER_CAP = 0.45

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Words and the spaces between them, ready to render as spans. */
export function toWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/**
 * Give each item in a stagger container its own slice of the cascade.
 *
 * Only containers whose children arrive together are marked — a tall column of
 * cards already staggers itself, because each one crosses the fold on its own
 * and a delay there just makes it late.
 */
function stampStagger(root: ParentNode) {
  for (const group of root.querySelectorAll('[data-reveal-stagger]')) {
    ;[...group.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)].forEach((el, i) => {
      // An explicit delay in the markup wins, and so does an outer container's
      if (el.style.getPropertyValue('--reveal-delay')) return
      const delay = Math.min(i * STAGGER_STEP, STAGGER_CAP)
      el.style.setProperty('--reveal-delay', `${delay.toFixed(3)}s`)
    })
  }
}

/**
 * One-shot reveal for anything tagged `data-reveal`. Returns a cleanup fn.
 *
 * The set of targets is taken once, at call time. Anything tagged that mounts
 * later is never observed and so never arrives — so do not put these on
 * conditionally rendered nodes, only on markup that is there from the start.
 */
export function observeReveal(root: ParentNode, selector = '[data-reveal]'): () => void {
  const targets = [...root.querySelectorAll(selector)]
  const wipes = [...root.querySelectorAll(WIPE)]

  // No observer, or motion turned down: show everything and never arm, so the
  // hidden state in CSS is not reachable at all
  if (typeof IntersectionObserver === 'undefined' || prefersReduced()) {
    for (const el of [...targets, ...wipes]) el.classList.add('is-in')
    return () => {}
  }

  stampStagger(root)
  document.documentElement.classList.add(ARMED)

  // A wipe with nothing observed around it has no way to arrive, so it opens
  // now rather than staying clipped shut
  for (const el of wipes) {
    if (!el.closest(selector)) el.classList.add('is-in')
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        for (const wipe of entry.target.querySelectorAll(WIPE)) {
          wipe.classList.add('is-in')
        }
        io.unobserve(entry.target)
      }
    },
    // Hold off until the element is properly on screen rather than clipping the
    // bottom edge, which is where a reveal reads as a glitch
    { rootMargin: '0px 0px -10% 0px', threshold: 0.2 },
  )

  for (const el of targets) io.observe(el)
  return () => io.disconnect()
}
