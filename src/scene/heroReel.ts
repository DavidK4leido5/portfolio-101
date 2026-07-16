import gsap from 'gsap'
import { profile, type HeroShapeId } from '../content/portfolio'
import { uniforms } from './shared'

export const SHAPE_ID: Record<HeroShapeId, number> = {
  brain: 0,
  network: 1,
  stack: 2,
}

/** Section tint / activity suppression level while showing a non-brain shape. */
const ALT_LEVEL = 0.85

export const heroReelState = {
  beatIndex: 0,
  activeText: profile.hero.beats[0]?.text ?? '',
  running: false,
}

let timeline: gsap.core.Timeline | null = null
let returnTween: gsap.core.Tween | null = null

export type HeroTextCallbacks = {
  onOut?: () => void
  onIn?: (text: string, index: number) => void
}

let textCb: HeroTextCallbacks = {}

export function setHeroTextCallbacks(cb: HeroTextCallbacks) {
  textCb = cb
}

function settleShape(id: number) {
  uniforms.uShapeFrom.value = id
  uniforms.uShapeTo.value = id
  uniforms.uShapeMorph.value = 0
}

/** Morph uShapeMorph 0→1 (from→to) and ride uShapeAlt to the destination level. */
function addMorph(tl: gsap.core.Timeline, fromId: number, toId: number, dur: number, at: gsap.Position) {
  tl.call(() => {
    uniforms.uShapeFrom.value = fromId
    uniforms.uShapeTo.value = toId
    uniforms.uShapeMorph.value = 0
  }, undefined, at)
  tl.to(uniforms.uShapeMorph, {
    value: 1,
    duration: dur,
    ease: 'power2.inOut',
    onComplete: () => settleShape(toId),
  }, at)
  tl.to(uniforms.uShapeAlt, {
    value: toId === 0 ? 0 : ALT_LEVEL,
    duration: dur,
    ease: 'power2.inOut',
  }, at)
}

export function stopHeroReel() {
  timeline?.kill()
  timeline = null
  heroReelState.running = false
  returnTween?.kill()

  // Glide back to the brain instead of snapping. If killed mid-morph the cloud
  // pops to the nearest settled shape first — rare (navigation during a 1.4s
  // morph) and cheaper than capturing blended positions per node.
  const midMorph = uniforms.uShapeMorph.value > 0.001
  const current = midMorph && uniforms.uShapeMorph.value > 0.5
    ? uniforms.uShapeTo.value
    : uniforms.uShapeFrom.value

  if (current === 0 && !midMorph) {
    settleShape(0)
    uniforms.uShapeAlt.value = 0
    return
  }

  uniforms.uShapeFrom.value = current
  uniforms.uShapeTo.value = 0
  uniforms.uShapeMorph.value = 0
  returnTween = gsap.to(uniforms.uShapeMorph, {
    value: 1,
    duration: 0.9,
    ease: 'power2.inOut',
    onComplete: () => {
      settleShape(0)
      uniforms.uShapeAlt.value = 0
    },
  })
  gsap.to(uniforms.uShapeAlt, { value: 0, duration: 0.9, ease: 'power2.inOut' })
}

export function startHeroReel(morphEnabled: boolean) {
  timeline?.kill()
  timeline = null
  returnTween?.kill()
  returnTween = null
  settleShape(0)
  uniforms.uShapeAlt.value = 0

  const { beats, holdSec, morphSec, textOutSec } = profile.hero
  if (!beats.length) return

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    const last = beats.length - 1
    heroReelState.beatIndex = last
    heroReelState.activeText = beats[last].text
    textCb.onIn?.(beats[last].text, last)
    return
  }

  heroReelState.running = true
  heroReelState.beatIndex = 0
  heroReelState.activeText = beats[0].text

  const tl = gsap.timeline({ repeat: -1 })

  // Each loop iteration: hold current beat, then transition text + shape to the next
  for (let i = 0; i < beats.length; i++) {
    const next = beats[(i + 1) % beats.length]
    const nextIndex = (i + 1) % beats.length
    const fromId = SHAPE_ID[beats[i].shape]
    const toId = SHAPE_ID[next.shape]

    tl.to({}, { duration: holdSec })
    tl.call(() => { textCb.onOut?.() })

    const transitionStart = tl.duration()
    if (morphEnabled && fromId !== toId) {
      addMorph(tl, fromId, toId, morphSec, transitionStart)
    }

    tl.call(() => {
      heroReelState.beatIndex = nextIndex
      heroReelState.activeText = next.text
      textCb.onIn?.(next.text, nextIndex)
    }, undefined, transitionStart + textOutSec)

    // Ensure the timeline extends through the longer of morph / text swap
    const transitionLen = Math.max(morphEnabled && fromId !== toId ? morphSec : 0, textOutSec)
    tl.to({}, { duration: 0.01 }, transitionStart + transitionLen)
  }

  timeline = tl
}
