---
name: gsap-shader-scenes
description: >-
  GSAP timelines driving Three.js shader uniforms, cinematic camera moves, and
  intro sequences for WebGL scenes. Use when animating uSpawn, uFocus, camera
  travel, or coordinating loadPhase gates with uniform tweens in R3F apps.
---

# GSAP Shader Scenes

Animate WebGL scenes by tweening uniform `.value` fields and camera vectors with GSAP — not React state per frame.

## Setup

```typescript
import gsap from 'gsap'
gsap.ticker.lagSmoothing(0)  // important for slow headless GL

// uniforms.uSpawn.value = 0.5  ← mutate .value, not the uniform object
```

Kill competing timelines on phase change:

```typescript
travelTlRef.current?.kill()
focusTlRef.current?.kill()
```

## Intro timeline pattern

```typescript
export function runIntroSpawn(duration = 5.4): gsap.core.Timeline {
  uniforms.uSpawn.value = 0
  uniforms.uRevealFrom.value = 1e9   // all nodes on intro branch
  uniforms.uConnect.value = 0

  const hold = duration * 0.14
  const clusterEnd = duration * 0.84

  return gsap.timeline()
    .to(uniforms.uSpawn, { value: 1, duration: clusterEnd - hold, ease: 'power3.inOut' }, hold)
    .to(uniforms.uIntroPulse, { value: 1, duration: duration * 0.4, ease: 'power2.out' }, clusterEnd * 0.6)
    .to(uniforms.uIntroPulse, { value: 0, duration: duration * 0.32, ease: 'power2.in' }, clusterEnd * 0.8)
    .to(uniforms.uConnect, { value: 1, duration: duration * 0.4, ease: 'power2.out' }, clusterEnd * 0.78)
}
```

Parallel camera + cluster rotation tweens in `IntroSequence.tsx`. On complete: snap `uSpawn=1`, `uConnect=1`, call `finishIntro()`.

## Camera travel (section navigation)

```typescript
// Fly to: pull back → move to dest → lookAt hotspot
tl.to(camera.position, { z: '+=0.9', duration: 0.5 })
  .to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: dur, ease: 'power4.inOut' })
  .to(lookTarget, { x: lookT.x, y: lookT.y, z: lookT.z, duration: dur * 0.85 }, '<')
  .to(uniforms.uDim, { value: 0.55, duration: dur * 0.6 }, dur * 0.35)
tl.eventCallback('onUpdate', () => camera.lookAt(lookTarget))
```

## Focus after modal (arrived phase)

Separate effect keyed on `phase === 'arrived'`:

```typescript
gsap.timeline({ delay: 0.8 })
  .to(uniforms.uFocus, { value: 1, duration: 1.6, ease: 'power2.inOut' })
  .to(uniforms.uDim, { value: 0.65, duration: 1.6 }, '<')
```

## Return home

Snap immediately, then animate camera:

```typescript
uniforms.uFocus.value = 0
uniforms.uDim.value = 0
gsap.timeline({ onComplete: settleHome })
  .to(camera.position, { x: CAM_BASE.x, y: CAM_BASE.y, z: CAM_BASE.z, duration: dur * 0.85 }, 0.35)
```

Do **not** lerp uniforms in `useFrame` while GSAP also drives them — causes stuck mid-values.

## Shockwave trigger

```typescript
export function triggerSectorWave(section: number, duration = 1.7) {
  waveTween?.kill()
  uniforms.uWaveSection.value = section
  uniforms.uWaveT.value = 0
  waveTween = gsap.to(uniforms.uWaveT, { value: 1, duration, ease: 'power1.out' })
}
```

Self-resolving: shader fades wave as `ph` approaches 1.

## Density slider animation

```typescript
// Increase: uRevealFrom = old count, uSliderSpawn 0→1, uNodeCount → new
// Decrease: uRevealFrom = new count, instant hide above slice
```

## Reduced motion

```typescript
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const dur = reduced ? 0.6 : 5.4
```

## loadPhase gating

| Phase | GSAP allowed |
|-------|--------------|
| `loading` | Boot bar only |
| `intro` | Intro spawn + camera |
| `ready` | Idle orbit, travel, focus, waves |

Don't start idle camera drift until `loadPhase === 'ready'`.

## Related skills

- Shader math: `glsl-spawn-morph`
- App state/UI: `cinematic-webgl-app`
- Testing tweens: `webgl-smoke-deploy`
