---
name: cinematic-scroll-portfolio
description: Build a cinematic, scroll-driven site (portfolio, product launch, agency, event page) where giant typography is the layout, images live inside letterforms, a hero word zooms open as you scroll, and a pinned timeline tells a story chapter by chapter, while staying fast on phones and fully indexable by search engines. Also covers a custom cursor with hover labels and damage effects, a WebGL particle cloud that reacts to the visitor (light pulses, swarm reactions, particles that attack the cursor), a generative Web Audio soundtrack (intro hit, section drones, scroll-scrubbed effects, attack music, a start gate and a mute toggle), a scroll progress bar, and build-time prerendering. Use it whenever a request mentions a cinematic, editorial, awwwards-style, immersive or "not a template" site, giant or outlined type, text masked over an image or 3D scene, a scroll timeline or journey, alternating left/right chapters with a moving graphic in the middle, a custom or reactive cursor, interactive particles, sound design or background music on a web page, or making such a page SEO friendly. Also use it to fix an existing scroll page that feels laggy, bouncy, noisy, staggers on mobile, leaves pieces of a zoom on screen, or has sound that is too loud or annoying.
---

# Cinematic scroll site

This skill is a complete recipe, written so that a small model can follow it. Read
this file fully first. Then open only the reference files your scenario needs (see
the map below), one at a time, and copy their code nearly as written. Every rule
here exists because breaking it produced a bug a real person saw or heard. The
symptom is named next to each rule so you can recognise it.

## Reference files

| File | What it covers |
|---|---|
| `references/01-foundations.md` | Tokens, film grain, fitted type, the reveal system, masked title reveals |
| `references/02-hero-knockout.md` | Words cut out of a veil over a scene; the zoom into a letter's stem |
| `references/03-section-patterns.md` | Section shell, ghost numerals, image-filled type, index rows, marquee, numbers, experience rows, contact, footer, far jumps |
| `references/04-scroll-timeline.md` | The pinned chapter timeline: line, comet, nodes, numeral, 3D decks, and keeping it synced to the scroll |
| `references/05-seo-prerender.md` | Build-time prerender, head tags, JSON-LD, share image, semantics |
| `references/06-verify-and-perf.md` | Playwright checks, frame-time A/B, headless caveats |
| `references/07-cursor-and-chrome.md` | Custom cursor, cursor labels and damage, start gate, scroll progress bar, mute toggle |
| `references/08-interactive-particles.md` | A WebGL point cloud that feels the visitor: light pulses, swarm startle, raids on the cursor |
| `references/09-sound-design.md` | The Web Audio soundtrack: graph, calm drone, intro hit, scroll-scrubbed warp, reveal sounds, attack music, testing |

## Scenario map: what to read for what you are building

| Scenario | Read | Skip |
|---|---|---|
| Full cinematic portfolio like the original | All, in the build order below | Nothing |
| Product or launch page (no 3D) | 01, 03, 04 (as a feature timeline), 05, 06, 07 (progress bar, cursor) | 02 needs a background: use a video or image in place of the WebGL scene; skip 08 |
| Agency or studio site | 01, 03 (index rows are the case studies), 04, 05, 06, 07 | 08, 09 unless asked |
| Adding "make it feel alive" to an existing site | 07 (cursor, progress bar), 03 (image-filled type), 09 (UI sounds only) | Rebuilding layout |
| Only the scroll timeline | 01 (reveal + fitted type), 04, 06 | The rest |
| Only sound | 09, 07 (start gate and mute toggle) | The rest |
| Only interactive particles | 08, 06; 09 if the particles should be heard | The rest |
| Fixing a laggy, bouncy or staggering scroll | 04 ("Performance contract", "Comet and lit line", "Common failures"), 06 | New features |
| Fixing SEO on a client-rendered cinematic site | 05, 06 (progressive enhancement check) | Visuals |
| Low-end phones must be smooth | 04 performance contract, 06 performance rules; drop blur and grain on phones; no raids on touch | Heavy effects on mobile |

## Build order (full build)

Each step is usable on its own, so verify after each.

1. Tokens, fonts, ground, grain (01).
2. Reveal system and fitted type (01). Everything else depends on these.
3. Section shell with fitted title and ghost numeral (03).
4. Section contents: index rows, marquee, numbers, rows, contact, footer (03).
5. Scroll timeline, desktop first, then the mobile override, then the scroll sync (04).
6. Hero knockout (02). It needs the rest of the page to scroll into.
7. Prerender, head tags, JSON-LD, share image (05).
8. Cursor, scroll progress bar (07).
9. Interactive particles, if there is a WebGL cloud (08).
10. Sound: start gate, then the engine, then the triggers (07, 09).
11. Verification (06). Run it, fix what fails, run again.

## The rules that matter most

Layout and type
1. **Fit display type, do not clamp it.** Measure at a reference size and scale, then
   step down by the overshoot and climb back while it fits (01). *Symptom: long words
   overflow, short words leave gutters, an email address overhangs on phones.*
2. **Hide content only under a class the script adds** (`html.reveal-armed`).
   *Symptom: blank sections with JS off or in the prerendered page.*
3. **Put the IntersectionObserver on the static clipping parent**, never on the
   element that slides out of its clip. *Symptom: a title that never appears.*
4. **Image-filled text is softened, toned, tinted and outlined** (03). *Symptom:
   letters full of screenshot text read as noise; dark images vanish, light ones go flat grey.*

Scroll and motion
5. **Per-frame writes are `transform` and `opacity` only.** No width, top, clip-path,
   filter or box-shadow per frame. Blur only on desktop.
6. **One rAF-throttled handler per effect, writing straight to the DOM.** Framework
   state changes only at discrete moments (a chapter handover).
7. **Cache layout; re-measure only on resize** and on a body `ResizeObserver`.
8. **Anything locked to the scroll is not moved by JS.** Use `position: sticky` and CSS
   scroll timelines, with JS only as a fallback (04). *Symptom: the comet or the tip of
   a line staggers while scrolling, much worse on phones.*
9. **Scroll motion never reverses while readable, and reading copy gets no parallax.**
   Animate in on approach with an ease-out, and only fade on the way out. *Symptom:
   text "bounces" as it passes the centre.*
10. **A zoom through a word must end inside a solid stem**, measured from pixels, panned
    to centre, with text swapped for a rectangle past ~6000px (02). *Symptom: pieces of
    letters left on screen, then a cut, or the frame dimming near the end.*

Interaction
11. **Movement answers intent; light answers presence.** Hover gets light, clicks get
    movement. Pushing particles on hover looked cheap (08).
12. **Custom cursors are fine-pointer only** and never hide the text caret (07).
13. **Test automation skips gates** via `navigator.webdriver` (07).

Sound
14. **No autoplay. Start from a gate click** (07, 09).
15. **Every gain starts at 0 at time 0.** `GainNode` defaults to 1. *Symptom: a loud
    burst right after the start click.*
16. **Big hits fire on the visual state, not on a guessed timeline** (09). *Symptom: the
    boom lands late or early.*
17. **The background is calm:** sines, slow swells, dark reverb, no whoosh on every
    change. *Symptom: "the background sound is annoying".*
18. **Skip one-shots while suspended or muted**, or they all fire at once on resume.

## Visual system

- Ground `#05050a` (sections) and `#020204` (hero). Type `#ece9f2` ("cream").
  Muted copy `rgba(235,235,255,.55-.7)`. Hairlines `rgba(255,255,255,.08)`.
- One display face at one heavy weight (Inter Tight 800, or a condensed face like
  Anton). Load only the weights you use.
- Supporting labels: monospace, 9.5 to 12px, uppercase, `letter-spacing: .2em-.32em`.
  The contrast between 10px labels and 300px words is the design.
- Giants: `line-height: .84-.9`, `letter-spacing: -.03em to -.05em`, uppercase.
- One accent per section or per chapter, used for index numbers, a trailing dot on the
  title, hairlines and glows, and crossfaded through a registered `@property`.
- Atmosphere: a static radial glow of the accent at 6 to 11% on each section (and on
  the timeline's sticky stage, so every chapter gets it), plus film grain in `steps()`.
- Outlined giants: `color: transparent; -webkit-text-stroke: .005em-.012em <color>`,
  sized in `em`.
- Attack or damage states use a hot red `#ff4d6d` with red and cyan chromatic
  offsets, never the page accent.

## Content and copy rules

- Headings are statements or single words, never "Our Services".
- Every heading, lede, row and chapter is real text in the served HTML. Decorative
  giants, marquees and cursor text are `aria-hidden`.
- Say each thing once: no `sr-only` duplicate beside split words.
- Interactive copy is short and in the site's voice: a dare ("Don't touch. The swarm
  is alive."), an answer ("It felt that."), a shout ("Ouch!", "Run."). Straight
  apostrophes, no em dashes.
- Buttons say what happens in context ("Wake the swarm", "Enter without sound"), not
  "Start" or "OK".

## Working with the person

- Visual and audio taste is theirs. Show screenshots, describe sounds with numbers you
  can change, and ask what is off. Do not report "looks great" or "sounds right" from
  your own read, and never claim to have heard audio.
- When they say something "looks stupid" or is "annoying", remove or replace it; do
  not tune it and argue for it.
- When they say "it's too loud" or "not timed right" and a first fix does not land,
  look for a bug (a default value, a wrong trigger) before adjusting levels again.
- If they stop a dev server, do not restart it; test the production preview instead.

## Stop conditions

Do not report the page as done until these pass (06):
- no horizontal overflow at 390px and 1440px
- every fitted title fills its column without overhanging
- sections are readable with JS off, and every heading is in the prerendered HTML
- the timeline comet is within 2px of the viewport centre and the lit edge within 1px
  of it, with scroll timelines and with the JS fallback
- the hero veil covers 0% of the frame before it starts fading at 390, 1440 and 2560px
- if there is sound: nothing plays before the gate, the context runs right after it,
  the intro hit fires on the visual cue, mute survives a reload
- no console errors
