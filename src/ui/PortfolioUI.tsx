import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import {
  useSceneStore,
  labelOpacityFromScroll,
  journeyPanelOpacity,
} from '../store/sceneStore'
import { sections, SECTION_IDS, type SectionId } from '../data/sections'
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
  const scrollZone = useSceneStore((s) => s.scrollZone)
  const journeySection = useSceneStore((s) => s.journeySection)
  const journeyProgress = useSceneStore((s) => s.journeyProgress)
  const limits = NODE_LIMITS[tier]
  const setHovered = useSceneStore((s) => s.setHovered)
  const navigateTo = useSceneStore((s) => s.navigateTo)
  const returnHome = useSceneStore((s) => s.returnHome)
  const setNodeCount = useSceneStore((s) => s.setNodeCount)
  const isMobileNav = tier === 'mobile'
  const indicatorsRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const journeyOverlayRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const uiReady = loadPhase === 'ready'
  const inHero = scrollZone === 'hero'
  const inSettle = scrollZone === 'settle'
  const inJourney = scrollZone === 'journey' || scrollZone === 'end'
  const coverProgress = useSceneStore((s) => s.coverProgress)
  const bridgeInProgress = useSceneStore((s) => s.bridgeInProgress)
  const journeyApproachProgress = useSceneStore((s) => s.journeyApproachProgress)
  const hudSector = inJourney ? journeySection : active
  const inClickZone = inHero || inSettle
  const labelAlpha = labelOpacityFromScroll({
    coverProgress,
    bridgeInProgress,
    journeyApproachProgress,
  })
  const labelsLive = inClickZone && labelAlpha > 0.08 && phase === 'idle'

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
    if (!labelsLive) return
    setHovered(id)
    triggerSectorWave(i)
  }, [setHovered, labelsLive])

  const onSectorLeave = useCallback(() => setHovered(null), [setHovered])

  const onNodesChange = useCallback((v: number) => {
    const n = Math.round(v)
    setNodeCount(n)
    animateNodeCount(n)
  }, [setNodeCount])

  const onSectorClick = useCallback((id: SectionId) => {
    if (!labelsLive) return
    navigateTo(id)
  }, [labelsLive, navigateTo])

  useEffect(() => {
    if (!isMobileNav) return
    sections.forEach((_, i) => { indicatorEls[i] = null })
  }, [isMobileNav])

  // Sector indicators / mobile nav — scrub with cover / bridge / journey approach
  useEffect(() => {
    const el = isMobileNav ? navRef.current : indicatorsRef.current
    if (!el) return
    if (!uiReady) {
      gsap.set(el, { autoAlpha: 0 })
      return
    }
    if (phase !== 'idle') {
      gsap.to(el, { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in', overwrite: 'auto' })
      return
    }
    const alpha = labelOpacityFromScroll({
      coverProgress,
      bridgeInProgress,
      journeyApproachProgress,
    })
    const p = 1 - alpha
    gsap.set(el, {
      autoAlpha: alpha,
      y: -18 * p,
      visibility: alpha < 0.03 ? 'hidden' : 'visible',
    })
  }, [phase, uiReady, isMobileNav, coverProgress, bridgeInProgress, journeyApproachProgress])

  // Journey panels — continuous triangular crossfade from journeyProgress
  useEffect(() => {
    const root = journeyOverlayRef.current
    if (!root) return
    const n = SECTION_IDS.length
    const panels = root.querySelectorAll<HTMLElement>('[data-journey-panel]')
    panels.forEach((panel) => {
      const id = panel.dataset.journeyPanel as SectionId
      const idx = SECTION_IDS.indexOf(id)
      const alpha = inJourney ? journeyPanelOpacity(journeyProgress, idx, n) : 0
      const p = 1 - alpha
      const interactive = alpha > 0.45
      gsap.set(panel, {
        autoAlpha: alpha,
        y: prefersReduced() ? 0 : 14 * p,
        visibility: alpha < 0.04 ? 'hidden' : 'visible',
        pointerEvents: interactive ? 'auto' : 'none',
      })
      panel.toggleAttribute('inert', !interactive)
      panel.setAttribute('aria-hidden', interactive ? 'false' : 'true')
    })
  }, [inJourney, journeyProgress])

  const clickPanelId = !inJourney && phase === 'arrived' && inClickZone ? active : null
  const showClickPanel = !!clickPanelId

  // Click-mode panel enter only (journey uses scrubbed stack)
  useEffect(() => {
    if (!showClickPanel || !clickPanelId) return
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
  }, [showClickPanel, clickPanelId])

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

  // Dismiss stuck overlay if scroll leaves clickable zones
  useEffect(() => {
    if (inClickZone) return
    const { phase: p, returnHome: rh } = useSceneStore.getState()
    if (p === 'arrived') rh()
  }, [inClickZone])

  return (
    <div
      className="ui"
      data-phase={phase}
      data-load-phase={loadPhase}
      data-quality-tier={tier}
      data-scroll-zone={scrollZone}
    >
      {isMobileNav ? (
        <div className="hud hud-profile-group" data-testid="hud-profile-group">
          {profile.name}
          <span className="hud-profile-title">{profile.title}</span>
          <div className="hud-profile-meta">
            STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b>
            {' · '}
            NODES <b>{nodeCount}</b>
            {' · '}
            SECTOR <b>{hudSector ?? 'CORE'}</b>
          </div>
        </div>
      ) : (
        <>
          <div className="hud tl">{profile.name}<br /><span>{profile.title}</span></div>
          <div className="hud tr">STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b><br />NODES <b>{nodeCount}</b><br />SECTOR <b>{hudSector ?? 'CORE'}</b></div>
        </>
      )}
      <div className="hud bl">NEURAL.PORTFOLIO <b>v1.0</b><br />{profile.tagline}</div>
      <div className="hud br">SYS.COLOR<span className="swatch" /><br />LINK <b>{inJourney ? 'JOURNEY' : phase.toUpperCase()}</b></div>

      {uiReady && inHero && (
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
          aria-hidden={!uiReady || !labelsLive}
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
              onClick={() => onSectorClick(s.id)}
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
          data-sectors-ready="true"
          aria-label="Portfolio sections"
          aria-hidden={!labelsLive}
        >
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-section={s.id}
              className="sector-nav-btn"
              style={{ '--section-color': s.color } as React.CSSProperties}
              aria-current={active === s.id ? 'page' : undefined}
              tabIndex={labelsLive ? 0 : -1}
              onFocus={() => onSectorEnter(s.id, i)}
              onBlur={onSectorLeave}
              onClick={() => onSectorClick(s.id)}
            >
              <span className="dot" aria-hidden />
              <span className="label">{s.label}</span>
            </button>
          ))}
        </nav>
      )}

      {inJourney && (
        <nav className="journey-progress" data-testid="journey-progress" aria-label="Sector journey progress">
          {SECTION_IDS.map((id, i) => {
            const op = journeyPanelOpacity(journeyProgress, i, SECTION_IDS.length)
            return (
              <span
                key={id}
                className={`journey-dot${op > 0.55 ? ' is-active' : ''}`}
                data-section={id}
                style={{ opacity: 0.22 + op * 0.78 }}
                aria-current={op > 0.55 ? 'step' : undefined}
              />
            )
          })}
        </nav>
      )}

      {inJourney && (
        <div
          className="overlay overlay--journey"
          ref={journeyOverlayRef}
          data-testid="journey-overlay"
        >
          {SECTION_IDS.map((id, i) => {
            // Mount at most ~2 neighboring trees during crossfade
            const live = journeyPanelOpacity(journeyProgress, i, SECTION_IDS.length) > 0.02
            return (
              <div
                key={id}
                className={`panel panel--journey${id === 'skills' ? ' panel--skills' : ''}${id === 'projects' ? ' panel--projects' : ''}`}
                data-journey-panel={id}
                style={{ visibility: 'hidden', opacity: 0 }}
                inert
                aria-hidden
              >
                {live && (
                  <>
                    <h2 data-testid={id === journeySection ? 'overlay-title' : undefined}>
                      {sectionCopy[id].headline}
                    </h2>
                    <p className="intro">{sectionCopy[id].intro}</p>
                    <SectionContent id={id} />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showClickPanel && clickPanelId && (
        <div className="overlay" ref={overlayRef}>
          <div className={`panel${clickPanelId === 'skills' ? ' panel--skills' : ''}${clickPanelId === 'projects' ? ' panel--projects' : ''}`}>
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
            <h2 data-testid="overlay-title">{sectionCopy[clickPanelId].headline}</h2>
            <p className="intro">{sectionCopy[clickPanelId].intro}</p>
            <SectionContent id={clickPanelId} />
          </div>
        </div>
      )}
    </div>
  )
}
