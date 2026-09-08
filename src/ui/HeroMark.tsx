import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'

/** Two of the About stats, set against the mark the way Formix does it. */
const HERO_NOTES = profile.about.numbers.slice(0, 2)

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The hero mark: FULL over STACK, both fitted to the same measure, punched out
 * of a veil laid across the brain stage.
 *
 * The words are not drawn over the brain — they are a hole in a dark sheet on
 * top of it, so the only place the cloud reads at full strength is inside the
 * letterforms. Scrolling flies the frame into the type until the letters are
 * past the edges of it, and only then dissolves the sheet, handing the whole
 * brain to the request trace.
 *
 * Nothing here renders until `loadPhase` reaches `ready`, which is the intro
 * spawn timeline's last frame: the words arrive on a finished cloud, never over
 * one that is still assembling.
 *
 * It has to be inline SVG rather than a `mask-image` data URI: a mask loaded as
 * a URL renders in an isolated context with no access to the document's fonts,
 * so the glyphs come out in a fallback face and the mask is silently the wrong
 * shape.
 */

const LINES = ['FULL', 'STACK'] as const
const SUB = 'ENGINEER'

/**
 * Per tier: the share of the viewport width the block spans, and the chrome to
 * keep clear above and below it. The bottom figure reserves the contact CTA
 * and the density slider, not just the viewport edge — the ENGINEER line used
 * to land straight through the middle of the button.
 *
 * The measure is held in against the brain's own footprint on purpose — run the
 * words edge to edge and the outer letters have no cloud behind them, which is
 * the whole point of cutting them out. Mobile pulls the camera much further
 * back, so the brain covers far less of the frame there and the words have to
 * come in with it. The band is offset to match: it centres the block on the
 * brain, not on the viewport.
 */
const LAYOUT = {
  desktop: { measure: 0.76, top: 96, bottom: 224 },
  tablet: { measure: 0.72, top: 96, bottom: 216 },
  // Mobile's band is deliberately lopsided: the brain sits low in a portrait
  // frame, and the block has to sit on it rather than above it
  mobile: { measure: 0.62, top: 248, bottom: 210 },
} as const
/**
 * Gap between one line's baseline and the next line's cap, as a share of the
 * first cap height. Measured off the caps rather than the em size because the
 * two lines are set at different sizes to fill the same measure, so an em-based
 * leading opens a hole under the larger word.
 */
const LINE_GAP = 0.05
/** Tracking in em. Negative pulls the counters together and shows more cloud. */
const TRACKING = -0.045
/** Size the fit starts from. Metrics scale linearly, so one pass lands it. */
const FIT_REF = 200

/**
 * How far the words are pushed toward the viewer over the hero's exit. The
 * knockout scales with them, so the letters open outward and the frame passes
 * through them rather than the block simply fading away.
 *
 * It has to be large enough that the letterforms leave the frame entirely. At
 * 5x they were still recognisably words when the veil took over, so the move
 * read as a zoom that stopped short and then cut. The camera has to end up
 * inside the type, past it, with nothing left to recognise.
 */
const ZOOM_TO = 26
/**
 * Exponent on the zoom. Above 1 the growth accelerates, which is what makes it
 * read as falling into the words rather than as the words being pushed at you.
 */
const ZOOM_EASE = 1.9
/**
 * Point in the exit at which the veil starts to go. Held opaque almost to the
 * end on purpose: while the sheet is still there the growing letters are doing
 * the revealing, and that reads as one continuous move. Dissolving it early
 * turns the whole thing into a crossfade instead.
 */
const VEIL_HOLD = 0.84
/**
 * Point by which it is fully gone. Short of the end of the exit on purpose: at
 * exactly 1 there is still a sliver of sheet on screen as the trace takes the
 * frame, and the reader only ever reaches the last percent of the exit if they
 * scroll to the pixel.
 */
const VEIL_GONE = 0.96

/**
 * Entrance, played once the cloud has finished assembling. The lines rise into
 * the sheet as it washes over the brain, so the words arrive as holes opening
 * in it rather than as type fading up on top of it.
 */
const ENTER_RISE = 44
const ENTER_DUR = 1.15
const ENTER_STAGGER = 0.14

type LineNodes = { mask: SVGTextElement | null; stroke: SVGTextElement | null }
/** Per-line wrapper groups, one pair per line, carrying the entrance rise. */
type LineGroups = { mask: SVGGElement | null; stroke: SVGGElement | null }

export function HeroMark() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const heroExit = useSceneStore((s) => s.heroExitProgress)
  const tier = useSceneStore((s) => s.qualityTier)
  const nodesRef = useRef<LineNodes[]>(LINES.map(() => ({ mask: null, stroke: null })))
  const lineGroupsRef = useRef<LineGroups[]>(LINES.map(() => ({ mask: null, stroke: null })))
  const subRef = useRef<SVGTextElement | null>(null)
  const zoomRefs = useRef<(SVGGElement | null)[]>([null, null])
  const originRef = useRef({ x: 0, y: 0 })
  /** Per-line entrance progress, 0 → 1. Tweened as gsap targets, so it staggers. */
  const enterRef = useRef(LINES.map(() => ({ v: 0 })))
  const enterTween = useRef<gsap.core.Tween | null>(null)
  const exitRef = useRef(0)
  const enterStarted = useRef(false)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const read = () => setSize({ w: innerWidth, h: innerHeight })
    read()
    let to: ReturnType<typeof setTimeout>
    const onResize = () => { clearTimeout(to); to = setTimeout(read, 120) }
    addEventListener('resize', onResize)
    return () => { clearTimeout(to); removeEventListener('resize', onResize) }
  }, [])

  /**
   * Solve the size rather than clamping it. Each line is measured at a
   * reference size and scaled so both fill the same measure, then the block is
   * centred on its real ink extents inside the band — not on the em box, which
   * for a face with a tall ascent and no descenders visibly sits it low.
   */
  const fit = useCallback(() => {
    const lines = nodesRef.current
    if (!size.w || lines.some((l) => !l.mask || !l.stroke)) return
    const frame = LAYOUT[tier]
    const measure = size.w * frame.measure
    const band = size.h - frame.top - frame.bottom
    if (band <= 0) return

    const setSizeOn = (line: LineNodes, px: number) => {
      for (const node of [line.mask, line.stroke]) {
        if (!node) continue
        node.style.fontSize = `${px}px`
        node.style.letterSpacing = `${TRACKING * px}px`
      }
    }

    /*
     * Measure the stroke copy, never the one inside <defs>. A <text> in a
     * <mask> is never laid out, so getComputedTextLength and getBBox come back
     * empty on it — the fit then solves to nothing and the words end up
     * unpositioned in the corner at their default size, with the mask
     * punching out nothing at all.
     */
    /*
     * Solve, then shrink to fit. Rendered advance width snaps to the pixel
     * grid, so width is a staircase in font size rather than a smooth curve —
     * iterating toward the measure oscillates across a tread instead of
     * settling. Step down until the line fits and stop: overflowing the
     * measure is the failure that shows, undershooting a fraction of a percent
     * is not.
     */
    const solved = lines.map((line) => {
      setSizeOn(line, FIT_REF)
      const len = line.stroke!.getComputedTextLength()
      if (len <= 0) return FIT_REF
      let px = (FIT_REF * measure) / len
      setSizeOn(line, px)
      for (let step = 0; step < 4; step++) {
        if (line.stroke!.getComputedTextLength() <= measure) break
        px *= 0.996
        setSizeOn(line, px)
      }
      return px
    })

    const applyScale = (scale: number) =>
      lines.forEach((line, i) => setSizeOn(line, solved[i] * scale))
    applyScale(1)

    /** Real ink extents with the baseline at y=0, so -bbox.y is the cap height. */
    const inkAll = () =>
      lines.map((line) => {
        line.stroke!.setAttribute('y', '0')
        return line.stroke!.getBBox()
      })

    /** Baseline offsets from the first baseline, and the block's ink height. */
    const layout = (boxes: DOMRect[]) => {
      const caps = boxes.map((b) => -b.y)
      const gap = caps[0] * LINE_GAP
      const offsets = [0]
      for (let i = 1; i < caps.length; i++) offsets.push(offsets[i - 1] + caps[i] + gap)
      const last = boxes[boxes.length - 1]
      const descent = Math.max(0, last.y + last.height)
      return { caps, offsets, height: caps[0] + offsets[offsets.length - 1] + descent }
    }

    let plan = layout(inkAll())
    // A short first word fits so wide that the pair can overrun the band
    if (plan.height > band) {
      applyScale(band / plan.height)
      plan = layout(inkAll())
    }

    const firstBaseline = frame.top + (band - plan.height) / 2 + plan.caps[0]
    const x = String(size.w / 2)

    lines.forEach((line, i) => {
      const y = String(firstBaseline + plan.offsets[i])
      for (const node of [line.mask, line.stroke]) {
        node!.setAttribute('y', y)
        node!.setAttribute('x', x)
      }
    })

    const lastBaseline = firstBaseline + plan.offsets[plan.offsets.length - 1]

    if (subRef.current) {
      subRef.current.setAttribute('y', String(lastBaseline + Math.max(26, plan.caps[0] * 0.2)))
      subRef.current.setAttribute('x', x)
      subRef.current.setAttribute('textLength', String(measure))
    }

    /*
     * The zoom pushes out from inside the ink, not from the middle of the
     * viewport, so the words grow around themselves.
     *
     * Sat on the last line's cap band rather than on the middle of the whole
     * block, which fell in the gap between the two words: scaling about a gap
     * grows the gap, so the last thing on screen before the veil went was a
     * flat sheet. From inside a line, it is that line's own strokes that sweep
     * out past the edges of the frame.
     */
    originRef.current = {
      x: size.w / 2,
      y: lastBaseline - plan.caps[plan.caps.length - 1] / 2,
    }
  }, [size, tier])

  /*
   * `loadPhase` has to be a dependency even though `fit` does not read it: the
   * SVG is not rendered until the phase reaches `ready`, so the refs are null
   * for the commit where `size` lands. Without it the effect runs once, bails
   * on empty refs, and never runs again once the glyphs actually exist.
   */
  useLayoutEffect(() => {
    fit()
    // A webfont swapping in after first paint changes every metric
    document.fonts?.ready.then(fit).catch(() => {})
  }, [fit, loadPhase])

  const p = Math.min(1, Math.max(0, heroExit))

  /*
   * Written straight to the transform attribute rather than through state: the
   * exit progress updates on every scroll tick, and re-rendering the SVG that
   * often would also blow away the sizes and baselines `fit` wrote by hand.
   *
   * The knockout and the hairline copies get the same transforms, so the mask
   * moves and grows with the letters it is cut from. `getBBox` on a <text> is
   * in its own user space, so transforming the groups around it leaves the fit
   * measurements alone.
   *
   * The entrance rise cannot be a CSS animation, because half of what it moves
   * lives inside a <mask> and mask content is not rendered in its own right —
   * so it is written here alongside the zoom, on the same nodes.
   */
  const write = useCallback(() => {
    const scale = 1 + (ZOOM_TO - 1) * Math.pow(exitRef.current, ZOOM_EASE)
    const { x, y } = originRef.current
    const zoom = `translate(${x} ${y}) scale(${scale.toFixed(4)}) translate(${-x} ${-y})`
    for (const g of zoomRefs.current) g?.setAttribute('transform', zoom)

    lineGroupsRef.current.forEach((line, i) => {
      const dy = (1 - enterRef.current[i].v) * ENTER_RISE
      const rise = `translate(0 ${dy.toFixed(2)})`
      line.mask?.setAttribute('transform', rise)
      line.stroke?.setAttribute('transform', rise)
    })
  }, [])

  useLayoutEffect(() => {
    exitRef.current = p
    write()
  }, [p, size, write])

  /*
   * Held back until the cloud has finished assembling — `loadPhase` only
   * reaches `ready` on the intro timeline's last frame. Showing the words over
   * a half-built brain gave away that the assembly was still running.
   */
  useEffect(() => {
    if (loadPhase !== 'ready' || !size.w || enterStarted.current) return
    enterStarted.current = true
    const cells = enterRef.current
    if (prefersReduced()) {
      for (const cell of cells) cell.v = 1
      write()
      return
    }
    /*
     * Parked in a ref and torn down on unmount only. Cleaning it up from this
     * effect instead would kill the tween half-played on the next resize,
     * since the re-entry guard sends the re-run straight back out.
     */
    enterTween.current = gsap.to(cells, {
      v: 1,
      duration: ENTER_DUR,
      ease: 'expo.out',
      stagger: ENTER_STAGGER,
      onUpdate: write,
    })
  }, [loadPhase, size.w, write])

  useEffect(() => () => { enterTween.current?.kill() }, [])

  if (loadPhase !== 'ready' || !size.w) return null

  /** Veil holds, then goes — see VEIL_HOLD and VEIL_GONE. */
  const veil = Math.min(1, Math.max(0, 1 - (p - VEIL_HOLD) / (VEIL_GONE - VEIL_HOLD)))
  /** Supporting type is not part of the zoom, so it leaves early. */
  const support = Math.max(0, 1 - p / 0.35)

  return (
    <div
      className="hero-mark"
      data-testid="hero-mark"
      data-load-phase={loadPhase}
      aria-hidden={p > 0.9}
    >
      <p className="sr-only">{`${LINES.join('')} ${SUB}`}</p>
      <svg
        className="hero-mark__svg"
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        aria-hidden
        focusable="false"
      >
        <defs>
          <mask
            id="hero-knockout"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={size.w}
            height={size.h}
          >
            <rect x="0" y="0" width={size.w} height={size.h} fill="#fff" />
            {/* Outer group carries the zoom; the inner one per line carries the
                entrance rise, so the two compose without fighting */}
            <g ref={(el) => { zoomRefs.current[0] = el }}>
              {LINES.map((text, i) => (
                <g key={text} ref={(el) => { lineGroupsRef.current[i].mask = el }}>
                  <text
                    className="hero-mark__glyph"
                    ref={(el) => { nodesRef.current[i].mask = el }}
                    textAnchor="middle"
                    fill="#000"
                  >
                    {text}
                  </text>
                </g>
              ))}
            </g>
          </mask>
        </defs>

        {/* The sheet the words are cut out of. Fading it opens the mask. */}
        <rect
          className="hero-mark__veil"
          x="0"
          y="0"
          width={size.w}
          height={size.h}
          mask="url(#hero-knockout)"
          style={{ opacity: veil }}
        />

        {/*
          A word filled with an image loses its edges against the image, and
          once the edges go it stops reading as a word. Hairline it.
        */}
        <g ref={(el) => { zoomRefs.current[1] = el }} style={{ opacity: veil }}>
          {LINES.map((text, i) => (
            <g key={`stroke-${text}`} ref={(el) => { lineGroupsRef.current[i].stroke = el }}>
              <text
                className="hero-mark__glyph hero-mark__stroke"
                ref={(el) => { nodesRef.current[i].stroke = el }}
                textAnchor="middle"
                /* Entrance stagger for the hairline's own fade, matched to the
                   rise this group is given in `write` */
                style={{ '--line': i } as React.CSSProperties}
              >
                {text}
              </text>
            </g>
          ))}
        </g>

        <text
          ref={subRef}
          className="hero-mark__sub"
          textAnchor="middle"
          lengthAdjust="spacing"
          style={{ opacity: support }}
        >
          {SUB}
        </text>
      </svg>

      {/* Small annotations against the giant type — the scale contrast is the
          design, so they stay genuinely small */}
      <div className="hero-notes" style={{ opacity: support }} aria-hidden={p > 0.2}>
        {HERO_NOTES.map((note, i) => (
          <p
            className={`hero-note hero-note--${i === 0 ? 'left' : 'right'}`}
            key={note.label}
            style={{ '--note': i } as React.CSSProperties}
          >
            <span className="hero-note__value">{note.value}</span>
            <span className="hero-note__label">{note.label}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
