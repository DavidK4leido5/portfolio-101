import { useCallback, useEffect, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { traceStages } from '../content/requestTrace'
import { NODE_LIMITS } from '../lib/nodes'
import { animateNodeCount } from '../scene/nodeAnimator'
import { scrollToSection } from '../scroll/traceNav'
import { profile } from '../content/portfolio'
import { SiteBrand } from './SiteBrand'
import { RequestTrace } from './RequestTrace'

/** Whichever section currently owns the upper third of the viewport. */
function useCurrentSection(active: boolean) {
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    if (!active || typeof IntersectionObserver === 'undefined') return
    const targets = SECTION_IDS.map((id) => document.getElementById(`section-${id}`)).filter(
      (el): el is HTMLElement => !!el,
    )
    if (targets.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.getAttribute('data-section'))
        }
      },
      // A band across the upper third, so the section whose heading you are
      // reading is the one marked, not whichever happens to be tallest
      { rootMargin: '-20% 0px -66% 0px', threshold: 0 },
    )
    for (const el of targets) io.observe(el)
    return () => io.disconnect()
  }, [active])

  return current
}

/**
 * Everything fixed over the brain stage: the readouts, the density slider, the
 * section nav, and the request trace's own callouts. The portfolio sections
 * themselves live in the scroll track, not here.
 */
export function PortfolioUI() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const tier = useSceneStore((s) => s.qualityTier)
  const nodeCount = useSceneStore((s) => s.nodeCount)
  const scrollZone = useSceneStore((s) => s.scrollZone)
  const traceStage = useSceneStore((s) => s.traceStage)
  const setNodeCount = useSceneStore((s) => s.setNodeCount)
  const limits = NODE_LIMITS[tier]
  const uiReady = loadPhase === 'ready'
  const inHero = scrollZone === 'hero'
  const inTrace = scrollZone === 'trace'
  const isMobile = tier === 'mobile'
  const currentSection = useCurrentSection(scrollZone === 'sections')

  const onNodesChange = useCallback((v: number) => {
    const n = Math.round(v)
    setNodeCount(n)
    animateNodeCount(n)
  }, [setNodeCount])

  const stageLabel = inTrace && traceStage != null ? traceStages[traceStage].title : null

  return (
    <>
    <div
      className="ui"
      data-load-phase={loadPhase}
      data-quality-tier={tier}
      data-scroll-zone={scrollZone}
    >
      {isMobile ? (
        <div className="hud hud-profile-group" data-testid="hud-profile-group">
          <SiteBrand />
          <div className="hud-profile-meta">
            STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b>
            {' · '}
            NODES <b>{nodeCount}</b>
            {' · '}
            LAYER <b>{stageLabel ?? 'CORE'}</b>
          </div>
        </div>
      ) : (
        <>
          <div className="hud tl">
            <SiteBrand />
          </div>
          <div className="hud tr">
            STATUS <b>{uiReady ? 'ONLINE' : 'BOOT'}</b><br />
            NODES <b>{nodeCount}</b><br />
            LAYER <b>{stageLabel ?? 'CORE'}</b>
          </div>
        </>
      )}

      <div className="hud bl">
        THE ADAPTIVE MIND <b>v1.0</b><br />{profile.tagline}
      </div>

      {uiReady && inHero && !isMobile && (
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

      <RequestTrace />
    </div>

    {/*
      Outside `.ui` on purpose. This is the one fixed thing that has to paint
      over the sections, and `.ui` is a stacking context — lifting the whole
      layer above them meant a stale scroll zone could leave the trace's
      callouts sitting on top of a section instead of harmlessly behind it.
    */}
    <nav className="section-nav" data-testid="section-nav" aria-label="Portfolio sections">
      {SECTION_IDS.map((id, i) => (
        <button
          key={id}
          type="button"
          className={`section-nav__item${currentSection === id ? ' is-current' : ''}`}
          data-section={id}
          style={{ '--section-color': sections[i].color } as React.CSSProperties}
          aria-current={currentSection === id ? 'true' : undefined}
          onClick={() => scrollToSection(id)}
        >
          <span className="section-nav__num">{String(i + 1).padStart(2, '0')}</span>
          <span className="section-nav__label">{sections[i].label}</span>
        </button>
      ))}
    </nav>
    </>
  )
}
