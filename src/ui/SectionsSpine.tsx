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

const pad = (n: number) => String(n).padStart(2, '0')

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
    return () => { stopFit(); stopReveal() }
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
                  <span className="spine-title__line" data-fit>
                    {sectionCopy[id].headline}
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
