import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { profile } from '../content/portfolio'

/** Two of the About stats, set against the mark the way Formix does it. */
const HERO_NOTES = profile.about.numbers.slice(0, 2)

/**
 * The hero mark: FULL over STACK, both fitted to the same measure, punched out
 * of a veil laid across the brain stage.
 *
 * The words are not drawn over the brain — they are a hole in a dark sheet on
 * top of it, so the only place the cloud reads at full strength is inside the
 * letterforms. Scrolling dissolves the sheet, which opens the mask from
 * letter-shaped to fully open and hands the whole brain to the request trace.
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
 */
const ZOOM_TO = 5.2
/**
 * Point in the exit at which the veil starts to go. Held opaque for the first
 * stretch on purpose: while the sheet is still there the growing letters are
 * doing the revealing, and that reads as one continuous move. Dissolving it
 * from the start turns the whole thing into a crossfade instead.
 */
const VEIL_HOLD = 0.55

type LineNodes = { mask: SVGTextElement | null; stroke: SVGTextElement | null }

export function HeroMark() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const heroExit = useSceneStore((s) => s.heroExitProgress)
  const tier = useSceneStore((s) => s.qualityTier)
  const nodesRef = useRef<LineNodes[]>(LINES.map(() => ({ mask: null, stroke: null })))
  const subRef = useRef<SVGTextElement | null>(null)
  const zoomRefs = useRef<(SVGGElement | null)[]>([null, null])
  const originRef = useRef({ x: 0, y: 0 })
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

    // The zoom pushes out from the middle of the ink, not the middle of the
    // viewport, so the words grow around themselves
    originRef.current = {
      x: size.w / 2,
      y: (firstBaseline - plan.caps[0] + lastBaseline) / 2,
    }
  }, [size, tier])

  /*
   * `loadPhase` has to be a dependency even though `fit` does not read it: the
   * SVG is not rendered while the scene is still loading, so the refs are null
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
   * The knockout and the hairline copies get the same transform, so the mask
   * grows with the letters it is cut from. `getBBox` on a <text> is in its own
   * user space, so scaling the group around it leaves the fit measurements
   * alone.
   */
  useLayoutEffect(() => {
    const scale = 1 + (ZOOM_TO - 1) * Math.pow(p, 1.6)
    const { x, y } = originRef.current
    const transform = `translate(${x} ${y}) scale(${scale.toFixed(4)}) translate(${-x} ${-y})`
    for (const g of zoomRefs.current) g?.setAttribute('transform', transform)
  }, [p, size])

  if (loadPhase === 'loading' || !size.w) return null

  /** Veil holds, then goes — see VEIL_HOLD. */
  const veil = p <= VEIL_HOLD ? 1 : 1 - (p - VEIL_HOLD) / (1 - VEIL_HOLD)
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
            <g ref={(el) => { zoomRefs.current[0] = el }}>
              {LINES.map((text, i) => (
                <text
                  key={text}
                  className="hero-mark__glyph"
                  ref={(el) => { nodesRef.current[i].mask = el }}
                  textAnchor="middle"
                  fill="#000"
                >
                  {text}
                </text>
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
            <text
              key={`stroke-${text}`}
              className="hero-mark__glyph hero-mark__stroke"
              ref={(el) => { nodesRef.current[i].stroke = el }}
              textAnchor="middle"
            >
              {text}
            </text>
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
          <p className={`hero-note hero-note--${i === 0 ? 'left' : 'right'}`} key={note.label}>
            <span className="hero-note__value">{note.value}</span>
            <span className="hero-note__label">{note.label}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
