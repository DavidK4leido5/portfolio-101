import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'
import { audio } from '../audio/engine'

export function LoadingScreen() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const wakeRef = useRef<HTMLButtonElement>(null)
  const [gate, setGate] = useState(false)

  // Once the surface is mapped, offer the way in instead of starting alone
  useEffect(() => {
    if (!sceneReady || navigator.webdriver) return
    const t = setTimeout(() => setGate(true), 700)
    return () => clearTimeout(t)
  }, [sceneReady])

  useEffect(() => {
    if (gate) wakeRef.current?.focus({ preventScroll: true })
  }, [gate])

  /** This click is the gesture that lets sound start, so it plays from here. */
  const enter = (withSound: boolean) => {
    audio.setMuted(!withSound)
    audio.unlock()
    useSceneStore.getState().startIntro()
  }

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
        <p className="loader-kicker">The Adaptive Mind</p>
        <p className="loader-title">
          {profile.hero.beats[0]?.text ?? profile.title}
        </p>
        <div className="loader-bar"><div className="loader-bar-fill" ref={barRef} /></div>
        <p className="loader-meta">
          {gate ? 'Surface mapped' : 'Mapping surface nodes'} <span ref={pctRef}>0%</span>
        </p>

        <div className="loader-gate" data-shown={gate} inert={!gate}>
          <button
            type="button"
            className="loader-wake"
            ref={wakeRef}
            onClick={() => enter(true)}
          >
            Wake the swarm
            <span aria-hidden> →</span>
          </button>
          <p className="loader-note">Sound on. Best with headphones.</p>
          <button type="button" className="loader-silent" onClick={() => enter(false)}>
            Enter without sound
          </button>
        </div>
      </div>
    </div>
  )
}
