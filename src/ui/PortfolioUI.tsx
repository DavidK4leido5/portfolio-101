import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { sections, type SectionId } from '../data/sections'
import { NODE_LIMITS } from '../lib/nodes'
import { indicatorEls } from '../scene/shared'
import { animateNodeCount, triggerSectorWave } from '../scene/nodeAnimator'
import {
  profile, projects, skills, experience, contact, sectionCopy, resolveImage, type ImageSource,
} from '../content/portfolio'

function Img({ image }: { image: ImageSource }) {
  return (
    <img
      src={resolveImage(image)}
      alt={image.alt}
      loading="lazy"
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

function SectionContent({ id }: { id: SectionId }) {
  if (id === 'projects')
    return (
      <>
        {projects.map((p) => (
          <article className="card" key={p.id}>
            <Img image={p.image} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <div className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
            <a href={p.link} target="_blank" rel="noreferrer">View project →</a>
          </article>
        ))}
      </>
    )
  if (id === 'skills')
    return (
      <>
        {skills.map((s) => (
          <article className="card" key={s.id}>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <div className="tags"><span>{s.level}</span></div>
          </article>
        ))}
      </>
    )
  if (id === 'experience')
    return (
      <>
        {experience.map((e) => (
          <article className="card" key={e.id}>
            <h3>{e.role} · {e.company}</h3>
            <p className="period">{e.period}</p>
            <p>{e.description}</p>
          </article>
        ))}
      </>
    )
  if (id === 'about')
    return (
      <article className="card">
        <Img image={profile.about.image} />
        <p>{profile.about.body}</p>
      </article>
    )
  return (
    <article className="card">
      <p>{contact.description}</p>
      <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <div className="tags">
        {contact.links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </div>
    </article>
  )
}

export function PortfolioUI() {
  const phase = useSceneStore((s) => s.phase)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const active = useSceneStore((s) => s.activeSection)
  const tier = useSceneStore((s) => s.qualityTier)
  const nodeCount = useSceneStore((s) => s.nodeCount)
  const limits = NODE_LIMITS[tier]
  const setHovered = useSceneStore((s) => s.setHovered)
  const navigateTo = useSceneStore((s) => s.navigateTo)
  const returnHome = useSceneStore((s) => s.returnHome)
  const setNodeCount = useSceneStore((s) => s.setNodeCount)
  const indicatorsRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const uiReady = loadPhase === 'ready'

  const onNodesChange = useCallback((v: number) => {
    const n = Math.round(v)
    setNodeCount(n)
    animateNodeCount(n)
  }, [setNodeCount])

  useEffect(() => {
    const el = indicatorsRef.current
    if (!el) return
    if (!uiReady) {
      gsap.set(el, { autoAlpha: 0 })
      return
    }
    gsap.to(el, {
      autoAlpha: phase === 'idle' ? 1 : 0,
      duration: 0.45,
      ease: 'power2.out',
    })
  }, [phase, uiReady])

  useEffect(() => {
    if (phase === 'arrived' && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' })
    }
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useSceneStore.getState().phase === 'arrived') returnHome()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [returnHome])

  useEffect(() => {
    const tw = gsap.to('.indicator .dot', { opacity: 0.35, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', stagger: 0.2 })
    return () => { tw.kill() }
  }, [])

  return (
    <div className="ui" data-phase={phase} data-load-phase={loadPhase}>
      <div className="hud tl">{profile.name}<br /><span>{profile.title}</span></div>
      <div className="hud tr">STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b><br />NODES <b>{nodeCount}</b><br />SECTOR <b>{active ?? 'CORE'}</b></div>
      <div className="hud bl">NEURAL.PORTFOLIO <b>v1.0</b><br />{profile.tagline}</div>
      <div className="hud br">SYS.COLOR<span className="swatch" /><br />LINK <b>{phase.toUpperCase()}</b></div>

      {uiReady && (
        <div className="node-control">
          <label htmlFor="node-slider">Neural density</label>
          <input
            id="node-slider"
            data-testid="node-slider"
            type="range"
            min={limits.min}
            max={limits.max}
            step={100}
            value={nodeCount}
            onChange={(e) => onNodesChange(Number(e.target.value))}
          />
          <span className="node-val">{nodeCount.toLocaleString()}</span>
        </div>
      )}

      <div
        className="indicators"
        ref={indicatorsRef}
        data-testid="sector-indicators"
        data-sectors-ready={uiReady ? 'true' : 'false'}
        aria-hidden={!uiReady}
      >
        {sections.map((s, i) => (
          <button
            key={s.id}
            data-section={s.id}
            className="indicator"
            style={{ '--section-color': s.color } as React.CSSProperties}
            ref={(el) => { indicatorEls[i] = el }}
            onMouseEnter={() => { setHovered(s.id); triggerSectorWave(i) }}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => { setHovered(s.id); triggerSectorWave(i) }}
            onBlur={() => setHovered(null)}
            onClick={() => navigateTo(s.id)}
          >
            <span className="dot" /><span className="line" />
            <span className="label-wrap"><span className="label">{s.label}</span></span>
          </button>
        ))}
      </div>

      {phase === 'arrived' && active && (
        <div className="overlay" ref={overlayRef}>
          <div className="panel">
            <h2 data-testid="overlay-title">{sectionCopy[active].headline}</h2>
            <p className="intro">{sectionCopy[active].intro}</p>
            <SectionContent id={active} />
            <button className="back" data-testid="overlay-back" onClick={returnHome}>← Return to core</button>
          </div>
        </div>
      )}
    </div>
  )
}
