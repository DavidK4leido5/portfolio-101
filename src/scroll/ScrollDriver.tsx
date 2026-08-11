import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, type SectionId } from '../data/sections'
import { CoverSection } from '../ui/CoverSection'

gsap.registerPlugin(ScrollTrigger)

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const PEAK_Y = -12
const PEAK_SCALE = 0.94

/**
 * hero → cover (parallax) → settle (1vh home) → journey.
 * Parallax is applied imperatively from scroll progress (no scrubbed timeline —
 * scrubbed timelines were freezing mid-scroll then snapping on stop).
 */
export function ScrollDriver() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hero = root.querySelector<HTMLElement>('[data-testid="hero-spacer"]')
    const cover = root.querySelector<HTMLElement>('[data-testid="cover-section"]')
    const settle = root.querySelector<HTMLElement>('[data-testid="settle-bridge"]')
    const journey = root.querySelector<HTMLElement>('[data-testid="journey-track"]')
    const parallax = document.querySelector<HTMLElement>('[data-testid="app-scene-parallax"]')
    if (!hero || !cover || !settle || !journey || !parallax) return

    const store = () => useSceneStore.getState()
    const reduced = prefersReduced()

    const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY

    /** Scroll px segment lengths — cached so scroll handler never forces layout. */
    let rise = Math.max(1, innerHeight)
    let hold = 1
    let restore = Math.max(1, innerHeight)
    let rangeStart = 0
    let rangeEnd = 1

    const cacheParallaxRange = () => {
      rise = Math.max(1, innerHeight)
      restore = Math.max(1, innerHeight)
      hold = Math.max(1, docTop(settle) - innerHeight - docTop(cover))
      rangeStart = docTop(cover) - innerHeight
      rangeEnd = docTop(settle)
    }

    /** Map 0–1 cover→settle progress → yPercent / scale (rise → hold → restore). */
    const applyParallax = (progress: number) => {
      const total = rise + hold + restore
      const d = Math.min(1, Math.max(0, progress)) * total
      let t: number
      if (d <= rise) {
        t = d / rise
        gsap.set(parallax, {
          yPercent: PEAK_Y * t,
          scale: 1 + (PEAK_SCALE - 1) * t,
          force3D: true,
        })
        return
      }
      if (d <= rise + hold) {
        gsap.set(parallax, { yPercent: PEAK_Y, scale: PEAK_SCALE, force3D: true })
        return
      }
      t = (d - rise - hold) / restore
      gsap.set(parallax, {
        yPercent: PEAK_Y * (1 - t),
        scale: PEAK_SCALE + (1 - PEAK_SCALE) * t,
        force3D: true,
      })
    }

    const syncZone = () => {
      const vh = innerHeight
      const coverTop = cover.getBoundingClientRect().top
      const settleTop = settle.getBoundingClientRect().top
      const journeyTop = journey.getBoundingClientRect().top
      if (journeyTop <= vh * 0.15) {
        const journeyBottom = journey.getBoundingClientRect().bottom
        store().setScrollZone(journeyBottom <= vh * 0.85 ? 'end' : 'journey')
      } else if (settleTop <= vh * 0.15) {
        store().setScrollZone('settle')
      } else if (coverTop <= vh * 0.9) {
        store().setScrollZone('cover')
      } else {
        store().setScrollZone('hero')
      }
    }

    gsap.set(parallax, { yPercent: 0, scale: 1, force3D: true, transformOrigin: '50% 50%' })
    cacheParallaxRange()

    /**
     * Native scroll → rAF → gsap.set.
     * Avoids ScrollTrigger scrub/ticker, which was freezing mid-scroll under
     * React/WebGL load then snapping when the main thread caught up on stop.
     */
    let parallaxTick = false
    const parallaxFromScroll = () => {
      const span = Math.max(1, rangeEnd - rangeStart)
      applyParallax((window.scrollY - rangeStart) / span)
    }
    const onScrollParallax = () => {
      if (parallaxTick) return
      parallaxTick = true
      requestAnimationFrame(() => {
        parallaxTick = false
        parallaxFromScroll()
      })
    }
    addEventListener('scroll', onScrollParallax, { passive: true })
    parallaxFromScroll()

    const ctx = gsap.context(() => {
      // Cover progress (hero text fade out) — scroll-linked
      ScrollTrigger.create({
        trigger: cover,
        start: 'top bottom',
        end: 'top top',
        scrub: reduced ? true : 0.5,
        onUpdate: (self) => {
          store().setCoverProgress(self.progress)
          if (self.progress > 0.08 && store().scrollZone === 'hero') {
            store().setScrollZone('cover')
          }
        },
        onLeave: () => {
          store().setCoverProgress(1)
          store().setScrollZone('cover')
        },
        onEnterBack: () => store().setScrollZone('cover'),
        onLeaveBack: () => {
          store().setCoverProgress(0)
          store().setScrollZone('hero')
        },
      })

      // Bridge IN — settle rises (journey entry; labels stay off after cover)
      ScrollTrigger.create({
        trigger: settle,
        start: 'top bottom',
        end: 'top top',
        scrub: reduced ? true : 0.5,
        onUpdate: (self) => store().setBridgeInProgress(self.progress),
        onLeave: () => store().setBridgeInProgress(1),
        onLeaveBack: () => store().setBridgeInProgress(0),
      })

      // Journey approaches
      ScrollTrigger.create({
        trigger: journey,
        start: 'top bottom',
        end: 'top top',
        scrub: reduced ? true : 0.5,
        onUpdate: (self) => store().setJourneyApproachProgress(self.progress),
        onLeave: () => store().setJourneyApproachProgress(1),
        onLeaveBack: () => store().setJourneyApproachProgress(0),
      })

      ScrollTrigger.create({
        trigger: settle,
        start: 'top top',
        end: 'bottom top',
        scrub: reduced ? true : 0.35,
        onEnter: () => store().setScrollZone('settle'),
        onEnterBack: () => store().setScrollZone('settle'),
        onLeaveBack: () => store().setScrollZone('cover'),
        onUpdate: (self) => store().setSettleProgress(self.progress),
        onLeave: () => store().setSettleProgress(1),
      })

      const sectionCount = SECTION_IDS.length
      ScrollTrigger.create({
        trigger: journey,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reduced ? true : 0.45,
        onEnter: () => store().setScrollZone('journey'),
        onEnterBack: () => store().setScrollZone('journey'),
        onLeave: () => store().setScrollZone('end'),
        onLeaveBack: () => store().setScrollZone('settle'),
        onUpdate: (self) => {
          const p = self.progress
          store().setJourneyProgress(p)
          // Continuous index for HUD; panels scrub via progress directly
          const t = p * sectionCount
          if (t < 0.35) {
            store().setJourneySection(null)
          } else {
            const idx = Math.min(sectionCount - 1, Math.max(0, Math.round(t - 1)))
            store().setJourneySection(SECTION_IDS[idx] as SectionId)
          }
        },
      })

      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        onEnter: () => store().setScrollZone('hero'),
        onEnterBack: () => store().setScrollZone('hero'),
      })

      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: () => syncZone(),
      })

      syncZone()
    }, root)

    let resizeTo: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(resizeTo)
      resizeTo = setTimeout(() => {
        cacheParallaxRange()
        parallaxFromScroll()
        ScrollTrigger.refresh()
      }, 150)
    }
    addEventListener('resize', onResize)
    requestAnimationFrame(() => {
      cacheParallaxRange()
      parallaxFromScroll()
      ScrollTrigger.refresh()
    })

    return () => {
      clearTimeout(resizeTo)
      removeEventListener('resize', onResize)
      removeEventListener('scroll', onScrollParallax)
      gsap.killTweensOf(parallax)
      gsap.set(parallax, { clearProps: 'transform' })
      ctx.revert()
    }
  }, [])

  return (
    <div className="scroll-track" ref={rootRef} data-testid="scroll-track">
      <div className="hero-spacer" data-testid="hero-spacer" aria-hidden />
      <CoverSection />
      <div className="settle-bridge" data-testid="settle-bridge" aria-hidden />
      <div className="journey-track" data-testid="journey-track">
        {SECTION_IDS.map((id) => (
          <div key={id} className="journey-beat" data-journey-beat={id} aria-hidden />
        ))}
      </div>
      <footer className="scroll-end" data-testid="scroll-end">
        <p>Scroll up to return · Click sectors at the top</p>
      </footer>
    </div>
  )
}
