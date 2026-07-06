import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'

export function LoadingScreen() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bar = barRef.current
    const pct = pctRef.current
    if (!bar || !pct) return
    const obj = { v: 0 }
    const tw = gsap.to(obj, {
      v: sceneReady ? 100 : 72,
      duration: sceneReady ? 0.55 : 1.8,
      ease: sceneReady ? 'power2.out' : 'power1.inOut',
      onUpdate: () => {
        bar.style.width = `${obj.v}%`
        pct.textContent = `${Math.round(obj.v)}%`
      },
    })
    return () => { tw.kill() }
  }, [sceneReady])

  useEffect(() => {
    if (loadPhase === 'loading') return
    const el = ref.current
    if (!el) return
    gsap.to(el, {
      autoAlpha: 0,
      duration: 0.85,
      ease: 'power2.inOut',
      onComplete: () => { el.style.visibility = 'hidden' },
    })
  }, [loadPhase])

  return (
    <div className="loader" ref={ref} data-testid="loading-screen" aria-hidden={loadPhase !== 'loading'}>
      <div className="loader-core">
        <p className="loader-kicker">Neural Portfolio</p>
        <h1 className="loader-title">{profile.hero.top}<br />{profile.hero.bottom}</h1>
        <div className="loader-bar"><div className="loader-bar-fill" ref={barRef} /></div>
        <p className="loader-meta">MAPPING SURFACE NODES <span ref={pctRef}>0%</span></p>
      </div>
    </div>
  )
}
