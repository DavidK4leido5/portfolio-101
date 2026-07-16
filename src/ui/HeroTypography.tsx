import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'
import { setHeroTextCallbacks } from '../scene/heroReel'

function ChromatLine({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <span className="chromat" data-testid="chromat-line">
      <span className="chromat-base">{text}</span>
      <span className="chromat-r" aria-hidden>{text}</span>
      <span className="chromat-b" aria-hidden>{text}</span>
    </span>
  )
}

export function HeroTypography() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const phase = useSceneStore((s) => s.phase)
  const tier = useSceneStore((s) => s.qualityTier)
  const wrapRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLParagraphElement>(null)
  const introRan = useRef(false)
  const [line, setLine] = useState(profile.hero.beats[0]?.text ?? '')
  const [beatIndex, setBeatIndex] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const stack = stackRef.current
    const lineEl = lineRef.current
    if (!wrap || !stack || !lineEl) return

    if (loadPhase === 'loading') {
      introRan.current = false
      gsap.set(wrap, { autoAlpha: 0 })
      return
    }

    if (loadPhase === 'intro' && !introRan.current) {
      introRan.current = true
      const first = profile.hero.beats[0]?.text ?? ''
      setLine(first)
      setBeatIndex(0)
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
        lineEl,
        { y: reduced ? 0 : 24, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: dur * 0.85, ease: 'power3.out' },
        0.2,
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

  useEffect(() => {
    if (loadPhase !== 'ready') return

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const { textInSec, textOutSec } = profile.hero

    setHeroTextCallbacks({
      onOut: () => {
        const el = lineRef.current
        if (!el || reduced) return
        gsap.to(el, {
          y: -22,
          autoAlpha: 0,
          filter: 'blur(10px)',
          duration: textOutSec,
          ease: 'power2.in',
        })
      },
      onIn: (text, index) => {
        setLine(text)
        setBeatIndex(index)
        const el = lineRef.current
        if (!el) return
        if (reduced) {
          gsap.set(el, { y: 0, autoAlpha: 1, filter: 'none' })
          return
        }
        gsap.fromTo(
          el,
          { y: 28, autoAlpha: 0, filter: 'blur(12px)' },
          { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: textInSec, ease: 'power3.out' },
        )
      },
    })

    return () => setHeroTextCallbacks({})
  }, [loadPhase])

  if (loadPhase === 'loading') return null

  return (
    <div
      className="hero-type"
      ref={wrapRef}
      data-quality-tier={tier}
      data-load-phase={loadPhase}
      data-hero-active={line}
      data-hero-beat={beatIndex}
      data-hero-first-beat={profile.hero.beats[0]?.text ?? ''}
      data-testid="hero-typography"
      aria-hidden={phase !== 'idle'}
    >
      <div className="hero-depth hero-depth--back">
        <div className="hero-stack hero-stack--single">
          <p className="hero-line hero-line--ghost">
            <ChromatLine text={line} />
          </p>
        </div>
      </div>
      <div className="hero-depth hero-depth--front" ref={stackRef}>
        <div className="hero-stack hero-stack--single">
          <p className="hero-line" ref={lineRef}>
            <ChromatLine text={line} />
          </p>
        </div>
      </div>
    </div>
  )
}
