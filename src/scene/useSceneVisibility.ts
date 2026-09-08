import { useEffect, useState } from 'react'

export type SceneState = 'live' | 'paused' | 'off'

/**
 * Watches a sentinel that sits at the top of the content stacked over the brain
 * stage. Once the page has scrolled past it the brain is fully covered, so:
 *
 *  - `paused` immediately, which stops the render loop but keeps the WebGL
 *    context warm, so scrolling back up resumes in one frame.
 *  - `off` after `unmountDelayMs`, which unmounts the Canvas and releases the
 *    context for good.
 *
 * The delay is the whole point. A hard unmount on exit means recreating the
 * context and re-uploading the point cloud on the way back, which is a visible
 * hitch exactly when the user is moving.
 */
export function useSceneVisibility(selector: string, unmountDelayMs = 2000): SceneState {
  const [state, setState] = useState<SceneState>('live')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const el = document.querySelector(selector)
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const io = new IntersectionObserver(
      ([entry]) => {
        // The root below is everything above the viewport, so intersecting means
        // the sentinel is behind us and the brain is covered.
        clearTimeout(timer)
        if (!entry.isIntersecting) {
          setState('live')
          return
        }
        setState('paused')
        timer = setTimeout(() => setState('off'), unmountDelayMs)
      },
      /*
       * Collapse the root onto the viewport's top edge, then extend it far
       * upward. The sentinel is then intersecting for the whole time it is
       * above us rather than only during the frame it crosses the edge, so a
       * jump (anchor link, reload deep in the page) still reports correctly.
       * A plain "is it visible" observer misses those entirely.
       */
      { rootMargin: '100000px 0px -100% 0px', threshold: 0 },
    )

    io.observe(el)
    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [selector, unmountDelayMs])

  return state
}
