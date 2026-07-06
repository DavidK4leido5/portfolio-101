---
name: r3f-particle-cloud
description: >-
  Builds React Three Fiber particle cloud systems with custom GLSL shaders,
  spatial-hash connections, and quality tiers. Use when creating WebGL particle
  portfolios, neural networks, mesh visualizations, or any R3F Points + LineSegments
  project with shared uniform-driven animation.
---

# R3F Particle Cloud

Pattern for performant particle systems in React Three Fiber with one shared `uniforms` object driving particles and connections.

## Minimal architecture

```
scene/
  shared.ts           → uniforms object (single source of truth)
  NeuralCluster.tsx   → makeCloud(), makeMaterial(), <points>
  ConnectionSystem.tsx→ spatial-hash lines, same makeMaterial + MOTION chunk
  shaders.ts          → NOISE + MOTION chunks, particleVert/Frag, connectionVert/Frag
lib/
  spatialHash.ts      → buildConnections(positions, { maxDist, neighbors, activeCount })
  quality.ts            → tier presets (pool, maxConnections, dpr, rebuildMs)
  nodes.ts              → min/default/max pool + slider limits per tier
```

## Core rules

1. **One uniforms object** — pass the same ref to every `ShaderMaterial`. R3F clones if you spread; use `makeMaterial(vert, frag)` factory.
2. **Shared MOTION chunk** — particle and connection vertex shaders `#include` identical position logic (`morphedPos`, `displace`, `hideParticle`). Lines must track particles exactly.
3. **Pool + active slice** — allocate max pool once; `uNodeCount` controls visible slice. Slider animates count via `uRevealFrom` + `uSliderSpawn`.
4. **Additive blending** — particles: `transparent: true, depthWrite: false, blending: AdditiveBlending`.
5. **Frustum cull off** — `frustumCulled={false}` on Points and LineSegments (bounds don't match morphed positions).

## makeMaterial pattern

```typescript
export function makeMaterial(vertexShader: string, fragmentShader: string): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,          // imported singleton
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}
```

## Cloud buffers (per node i)

| Attribute | Purpose |
|-----------|---------|
| `position` | Target (rest) position |
| `aScatter` | Intro start position |
| `aSeed` | Stagger seed 0..1 |
| `aAffinity` | Group/section index (-1 = none) |
| `aIndex` | Pool slot (for spawn math) |

## Connection rebuild

Rebuild on interval (`rebuildMs` per tier), gated on `uConnect > 0.05`. Use `activeCount: Math.floor(uNodeCount.value)` so new slider nodes get connections. Set `drawRange(0, 0)` when connect hidden.

## Quality tiers

```typescript
export const QUALITY: Record<Tier, TierConfig> = {
  desktop: { maxConnections: 6000, neighbors: 5, maxDist: 0.36, dpr: 2, ... },
  tablet:  { maxConnections: 3200, neighbors: 4, ... },
  mobile:  { maxConnections: 1600, neighbors: 3, dpr: 1, bloom: false, ... },
}
```

Detect tier via `matchMedia` breakpoints. Key pool by tier so cloud rebuilds on resize crossing breakpoint.

## R3F pitfalls

| Issue | Fix |
|-------|-----|
| Uniforms not updating | Single object ref, mutate `.value` |
| Lines don't match dots | Share MOTION chunk, never duplicate position math |
| Flash on mount | Don't reset `uSpawn=1` until `loadPhase === 'ready'` |
| Dev debugging | Expose `window.__scene = { uniforms }` in DEV only |

## Related skills

- Surface sampling: `mesh-to-point-cloud`
- Spawn animation: `glsl-spawn-morph`
- Timelines: `gsap-shader-scenes`
- Full app shell: `cinematic-webgl-app`

Reference implementation: `.cursor/skills/neural-portfolio/`
