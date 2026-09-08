import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { projectStories } from '../content/projects'
import { toWords } from './textReveal'

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const BEATS_PER_PROJECT = 3
/** Stories kept mounted either side of the active one, so images load a project ahead. */
const MOUNT_RANGE = 1

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Copy resolves over this much of a beat, whatever the word count. Dividing a
 * fixed spread by the number of words keeps a two-word label and a forty-word
 * paragraph landing at the same moment.
 */
const WORD_SPREAD = 0.34
/** Opacity words sit at before their turn: dimmed, not invisible. */
const WORD_FLOOR = 0.06

/**
 * How much of the beat's own scroll the copy block cancels out. Without this
 * the copy has drifted most of a viewport by the time it finishes fading, so
 * it reads as sliding past rather than holding while you read it.
 */
const COPY_PARALLAX = 0.45

/** Beats within this many beat-lengths of centre get the `will-change` hint. */
const NEAR_RANGE = 1.4

type BeatEl = {
  el: HTMLElement
  index: number
  inner: HTMLElement | null
  /** Animated rows in document order, each with its own offset in the stagger */
  rows: { el: HTMLElement; words: HTMLElement[]; mask: HTMLElement | null }[]
  /** Last `is-near` state, so the class is only touched when it actually flips */
  near: boolean
}

/**
 * Scroll walkthrough of the client work, below the brain journey.
 *
 * One `100dvh` beat per copy block. The sticky stage is a deck of the project's
 * screenshots in CSS 3D: the current shot sits front-on, the next two are
 * stacked behind and to the right, and the one you just left banks toward the
 * camera and blurs out. Scrolling advances the deck.
 *
 * Every transform is written straight to the DOM from a rAF-throttled scroll
 * handler rather than through React state, for the same reason `ScrollDriver`
 * does it: a scrubbed timeline stalls under WebGL load and then snaps when the
 * main thread catches up.
 */
export function ProjectJourney() {
  const rootRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  /**
   * Re-reads the mounted deck and repaints, without the beat re-measure. Set by
   * the scroll effect so the `active` commit can pick up the cards React just
   * mounted — that effect no longer re-runs on a handover.
   */
  const syncDeckRef = useRef<() => void>(() => {})

  const stories = projectStories
  const total = stories.length * BEATS_PER_PROJECT

  useEffect(() => {
    const root = rootRef.current
    if (!root || total === 0) return
    const reduced = prefersReduced()

    let vh = Math.max(1, innerHeight)
    let beats: BeatEl[] = []
    let cardEls: HTMLElement[] = []
    /** Document-space centre of the first beat, and the spacing between beats. */
    let firstCentre = 0
    let pitch = vh

    const centreOf = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return r.top + scrollY + r.height / 2
    }

    /** Cheap: no layout reads, so a handover does not force a reflow */
    const collectCards = () => {
      cardEls = [...root.querySelectorAll<HTMLElement>('[data-shot]')]
    }

    const measure = () => {
      vh = Math.max(1, innerHeight)
      const beatEls = [...root.querySelectorAll<HTMLElement>('[data-beat]')]
      beats = beatEls.map((el) => ({
        el,
        index: Number(el.dataset.beat),
        inner: el.querySelector<HTMLElement>('.project-beat__inner'),
        // Document order, so the stagger follows reading order even for rows
        // nested inside the header
        rows: [...el.querySelectorAll<HTMLElement>('[data-row]')].map((row) => ({
          el: row,
          words: [...row.querySelectorAll<HTMLElement>('.word')],
          mask: row.querySelector<HTMLElement>('.mask-line'),
        })),
        near: el.classList.contains('is-near'),
      }))
      collectCards()
      if (!beatEls.length) return
      firstCentre = centreOf(beatEls[0])
      // Beats can be shorter than a viewport, so measure the spacing rather
      // than assuming innerHeight
      pitch = Math.max(
        1,
        beatEls.length > 1
          ? centreOf(beatEls[1]) - firstCentre
          : beatEls[0].getBoundingClientRect().height,
      )
    }

    const apply = () => {
      /*
       * `pos` is the index of the beat currently centred in the viewport: 0
       * means beat 0 is centred, 1.5 means halfway between beats 1 and 2.
       * Driving everything off this rather than off a floor()ed scroll index
       * matters, because a beat is centred at the *start* of its own scroll
       * range, not the middle of it.
       */
      const pos = Math.min(total - 1, Math.max(0, (scrollY + vh / 2 - firstCentre) / pitch))
      const nearest = Math.round(pos)
      const storyIndex = Math.min(
        stories.length - 1,
        Math.max(0, Math.floor(nearest / BEATS_PER_PROJECT)),
      )

      if (storyIndex !== activeRef.current) {
        activeRef.current = storyIndex
        setActive(storyIndex)
      }

      for (const beat of beats) {
        const signed = pos - beat.index
        const d = Math.abs(signed)
        const o = clamp01((0.55 - d) / 0.3)
        // Keep faded copy out of the tab order — an invisible focused link is a trap
        beat.el.toggleAttribute('inert', o < 0.05)
        if (reduced) continue

        const near = d < NEAR_RANGE
        if (near !== beat.near) {
          beat.near = near
          beat.el.classList.toggle('is-near', near)
        }

        /*
         * Everything below rides in on approach and only fades on the way out.
         * Driving the offsets off `d` in both directions meant every row and
         * every word reversed direction the instant the beat passed centre, so
         * the copy kicked backwards mid-scroll — which is the judder, not the
         * frame rate.
         */
        const inbound = signed <= 0

        if (beat.inner) {
          // Clamped rather than skipped: freezing the transform outside a window
          // leaves a stale offset to jump from when a fast scroll re-enters it
          const held = Math.max(-1.2, Math.min(1.2, signed))
          beat.inner.style.transform =
            `translate3d(0, ${(held * pitch * COPY_PARALLAX).toFixed(1)}px, 0)`
        }

        beat.rows.forEach((row, k) => {
          // Each row trails the one above it, so the block assembles in reading order
          const rd = d + k * 0.05
          const ro = clamp01((0.55 - rd) / 0.3)

          if (row.mask) {
            // Masked heading: rides up from under its own clip with a slight tilt
            row.el.style.opacity = '1'
            row.mask.style.transform = inbound
              ? `translate3d(0, ${((1 - ro) * 105).toFixed(1)}%, 0) rotate(${((1 - ro) * 3.5).toFixed(2)}deg)`
              : 'none'
            return
          }

          if (row.words.length) {
            /*
             * Words resolve one after another as the beat comes in, and every
             * one of them is fully resolved by the time it is centred.
             *
             * The spread is added back into the window rather than just
             * subtracted per word: without it the last word of a long
             * paragraph was still short of full opacity at the beat's own
             * centre, so the tail of every project's intro sat permanently
             * dimmed and the copy read as half-loaded.
             */
            row.el.style.opacity = '1'
            const step = WORD_SPREAD / row.words.length
            row.words.forEach((word, i) => {
              const wo = clamp01((0.55 + WORD_SPREAD - (rd + i * step)) / 0.3)
              word.style.opacity = String(WORD_FLOOR + (1 - WORD_FLOOR) * wo)
              word.style.transform = inbound
                ? `translate3d(0, ${((1 - wo) * 14).toFixed(1)}px, 0)`
                : 'none'
            })
            return
          }

          row.el.style.opacity = String(ro)
          row.el.style.transform = inbound
            ? `translate3d(0, ${((1 - ro) * (22 + k * 6)).toFixed(1)}px, 0)`
            : 'none'
        })
      }

      // Progress across this project's three beats, then across its screenshots
      const span = BEATS_PER_PROJECT - 1
      /** -0.5 just after the handover, 2.5 just before the next one */
      const local = pos - storyIndex * BEATS_PER_PROJECT
      const q = clamp01(local / span)
      /** Deck wipe-in, so a new project builds rather than cutting in */
      const enter = clamp01((local + 0.5) / 0.45)
      const n = stories[storyIndex].shots.length
      const u = n > 1 ? q * (n - 1) : 0

      for (const el of cardEls) {
        const si = Number(el.dataset.story)

        // Outgoing project: hold its last shot and dissolve it under the wipe,
        // otherwise the deck blinks empty at every handover
        if (si === storyIndex - 1) {
          const isLast = Number(el.dataset.shot) === stories[si].shots.length - 1
          el.style.opacity = isLast && !reduced ? String(1 - enter) : '0'
          el.style.transform = 'none'
          el.style.filter = `blur(${(enter * 9).toFixed(1)}px)`
          el.style.clipPath = 'none'
          el.style.zIndex = '900'
          continue
        }

        if (si !== storyIndex) {
          el.style.opacity = '0'
          continue
        }

        const shot = Number(el.dataset.shot)
        const rel = shot - u
        let o = 0
        let tx = 0
        let ty = 0
        let tz = 0
        let ry = 0
        let blur = 0
        let bright = 1

        if (rel <= 0) {
          // Front card, or one the camera has just passed through. It banks
          // toward the viewer and blurs out; the exponent keeps it from
          // lingering as a smear over the copy column on its way off.
          const t = -rel
          if (t < 1) {
            o = Math.pow(1 - t, 1.7)
            tx = -8 * t
            ty = -2 * t
            tz = 110 * t
            ry = 13 * t
            blur = 14 * t
          }
        } else {
          // Stacked behind and to the right, dimmer the deeper it sits
          const t = Math.min(rel, 3)
          o = rel > 2 ? clamp01(3 - rel) : 1
          tx = 8 * t
          ty = 3.2 * t
          tz = -190 * t
          ry = -9 * t
          bright = 1 - 0.15 * t
        }

        if (reduced) {
          el.style.opacity = rel === 0 ? '1' : '0'
          el.style.transform = 'none'
          el.style.filter = 'none'
          el.style.clipPath = 'none'
          el.style.zIndex = '1'
          continue
        }

        el.style.opacity = String(o * enter)
        el.style.transform =
          `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(2)}%, ${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`
        el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`
        // The project's first card wipes open from the top as the deck arrives
        el.style.clipPath =
          shot === 0 && enter < 1 ? `inset(0 0 ${((1 - enter) * 100).toFixed(1)}% 0)` : 'none'
        // Depth order by hand: `filter` flattens a card out of the parent's
        // 3D sorting, so paint order has to follow translateZ explicitly
        el.style.zIndex = String(1000 + Math.round(tz))
      }

      if (counterRef.current) {
        counterRef.current.textContent = n ? `${pad(Math.round(u) + 1)} / ${pad(n)}` : ''
      }
      railRef.current?.style.setProperty('--rail-q', q.toFixed(4))
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        apply()
      })
    }

    let resizeTo: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(resizeTo)
      resizeTo = setTimeout(() => {
        measure()
        apply()
      }, 150)
    }

    syncDeckRef.current = () => { collectCards(); apply() }

    measure()
    apply()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)

    /*
     * The beat centres are cached in document space, so anything that changes
     * the page height above the walkthrough invalidates them — and plenty
     * does after first paint: the section titles are fitted to their measure
     * once the display face lands, and the screenshots above are lazy. Without
     * this the deck and the copy scrub against stale offsets, which reads as
     * the words never resolving.
     */
    let layoutTo: ReturnType<typeof setTimeout> | undefined
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          clearTimeout(layoutTo)
          layoutTo = setTimeout(() => { measure(); apply() }, 80)
        })
      : null
    ro?.observe(document.body)

    return () => {
      clearTimeout(resizeTo)
      clearTimeout(layoutTo)
      ro?.disconnect()
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onResize)
      syncDeckRef.current = () => {}
    }
    /*
     * `active` is deliberately not a dependency. It changes at every project
     * handover, and listing it tore the listeners down and re-measured every
     * beat mid-scroll six times over the section. The handler reads the active
     * index off `activeRef`, so it never needs the state value.
     */
  }, [total, stories])

  /*
   * A handover mounts the next project's cards. The scroll handler holds them
   * in a cached list, so it has to be told to re-read it — otherwise the fresh
   * cards keep their stylesheet defaults and the deck reads as empty.
   */
  useEffect(() => { syncDeckRef.current() }, [active])

  /*
   * The copy column is static markup — ~630 word spans, none of which depend on
   * `active`. Without this it was re-created and diffed on every project
   * handover, which is a re-render landing in the middle of a scroll.
   */
  const copy = useMemo(
    () => (
      <div className="project-journey__copy">
        {stories.map((s, si) =>
          s.beats.map((b, bi) => (
            <article
              className="project-beat"
              data-beat={si * BEATS_PER_PROJECT + bi}
              key={`${s.id}-${b.id}`}
            >
              <div className="project-beat__inner">
                {bi === 0 && (
                  <header className="project-beat__head">
                    <span className="project-beat__num" data-row>{pad(si + 1)}</span>
                    <h3 className="project-beat__title" data-row>
                      <span className="mask-line">{s.title}</span>
                    </h3>
                    <p className="project-beat__role" data-row>
                      {s.role}
                      {s.period ? ` · ${s.period}` : ''}
                    </p>
                  </header>
                )}
                <p className="project-beat__label" data-row>{b.label}</p>
                <p className="project-beat__body" data-row>
                  <span className="sr-only">{b.body}</span>
                  <span className="words" aria-hidden="true">
                    {toWords(b.body).map((w, wi) => (
                      // Space lives outside the span so words still wrap
                      <Fragment key={`${wi}-${w}`}>
                        <span className="word">{w}</span>{' '}
                      </Fragment>
                    ))}
                  </span>
                </p>
                {b.id === 'tech' && s.stack.length > 0 && (
                  <ul className="project-beat__stack" data-row>
                    {s.stack.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {b.id === 'build' && s.domain && (
                  <a
                    className="project-beat__link"
                    data-row
                    href={s.domain}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {hostOf(s.domain)} →
                  </a>
                )}
              </div>
            </article>
          )),
        )}
      </div>
    ),
    [stories],
  )

  if (total === 0) return null

  return (
    <div className="project-journey" ref={rootRef} data-testid="project-journey">
      {/*
        Stage is first in the DOM so the mobile block layout can pin it above
        the copy; on desktop `order` puts the copy back in the left column.
      */}
      <div className="project-journey__grid">
        <div className="project-journey__stage" aria-hidden>
          <div className="project-journey__deck">
            {stories.map((s, si) =>
              Math.abs(si - active) <= MOUNT_RANGE
                ? s.shots.map((w, j) => (
                    <figure
                      className="project-journey__card"
                      key={w.id}
                      data-story={si}
                      data-shot={j}
                    >
                      {/* Browser chrome, so a screenshot reads as a shipped site */}
                      <span className="project-journey__bar">
                        <span className="project-journey__dots">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span className="project-journey__url">
                          {s.domain ? hostOf(s.domain) : s.title}
                        </span>
                      </span>
                      <span className="project-journey__screen">
                        <img
                          src={w.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </span>
                    </figure>
                  ))
                : null,
            )}
          </div>

          <div className="project-journey__caption">
            <span className="project-journey__caption-name">{stories[active]?.title}</span>
            <span className="project-journey__counter" ref={counterRef} />
          </div>

          <div className="project-journey__rail" ref={railRef}>
            {stories.map((s, si) => (
              <span
                key={s.id}
                className={`project-journey__tick${si === active ? ' is-active' : ''}${
                  si < active ? ' is-done' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {copy}
      </div>
    </div>
  )
}
