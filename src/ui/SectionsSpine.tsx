import { useEffect, useRef, type ReactNode } from 'react'
import { SECTION_IDS, sections, type SectionId } from '../data/sections'
import { sectionCopy } from '../content/portfolio'
import { observeFit } from './fitText'
import { observeReveal } from './textReveal'
import { AboutPanel } from './AboutPanel'
import { ExperienceList } from './ExperienceList'
import { ProjectsPanel } from './ProjectsPanel'
import { SkillsPanel } from './SkillsPanel'
import { ContactPanel } from './ContactPanel'
import { ClientWorkStrip, TestimonialStrip } from './WorkStrips'
import { ProjectJourney } from './ProjectJourney'
import { projectStories } from '../content/projects'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The Projects title is filled with a client screenshot. Revive's dashboard,
 * because it is light: a dark shot inside the letters sinks into the ground.
 */
const projectsFill = (projectStories.find((s) => s.id === 'revive') ?? projectStories[0])?.shots[0]?.src

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Drift each section's ghost numeral as the section passes, so the giant
 * number travels slower than the page. Only sections on screen are read or
 * written, and each costs one rect read and one transform per frame.
 */
function driftGhosts(root: HTMLElement): () => void {
  if (prefersReduced() || typeof IntersectionObserver === 'undefined') return () => {}
  const visible = new Set<HTMLElement>()
  let raf = 0
  const frame = () => {
    raf = 0
    const vh = innerHeight
    // Reads first, then writes, so the loop never forces a layout
    // The ghost lags the page by 14% from the moment its section enters,
    // capped so it never wanders far from the title it belongs to
    const moves = [...visible].map((section) => {
      const top = section.getBoundingClientRect().top
      const y = Math.min(vh * 0.4, Math.max(0, (vh - top) * 0.14))
      return [section.querySelector<HTMLElement>('.spine-ghost'), y] as const
    })
    for (const [ghost, y] of moves) {
      if (ghost) ghost.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    }
  }
  const onScroll = () => { if (!raf && visible.size) raf = requestAnimationFrame(frame) }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement
      if (e.isIntersecting) visible.add(el)
      else visible.delete(el)
    }
    onScroll()
  })
  root.querySelectorAll<HTMLElement>('.spine-section').forEach((el) => io.observe(el))
  addEventListener('scroll', onScroll, { passive: true })
  return () => {
    io.disconnect()
    cancelAnimationFrame(raf)
    removeEventListener('scroll', onScroll)
  }
}

function SectionBody({ id }: { id: SectionId }) {
  if (id === 'about') return <AboutPanel />
  if (id === 'projects') return <ProjectsPanel />
  if (id === 'experience') return <ExperienceList />
  if (id === 'skills') return <SkillsPanel />
  if (id === 'contact') return <ContactPanel />
  return null
}

/** Full-bleed extras that belong to a section but break out of its column. */
function SectionExtras({ id }: { id: SectionId }): ReactNode {
  if (id === 'projects') {
    return (
      <>
        <ClientWorkStrip />
        <ProjectJourney />
      </>
    )
  }
  if (id === 'experience') return <TestimonialStrip />
  return null
}

/**
 * The portfolio proper, once the brain stage is done.
 *
 * Each sector is a full-bleed section opening on its own index and a display
 * word fitted to the column measure, so the five titles form a rhythm down the
 * page rather than five equal-sized labels. The sections are opaque, which is
 * what lets the brain stage stand down behind them.
 */
export function SectionsSpine() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    /*
     * Reveals first. Arming adds the class the titles' hidden transform hangs
     * off, and `observeFit` measures those titles with getBoundingClientRect —
     * which includes the transform. Fitting before the class lands and
     * re-fitting after it (webfonts do that) would solve two different sizes
     * for the same line.
     */
    const stopReveal = observeReveal(root)
    const stopFit = observeFit(root)
    const stopDrift = driftGhosts(root)
    return () => { stopDrift(); stopFit(); stopReveal() }
  }, [])

  return (
    <main className="spine" ref={rootRef} data-testid="sections-spine">
      {SECTION_IDS.map((id, i) => (
        <section
          key={id}
          id={`section-${id}`}
          className={`spine-section spine-section--${id}`}
          data-section={id}
          style={{ '--section-color': sections[i].color } as React.CSSProperties}
          aria-labelledby={`section-${id}-title`}
        >
          {/* Giant outlined section number, bleeding off the right edge */}
          <span className="spine-ghost" aria-hidden>{pad(i + 1)}</span>

          <div className="spine-inner">
            <header className="spine-head">
              <p className="spine-index" data-reveal>
                {pad(i + 1)}<i>/ {pad(SECTION_IDS.length)}</i>
              </p>
              {/*
                The mask clips; the line inside rides up from under it. Split
                across two elements because a clip-path on the moving element
                would travel with it and never read as a reveal — and because
                the fitted line has to stay one unbroken text run for its
                measurement to hold.
              */}
              <h2 className="spine-title" id={`section-${id}-title`}>
                {/*
                  `data-reveal` goes on the mask, not the line. The line hides
                  itself by translating a full line-height down and out of the
                  clip — put the observer on that and it can never see enough
                  of itself to trigger, so the title stays hidden forever.
                */}
                <span className="spine-title__mask" data-reveal>
                  <span
                    className={`spine-title__line${id === 'projects' && projectsFill ? ' is-filled' : ''}`}
                    data-fit
                    // Inline so the url() resolves against the document, not
                    // the stylesheet in assets/
                    style={
                      id === 'projects' && projectsFill
                        ? { backgroundImage: `url("${projectsFill}")` }
                        : undefined
                    }
                  >
                    {sectionCopy[id].headline}
                    <span className="spine-title__dot" aria-hidden>.</span>
                  </span>
                </span>
              </h2>
              <p
                className="spine-lede"
                data-reveal
                style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}
              >
                {sectionCopy[id].intro}
              </p>
            </header>

            <div className="spine-body">
              <SectionBody id={id} />
            </div>
          </div>

          <SectionExtras id={id} />
        </section>
      ))}
    </main>
  )
}
