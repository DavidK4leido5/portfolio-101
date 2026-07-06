import gsap from 'gsap'
import { uniforms } from './shared'

let countTween: gsap.core.Tween | null = null
let sliderTween: gsap.core.Tween | null = null

export function animateNodeCount(to: number, duration = 1.35): gsap.core.Tween {
  const from = uniforms.uNodeCount.value
  if (Math.abs(to - from) < 1) {
    uniforms.uNodeCount.value = to
    return gsap.to({}, { duration: 0 })
  }

  countTween?.kill()
  sliderTween?.kill()

  if (to > from) {
    uniforms.uRevealFrom.value = from
    uniforms.uSliderSpawn.value = 0
    sliderTween = gsap.to(uniforms.uSliderSpawn, {
      value: 1,
      duration: duration * 0.95,
      ease: 'power3.out',
    })
  } else {
    uniforms.uRevealFrom.value = to
    uniforms.uSliderSpawn.value = 1
  }

  countTween = gsap.to(uniforms.uNodeCount, {
    value: to,
    duration,
    ease: to > from ? 'power2.inOut' : 'power2.out',
  })

  return countTween
}

export function runIntroSpawn(duration = 5.4): gsap.core.Timeline {
  uniforms.uSpawn.value = 0
  uniforms.uSliderSpawn.value = 1
  // Route every node through the uSpawn intro branch (idx < uRevealFrom);
  // animateNodeCount reassigns this when the density slider is used later
  uniforms.uRevealFrom.value = 1e9
  uniforms.uConnect.value = 0

  // Hold the scattered field briefly, then converge with a strong slow-in/fast rush
  const hold = duration * 0.14
  const clusterEnd = duration * 0.84

  return gsap.timeline()
    .to(uniforms.uSpawn, { value: 1, duration: clusterEnd - hold, ease: 'power3.inOut' }, hold)
    .to(uniforms.uIntroPulse, { value: 1, duration: duration * 0.4, ease: 'power2.out' }, clusterEnd * 0.6)
    .to(uniforms.uIntroPulse, { value: 0, duration: duration * 0.32, ease: 'power2.in' }, clusterEnd * 0.8)
    .to(uniforms.uConnect, { value: 1, duration: duration * 0.4, ease: 'power2.out' }, clusterEnd * 0.78)
}

export function killNodeTweens() {
  countTween?.kill()
  sliderTween?.kill()
}
