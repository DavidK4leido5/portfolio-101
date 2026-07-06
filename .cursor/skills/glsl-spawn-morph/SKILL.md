---
name: glsl-spawn-morph
description: >-
  GLSL patterns for scatter-to-target particle morph animations, stagger timing,
  curved convergence paths, and expanding shockwave color fronts. Use when
  animating particle intros, density sliders, or organic wave effects in custom
  Three.js shaders.
---

# GLSL Spawn & Morph

Uniform-driven particle morph from scatter positions to targets, plus expanding wave fronts for color activity.

## Spawn driver uniforms

| Uniform | Role |
|---------|------|
| `uSpawn` | Intro morph 0→1 (GSAP) |
| `uSliderSpawn` | Density-increase morph 0→1 |
| `uRevealFrom` | Index split: below = intro path, above = slider path |
| `uNodeCount` | Active pool slice |
| `uConnect` | Gate connection visibility |

## Critical spawn math

**Every node must reach t=1 when driver hits 1:**

```glsl
float particleSpawnT(float seed, float idx) {
  if (idx >= uNodeCount) return 0.0;
  float stagger = seed * 0.82;  // cap below 1.0 for slider path
  return clamp((uSpawn - stagger) / (1.0 - stagger), 0.0, 1.0);
}
```

Wrong denominator `(1.0 - stagger * 0.4)` strands high-seed nodes mid-scatter → lines stretch outside shape.

## Ease + morph

```glsl
float spawnEase(float t) {
  t = clamp(t, 0.0, 1.0);
  return 1.0 - pow(1.0 - t, 2.8);
}

vec3 morphedPos(vec3 target, vec3 scatter, float seed, float idx) {
  float t = spawnEase(particleSpawnT(seed, idx));
  vec3 p = mix(scatter, target, t);
  // optional curved arc (zero at t=0 and t=1):
  vec3 dir = scatter - target;
  vec3 tangent = cross(dir, vec3(sin(seed*12.9), 0.55, cos(seed*7.7)));
  float tl = length(tangent);
  if (tl > 0.001) p += normalize(tangent) * sin(t * 3.14159265) * (0.9 + seed * 1.8);
  return p;
}
```

## Visibility rules

```glsl
// Intro nodes: visible while scattered (idx < uRevealFrom → always show)
// Slider nodes: hidden until their stagger starts
bool hideParticle(float idx) {
  if (idx >= uNodeCount) return true;
  if (idx >= uRevealFrom) return particleSpawnT(aSeed, idx) <= 0.001;
  return false;
}
```

During intro set `uRevealFrom = 1e9` so all nodes use intro branch.

## Displacement (post-morph)

Scale noise/drift by `morph²` so scattered nodes drift, settled nodes breathe subtly:

```glsl
vec3 displace(vec3 pos, float seed, float morph) {
  float k = morph * morph;
  // simplex noise offset × k
  // ambient drift × (1.0 - k) while still scattered
}
```

## Connection sync

Connections use identical `morphedPos` + `displace`. Gate alpha:

```glsl
vAlpha *= smoothstep(0.82, 1.0, morph) * uConnect;
```

Defer `uConnect` animation until ~78% through intro so lines don't chase flying nodes.

## Shockwave front (waveFront)

Expanding sphere with organic edge — reuse for hover + ambient activity:

```glsl
float waveFront(vec3 pos, vec3 origin, float ph, float sharp) {
  float d = distance(pos, origin);
  float w = exp(-sharp * abs(d - ph * 7.0)) * (1.0 - ph) * (1.0 - ph);
  w *= 0.7 + 0.5 * sin(dot(pos, vec3(2.3, 1.9, 2.7)) + uTime * 1.6);
  return max(w, 0.0);
}
```

| Use | Origin | Intensity | Color |
|-----|--------|-----------|-------|
| Hover | section hotspot | ph via GSAP `uWaveT` | `uSectionColors[i]` |
| Ambient | random surface points array | slow auto cycle | accent mix |

## Scatter volume (intro)

Fill camera frustum, not radial shell around target:

```typescript
function scatterAnywhere(): [number, number, number] {
  return [
    (Math.random() - 0.5) * 23,
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 10 + 1.5,
  ]
}
```

## Related skills

- R3F wiring: `r3f-particle-cloud`
- GSAP drivers: `gsap-shader-scenes`
