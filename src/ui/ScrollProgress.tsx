import { useEffect, useRef } from 'react'

/**
 * A hairline across the top of the page that fills as you read.
 *
 * Where the browser supports scroll-driven animations the CSS does all of it
 * on the compositor and this effect never attaches. Elsewhere one passive,
 * rAF-throttled listener writes a single transform.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar || CSS.supports('animation-timeline: scroll()')) return
    let raf = 0
    const write = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - innerHeight
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(write) }
    write()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
    }
  }, [])

  return <div className="scroll-progress" ref={barRef} aria-hidden />
}
