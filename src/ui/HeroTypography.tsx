import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'

function ChromatLine({ text, subtle = false }: { text: string; subtle?: boolean }) {
  return (
    <span className={`chromat${subtle ? ' chromat--subtle' : ''}`} data-testid="chromat-line">
      <span className="chromat-base">{text}</span>
      <span className="chromat-r" aria-hidden>{text}</span>
      <span className="chromat-b" aria-hidden>{text}</span>
    </span>
  )
}

function HeroStack({
  topRef,
  bottomRef,
  subtle = false,
}: {
  topRef?: RefObject<HTMLParagraphElement | null>
  bottomRef?: RefObject<HTMLParagraphElement | null>
  subtle?: boolean
}) {
  return (
    <div className="hero-stack">
      <p className="hero-line" ref={topRef}>
        <ChromatLine text={profile.hero.top} subtle={subtle} />
      </p>
      <p className="hero-line" ref={bottomRef}>
        <ChromatLine text={profile.hero.bottom} subtle={subtle} />
      </p>
    </div>
  )
}

export function HeroTypography() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const phase = useSceneStore((s) => s.phase)
  const tier = useSceneStore((s) => s.qualityTier)
  const wrapRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLParagraphElement>(null)
  const bottomRef = useRef<HTMLParagraphElement>(null)
  const introRan = useRef(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const stack = stackRef.current
    const top = topRef.current
    const bottom = bottomRef.current
    if (!wrap || !stack || !top || !bottom) return

    if (loadPhase === 'loading') {
      introRan.current = false
      gsap.set(wrap, { autoAlpha: 0 })
      return
    }

    if (loadPhase === 'intro' && !introRan.current) {
      introRan.current = true
      gsap.set(wrap, { autoAlpha: 1 })
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      const dur = reduced ? 0.55 : 1.45
      const tl = gsap.timeline()
      tl.fromTo(
        stack,
        { scale: reduced ? 1 : 1.12, autoAlpha: 0, filter: reduced ? 'none' : 'blur(14px)' },
        { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: dur, ease: 'power3.out' },
        0.12,
      )
      tl.fromTo(
        top,
        { y: reduced ? 0 : 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: dur * 0.85, ease: 'power3.out' },
        0.18,
      )
      tl.fromTo(
        bottom,
        { y: reduced ? 0 : -18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: dur * 0.85, ease: 'power3.out' },
        0.28,
      )
      if (!reduced) {
        tl.fromTo(
          stack,
          { '--chroma-offset': '16px' },
          { '--chroma-offset': '4px', duration: 2, ease: 'power2.inOut' },
          0.05,
        )
      }
      return () => { tl.kill() }
    }
  }, [loadPhase])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || loadPhase !== 'ready') return
    gsap.to(wrap, {
      autoAlpha: phase === 'idle' ? 1 : 0,
      duration: 0.45,
      ease: 'power2.out',
    })
  }, [phase, loadPhase])

  if (loadPhase === 'loading') return null

  return (
    <div
      className="hero-type"
      ref={wrapRef}
      data-quality-tier={tier}
      data-load-phase={loadPhase}
      data-testid="hero-typography"
      aria-hidden={phase !== 'idle'}
    >
      <div className="hero-depth hero-depth--back">
        <HeroStack subtle />
      </div>
      <div className="hero-depth hero-depth--front" ref={stackRef}>
        <HeroStack topRef={topRef} bottomRef={bottomRef} />
      </div>
    </div>
  )
}
