import gsap from 'gsap'
import { sections } from '../data/sections'
import { triggerSectorWave } from '../scene/nodeAnimator'
import { useSceneStore } from '../store/sceneStore'

/** Outward slide: left-of-center labels come from the left, right from the right. */
export function outwardSlideX(el: HTMLElement): number {
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  return cx < innerWidth * 0.5 ? -52 : 52
}

/**
 * Cascade sector labels in from the side they point, firing hover + lobe wave
 * as each one lands. Resolves when the last beat settles.
 */
export function runSectorLabelReveal(
  buttons: HTMLElement[],
  opts?: { reduced?: boolean },
): gsap.core.Timeline {
  const reduced = opts?.reduced ?? false
  const setHovered = useSceneStore.getState().setHovered

  gsap.set(buttons, { autoAlpha: 0, x: 0 })

  const tl = gsap.timeline({
    onComplete: () => {
      setHovered(null)
      useSceneStore.getState().finishLabels()
    },
  })

  if (!buttons.length) {
    tl.call(() => useSceneStore.getState().finishLabels())
    return tl
  }

  if (reduced) {
    gsap.set(buttons, { autoAlpha: 1, x: 0 })
    tl.to({}, { duration: 0.15 })
    return tl
  }

  const step = 0.58
  buttons.forEach((btn, i) => {
    const fromX = outwardSlideX(btn)
    const at = i * step
    const id = sections[i]?.id

    tl.call(() => {
      if (id) setHovered(id)
      triggerSectorWave(i, 1.55)
    }, undefined, at)

    tl.fromTo(
      btn,
      { autoAlpha: 0, x: fromX },
      { autoAlpha: 1, x: 0, duration: 0.52, ease: 'power3.out' },
      at,
    )
  })

  // Let the last wave settle before unlocking the page
  tl.to({}, { duration: 0.55 })
  return tl
}
