import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { sections, type SectionId } from '../data/sections'
import { NODE_LIMITS } from '../lib/nodes'
import { indicatorEls } from '../scene/shared'
import { animateNodeCount, triggerSectorWave } from '../scene/nodeAnimator'
import {
  profile, experience, contact, sectionCopy, resolveImage, type ImageSource,
} from '../content/portfolio'
import { SkillsPanel } from './SkillsPanel'
import { ProjectsPanel } from './ProjectsPanel'

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

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
  if (id === 'projects') return <ProjectsPanel />
  if (id === 'skills') return <SkillsPanel />
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
  const isMobileNav = tier === 'mobile'
  const indicatorsRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const uiReady = loadPhase === 'ready'

  // Play the exit "dissolve" before returnHome unmounts the panel.
  const runClose = useCallback(() => {
    if (closingRef.current) return
    const panel = overlayRef.current?.querySelector('.panel') as HTMLElement | null
    if (!panel || prefersReduced()) { returnHome(); return }
    closingRef.current = true
    const kids = panel.querySelectorAll(':scope > :not(.panel-close)')
    gsap.killTweensOf([panel, ...kids])
    gsap.timeline({ onComplete: () => { closingRef.current = false; returnHome() } })
      .to(kids, { autoAlpha: 0, y: -8, filter: 'blur(8px)', duration: 0.22, stagger: 0.025, ease: 'power2.in' }, 0)
      .to(panel, { autoAlpha: 0, y: -12, scale: 0.985, duration: 0.32, ease: 'power2.in' }, 0.05)
  }, [returnHome])

  const onSectorEnter = useCallback((id: SectionId, i: number) => {
    setHovered(id)
    triggerSectorWave(i)
  }, [setHovered])

  const onSectorLeave = useCallback(() => setHovered(null), [setHovered])

  const onNodesChange = useCallback((v: number) => {
    const n = Math.round(v)
    setNodeCount(n)
    animateNodeCount(n)
  }, [setNodeCount])

  useEffect(() => {
    if (!isMobileNav) return
    sections.forEach((_, i) => { indicatorEls[i] = null })
  }, [isMobileNav])

  useEffect(() => {
    const el = isMobileNav ? navRef.current : indicatorsRef.current
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
  }, [phase, uiReady, isMobileNav])

  useEffect(() => {
    if (phase !== 'arrived') return
    const overlay = overlayRef.current
    const panel = overlay?.querySelector('.panel') as HTMLElement | null
    if (!overlay || !panel) return
    if (prefersReduced()) { gsap.set(panel, { autoAlpha: 1 }); return }
    const ctx = gsap.context(() => {
      const kids = panel.querySelectorAll(':scope > :not(.panel-close)')
      gsap.timeline()
        .fromTo(panel, { autoAlpha: 0, y: 18, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' })
        .fromTo(kids,
          { autoAlpha: 0, y: 14, filter: 'blur(10px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.55, stagger: 0.06, ease: 'power2.out', clearProps: 'filter' },
          0.12)
    }, overlay)
    return () => ctx.revert()
  }, [phase, active])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useSceneStore.getState().phase === 'arrived') runClose()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [runClose])

  useEffect(() => {
    const tw = gsap.to('.indicator .dot, .sector-nav-btn .dot', {
      opacity: 0.35, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', stagger: 0.2,
    })
    return () => { tw.kill() }
  }, [isMobileNav])

  return (
    <div className="ui" data-phase={phase} data-load-phase={loadPhase} data-quality-tier={tier}>
      {isMobileNav ? (
        <div className="hud hud-profile-group" data-testid="hud-profile-group">
          {profile.name}
          <span className="hud-profile-title">{profile.title}</span>
          <div className="hud-profile-meta">
            STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b>
            {' · '}
            NODES <b>{nodeCount}</b>
            {' · '}
            SECTOR <b>{active ?? 'CORE'}</b>
          </div>
        </div>
      ) : (
        <>
          <div className="hud tl">{profile.name}<br /><span>{profile.title}</span></div>
          <div className="hud tr">STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b><br />NODES <b>{nodeCount}</b><br />SECTOR <b>{active ?? 'CORE'}</b></div>
        </>
      )}
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

      {!isMobileNav && (
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
              onMouseEnter={() => onSectorEnter(s.id, i)}
              onMouseLeave={onSectorLeave}
              onFocus={() => onSectorEnter(s.id, i)}
              onBlur={onSectorLeave}
              onClick={() => navigateTo(s.id)}
            >
              <span className="dot" /><span className="line" />
              <span className="label-wrap"><span className="label">{s.label}</span></span>
            </button>
          ))}
        </div>
      )}

      {isMobileNav && uiReady && (
        <nav
          className="sector-nav"
          ref={navRef}
          data-testid="sector-nav"
          data-sectors-ready={uiReady ? 'true' : 'false'}
          aria-label="Portfolio sections"
        >
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-section={s.id}
              className="sector-nav-btn"
              style={{ '--section-color': s.color } as React.CSSProperties}
              aria-current={active === s.id ? 'page' : undefined}
              onFocus={() => onSectorEnter(s.id, i)}
              onBlur={onSectorLeave}
              onClick={() => navigateTo(s.id)}
            >
              <span className="dot" aria-hidden />
              <span className="label">{s.label}</span>
            </button>
          ))}
        </nav>
      )}

      {phase === 'arrived' && active && (
        <div className="overlay" ref={overlayRef}>
          <div className={`panel${active === 'skills' ? ' panel--skills' : ''}${active === 'projects' ? ' panel--projects' : ''}`}>
            <button
              type="button"
              className="panel-close"
              data-testid="overlay-back"
              aria-label="Close and return to core"
              onClick={runClose}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <h2 data-testid="overlay-title">{sectionCopy[active].headline}</h2>
            <p className="intro">{sectionCopy[active].intro}</p>
            <SectionContent id={active} />
          </div>
        </div>
      )}
    </div>
  )
}
