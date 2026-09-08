import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSceneStore } from '../store/sceneStore'
import { TRACE_COUNT, traceStages } from '../content/requestTrace'
import { SectionsSpine } from '../ui/SectionsSpine'

gsap.registerPlugin(ScrollTrigger)

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * hero → request trace → sections.
 *
 * The trace starts one viewport in, so the first scroll off the hero already
 * opens the mask and sends the camera to the first stage. The sections below
 * are opaque and rise over the brain stage, which is where `useSceneVisibility`
 * shuts the canvas down.
 */
export function ScrollDriver() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const trace = root.querySelector<HTMLElement>('[data-testid="trace-track"]')
    const spine = root.querySelector<HTMLElement>('[data-testid="sections-spine"]')
    if (!trace || !spine) return

    const store = () => useSceneStore.getState()
    const reduced = prefersReduced()
    const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY

    /** Zone boundaries in document space — cached so scrolling forces no layout. */
    let traceTop = 0
    let spineTop = 0

    const cacheZones = () => {
      traceTop = docTop(trace)
      spineTop = docTop(spine)
    }

    /**
     * The spine is opaque, so it only takes the zone once it covers the screen
     * outright: hand over any earlier and the last stage's callout is yanked
     * away while a strip of it is still showing above the first section.
     */
    const syncZone = () => {
      const y = window.scrollY
      if (y >= spineTop) store().setScrollZone('sections')
      else if (y + innerHeight * 0.15 >= traceTop) store().setScrollZone('trace')
      else store().setScrollZone('hero')
    }

    cacheZones()
    syncZone()

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => { ticking = false; syncZone() })
    }
    addEventListener('scroll', onScroll, { passive: true })

    const ctx = gsap.context(() => {
      // Hero exit — the trace rising over the hero opens the mask and takes the
      // FULL / STACK mark with it
      ScrollTrigger.create({
        trigger: trace,
        start: 'top bottom',
        end: 'top top',
        scrub: reduced ? true : 0.4,
        onUpdate: (self) => store().setHeroExitProgress(self.progress),
        onLeave: () => store().setHeroExitProgress(1),
        onLeaveBack: () => store().setHeroExitProgress(0),
      })

      ScrollTrigger.create({
        trigger: trace,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reduced ? true : 0.45,
        onUpdate: (self) => {
          const p = self.progress
          store().setTraceProgress(p)
          // Continuous index for the HUD; the callouts scrub off progress
          const t = p * TRACE_COUNT
          if (t < 0.35) store().setTraceStage(null)
          else store().setTraceStage(Math.min(TRACE_COUNT - 1, Math.max(0, Math.round(t - 1))))
        },
      })
    }, root)

    let resizeTo: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(resizeTo)
      resizeTo = setTimeout(() => {
        cacheZones()
        syncZone()
        ScrollTrigger.refresh()
      }, 150)
    }
    addEventListener('resize', onResize)
    requestAnimationFrame(() => {
      cacheZones()
      syncZone()
      ScrollTrigger.refresh()
    })

    /*
     * A window resize is not the only thing that moves these boundaries: the
     * section titles are fitted once the display face lands, and the
     * screenshots below are lazy. A stale boundary leaves the zone reporting
     * `trace` while a section is actually on screen, which puts the trace's
     * callouts over content they should be behind.
     */
    let layoutTo: ReturnType<typeof setTimeout> | undefined
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          clearTimeout(layoutTo)
          layoutTo = setTimeout(() => { cacheZones(); syncZone() }, 80)
        })
      : null
    ro?.observe(document.body)

    return () => {
      clearTimeout(resizeTo)
      clearTimeout(layoutTo)
      ro?.disconnect()
      removeEventListener('resize', onResize)
      removeEventListener('scroll', onScroll)
      ctx.revert()
    }
  }, [])

  return (
    <div className="scroll-track" ref={rootRef} data-testid="scroll-track">
      <div className="hero-spacer" data-testid="hero-spacer" aria-hidden />
      <div className="trace-track" data-testid="trace-track">
        {traceStages.map((beat) => (
          <div key={beat.title} className="trace-track__beat" aria-hidden />
        ))}
      </div>
      {/* First thing to paint over the brain — the canvas stands down from here */}
      <div className="scene-cover-sentinel" data-testid="scene-cover-sentinel" aria-hidden />
      <SectionsSpine />
      <footer className="scroll-end" data-testid="scroll-end">
        <p>Scroll up to return to the brain</p>
      </footer>
    </div>
  )
}
