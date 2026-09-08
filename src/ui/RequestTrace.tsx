import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useSceneStore, beatOpacity, progressForBeat } from '../store/sceneStore'
import { traceStages, traceOpening, TRACE_COUNT } from '../content/requestTrace'
import { SECTION_IDS, sections } from '../data/sections'
import { triggerSectorWave } from '../scene/nodeAnimator'
import { scrollToBeat } from '../scroll/traceNav'

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const pad = (n: number) => String(n).padStart(2, '0')

const hotspotIndex = (id: (typeof SECTION_IDS)[number]) => SECTION_IDS.indexOf(id)

/** Direction a ghost word drifts in from, per placement. */
const DRIFT: Record<string, [number, number]> = {
  'top-left': [-6, -4],
  'top-right': [6, -4],
  left: [-8, 0],
  right: [8, 0],
  center: [0, 5],
  'bottom-right': [6, 4],
}

/**
 * The hero scroll journey.
 *
 * Two layers per stage, both scrubbed off `traceProgress`:
 *
 *  - a giant low-contrast word that turns up somewhere new each beat and is
 *    allowed to run off the frame, which is what fills the dead space around
 *    the brain and gives the whole thing its poster read;
 *  - a small numbered block in the bottom corner carrying the actual copy.
 *
 * Both are written straight to the DOM from an effect rather than through
 * React state per stage, so a scroll tick costs a handful of `gsap.set` calls
 * instead of a re-render of five copy blocks.
 */
export function RequestTrace() {
  const zone = useSceneStore((s) => s.scrollZone)
  const progress = useSceneStore((s) => s.traceProgress)
  const stage = useSceneStore((s) => s.traceStage)
  const rootRef = useRef<HTMLDivElement>(null)
  const live = zone === 'trace' || zone === 'sections'

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = prefersReduced()

    root.querySelectorAll<HTMLElement>('[data-trace-beat]').forEach((el) => {
      const i = Number(el.dataset.traceBeat)
      const alpha = live ? beatOpacity(progress, i, TRACE_COUNT) : 0
      const away = 1 - alpha
      gsap.set(el, {
        autoAlpha: alpha,
        yPercent: reduced ? 0 : 4 * away,
        visibility: alpha < 0.04 ? 'hidden' : 'visible',
      })
      // An invisible link is a tab trap
      el.toggleAttribute('inert', alpha < 0.5)
      el.setAttribute('aria-hidden', alpha < 0.5 ? 'true' : 'false')
      if (alpha > 0.5) el.classList.add('is-in')
      else if (alpha < 0.05) el.classList.remove('is-in')
    })

    // The ghost arrives from the edge it is placed against, so each stage's
    // word enters the frame from a different direction. `is-in` then runs the
    // per-letter climb in CSS — a transition with a per-letter delay, rather
    // than writing fourteen transforms per stage on every scroll tick.
    root.querySelectorAll<HTMLElement>('[data-trace-ghost]').forEach((el) => {
      const i = Number(el.dataset.traceGhost)
      const alpha = live ? beatOpacity(progress, i, TRACE_COUNT) : 0
      const away = 1 - alpha
      const [dx, dy] = DRIFT[el.dataset.place ?? 'center'] ?? [0, 0]
      gsap.set(el, {
        autoAlpha: alpha,
        xPercent: reduced ? 0 : dx * away,
        yPercent: reduced ? 0 : dy * away,
        visibility: alpha < 0.03 ? 'hidden' : 'visible',
      })
      if (alpha > 0.35) el.classList.add('is-in')
      else if (alpha < 0.05) el.classList.remove('is-in')
    })
  }, [live, progress])

  // Fire the lobe's shockwave as its stage lands, so the brain reacts to the copy
  useEffect(() => {
    if (!live || stage == null) return
    const beat = traceStages[stage]
    if (beat) triggerSectorWave(hotspotIndex(beat.hotspot))
  }, [live, stage])

  if (!live) return null

  return (
    <div className="trace" ref={rootRef} data-testid="request-trace">
      {/* Ghost layer sits behind everything, including the brain's own glow */}
      <div className="trace__ghosts" aria-hidden>
        {traceStages.map((beat, i) => (
          <span
            key={beat.title}
            className="trace-ghost"
            data-trace-ghost={i}
            data-place={beat.place}
            style={{
              visibility: 'hidden',
              opacity: 0,
              '--ghost-scale': beat.ghostScale ?? 1,
              '--stage-color': sections[hotspotIndex(beat.hotspot)].color,
            } as React.CSSProperties}
          >
            {/* Split per letter so the word climbs into frame in sequence.
                The ghost is clamp-sized rather than fitted, so breaking the
                text run here costs no measurement accuracy. */}
            <b>
              {[...beat.title].map((ch, ci) => (
                <span
                  className="trace-ghost__ch"
                  key={`${ci}-${ch}`}
                  style={{ '--ch': ci } as React.CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </b>
          </span>
        ))}
      </div>

      <p className="trace__opening" aria-hidden={stage != null}>
        <span>{traceOpening.kicker}</span>
        <span className="trace__rule" aria-hidden />
        <span>{traceOpening.note}</span>
      </p>

      <div className="trace__blocks">
        {traceStages.map((beat, i) => (
          <article
            key={beat.title}
            className="trace-beat"
            data-trace-beat={i}
            style={{
              visibility: 'hidden',
              opacity: 0,
              '--stage-color': sections[hotspotIndex(beat.hotspot)].color,
            } as React.CSSProperties}
          >
            <p className="trace-beat__index">
              {pad(i + 1)}<i>/ {pad(TRACE_COUNT)}</i>
            </p>
            <h2 className="trace-beat__title" data-testid={i === stage ? 'trace-title' : undefined}>
              {beat.headline}
            </h2>
            <p className="trace-beat__lede">{beat.lede}</p>
            <ul className="trace-beat__stack">
              {beat.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <nav className="trace-rail" data-testid="trace-rail" aria-label="Request stages">
        <span className="trace-rail__cap">Request</span>
        {traceStages.map((beat, i) => {
          const alpha = beatOpacity(progress, i, TRACE_COUNT)
          const current = alpha > 0.55
          return (
            <button
              key={beat.title}
              type="button"
              className={`trace-rail__tick${current ? ' is-active' : ''}`}
              style={{
                opacity: 0.4 + alpha * 0.6,
                '--stage-color': sections[hotspotIndex(beat.hotspot)].color,
              } as React.CSSProperties}
              aria-current={current ? 'step' : undefined}
              aria-label={beat.title}
              title={beat.title}
              onClick={() => scrollToBeat(progressForBeat(i, TRACE_COUNT))}
            />
          )
        })}
        <span className="trace-rail__cap">Response</span>
      </nav>
    </div>
  )
}
