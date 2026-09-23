---
name: cinematic-scroll-portfolio
description: Build a cinematic, scroll-driven portfolio or landing page where giant typography is the layout, images live inside letterforms, and a pinned scroll timeline tells a story project by project, while staying fast (60fps on phones) and fully indexable by search engines. Use this for any request mentioning a cinematic, editorial, awwwards-style, big-type or "not a template" site, a hero word that zooms open as you scroll, text masked over an image or 3D scene, a project timeline or journey that animates as you scroll, alternating left/right project chapters with a moving graphic in the center, giant section numbers or outlined ghost words, or making such a page SEO-friendly. Also use it to fix an existing scroll page that feels laggy, bouncy, noisy, or leaves pieces of a zoom on screen.
---

# Cinematic scroll portfolio

This skill is a complete recipe. Follow it in order and copy the code in `references/`
nearly as written. Every rule below exists because breaking it produced a visible bug
in a real build. The failure is named next to each rule so you can recognise it.

Read this file fully first. Then open only the reference file for the step you are on.

## What you are building

A single long page on a near-black ground:

1. **Hero.** One or two giant words (for example FULL over STACK) cut out of a dark
   veil laid over a background (a WebGL scene, a video, or an image). Scrolling zooms
   the camera *into* one letter until that letter's solid stem fills the screen, and
   only then does the veil dissolve. See `references/02-hero-knockout.md`.
2. **Sections.** Each section opens with a small index (`02 / 05`), one display word
   fitted to the full column width, a short lede, and a giant outlined section
   number bleeding off the right edge. Content inside uses typographic rows, not
   cards. See `references/03-section-patterns.md`.
3. **Scroll timeline.** A pinned stage with a line running down the center that draws
   itself as you scroll, a glowing comet on its tip, one node per project, a giant
   outlined project number behind everything, and copy plus a 3D screenshot deck
   that alternate left and right per project. See `references/04-scroll-timeline.md`.
4. **SEO layer.** All copy is in the served HTML through a build-time prerender,
   with real headings, JSON-LD, and a share image. See `references/05-seo-prerender.md`.

Foundations (tokens, fitted type, reveal system) are in `references/01-foundations.md`.
Performance rules and the checks that prove the page works are in
`references/06-verify-and-perf.md`.

## Build order

Do these in order. Each step is usable on its own, so stop and verify after each.

1. Tokens, fonts, ground, grain (`01-foundations.md`, "Tokens").
2. Reveal system and fitted type (`01-foundations.md`). Nothing else works without these.
3. Section shell with fitted title and ghost numeral (`03-section-patterns.md`, "Section shell").
4. Section contents: index rows, marquee, numbers, rows, contact, footer (`03`).
5. Scroll timeline (`04-scroll-timeline.md`). Build desktop first, then the mobile override.
6. Hero knockout (`02-hero-knockout.md`). Hardest piece, needs the rest of the page to scroll into.
7. Prerender, head tags, JSON-LD, share image (`05-seo-prerender.md`).
8. Verification scripts (`06-verify-and-perf.md`). Run them, fix what fails, run again.

## The ten rules that matter most

1. **Fit display type, do not clamp it.** Measure at a reference size and scale:
   `size = ref * targetWidth / measuredWidth`, then step down until it fits. A clamp
   overflows long words and leaves gutters beside short ones.
2. **Hide content only under a class the script adds** (`html.reveal-armed`). If the
   hidden state is plain CSS, the prerendered page and any page whose script failed
   show blank sections. Symptom: sections are empty with JS disabled.
3. **Put the IntersectionObserver on the static clipping parent**, never on an element
   that hides itself by translating out of its own clip. Symptom: a title that never appears.
4. **Every per-frame write is a transform or opacity.** Never animate width, height,
   top, left, clip-path, filter or box-shadow per frame. Blur only on desktop, never
   on phones.
5. **One rAF-throttled scroll handler per effect, writing straight to the DOM.**
   React state changes only at discrete moments (a project handover), never per frame.
6. **Cache layout, read it only on resize.** Measure document offsets once, re-measure
   from a `ResizeObserver` on `document.body` (debounced ~80ms). Reading
   `getBoundingClientRect` inside the scroll handler forces layout every frame.
7. **Scroll-driven motion must never reverse while readable.** Drive entrances from
   the distance to a beat's center on the way in, and only fade on the way out.
   Ease the entrance (`1 - (1 - t)^3`) so it settles. Symptom: text that "bounces"
   or kicks backwards as it passes the center.
8. **No counter-scroll parallax on reading copy.** Holding copy against the page
   makes it lag, then catch up. It reads as bouncing. Parallax only decorative giants.
9. **Image-filled text must be softened and outlined.** Downscale-blur the image,
   tone it into a fixed brightness band, tint it toward an accent, and add an
   `em`-sized hairline stroke. Raw screenshots inside letters look like noise, dark
   ones vanish into the ground, and light ones turn flat grey.
10. **A zoom through a word must end inside a solid part of a letter.** Pick a stem,
    measure it from pixels, pan it to the frame center while scaling, and stop drawing
    glyphs as text past ~6000px (swap in a rectangle). Chrome's SVG mask breaks on
    glyphs around 10,000px tall and the veil comes back. Symptom: pieces of letters
    left on screen, then a sudden cut, or the frame dimming near the end.

## Visual system

- Ground `#05050a` (sections) and `#020204` (hero). Type `#ece9f2` ("cream").
  Muted copy `rgba(235,235,255,.55-.7)`. Hairlines `rgba(255,255,255,.08)`.
- One display face at one heavy weight (Inter Tight 800 works; a condensed face like
  Anton works too). Only load weights you use; a missing weight is faked by the browser.
- Supporting labels: monospace, 9.5 to 12px, uppercase, `letter-spacing: .2em-.32em`.
  The contrast between 10px labels and 300px words is the design. Do not enlarge labels.
- Giants: `line-height: .84-.9`, `letter-spacing: -.03em to -.05em`, uppercase.
- One accent per section (or per project) used for the index number, a trailing dot
  on the title, hairlines, glows. Never more than one accent on screen at a time.
- Atmosphere: a static radial glow of the accent at the top of each section at 6-11%
  mix, plus film grain animated with `steps()`.
- Outlined giants: `color: transparent; -webkit-text-stroke: .005em-.012em <color>`.
  Size strokes in `em` so they track the font.

## Content rules

- Headings are statements or single words, never "Our Services".
- Every heading, lede, row and chapter is real text in the DOM. Decorative giants
  (ghost numbers, marquee words, the timeline numeral) get `aria-hidden`.
- Say the same thing once. Duplicated copy (an `sr-only` copy next to split words, a
  marquee repeating names) goes `aria-hidden` or is removed.

## Stop conditions

Do not report the page as done until the checks in `06-verify-and-perf.md` pass:
no horizontal overflow at 390px and 1440px, comet within 2px of the viewport center,
veil coverage at 0% before the veil starts fading at 390px, 1440px and 2560px,
prerendered HTML containing every heading, and no console errors.
