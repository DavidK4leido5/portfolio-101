---
name: neural-portfolio
description: >-
  Builds and maintains the Neural Portfolio — a React/Three.js WebGL brain particle
  portfolio (R3F, GLSL, GSAP, Zustand). Use when working on this repo or similar
  cinematic 3D portfolio sites: brain particle clouds, sector navigation, intro
  spawn animations, shader uniforms, lobe highlighting, shockwave effects, Playwright
  smoke tests, or GitHub Pages CI/CD deploy.
---

# Neural Portfolio

Interactive 3D portfolio: ~24k surface-sampled brain particles, five section lobes, cinematic intro, GSAP camera travel, custom GLSL shaders.

## Stack

React 19 · Vite 8 · TypeScript · R3F · Three.js · GSAP · Zustand · Playwright · GitHub Pages

## Architecture (read before editing)

```
content/     portfolio.ts — user copy ONLY (name, projects, skills, etc.)
data/        brainCloud.ts (baked, auto-gen) + sections.ts (lobe hotspots, colors, camera offsets)
scene/       WebGL: NeuralCluster, ConnectionSystem, shaders, CameraRig, IntroSequence
store/       sceneStore — phase + loadPhase state machine
ui/          PortfolioUI (HUD, sectors, slider), LoadingScreen
lib/         quality tiers, spatial hash, node limits, accent color
```

**Separation rule:** content = data; `sections.ts` = 3D wiring. Never put coordinates in `content/`.

## State machine

Two orthogonal axes — do not conflate them:

| Axis | Values | Controls |
|------|--------|----------|
| `loadPhase` | `loading` → `intro` → `ready` | Boot overlay, intro spawn, sector visibility |
| `phase` | `idle` → `travel` → `arrived` | Camera flight, overlay panel, focus/dim |

Sector labels: hidden until `loadPhase === 'ready'`. GSAP fades them with `phase === 'idle'`.

## Uniform contract (`src/scene/shared.ts`)

All particle + connection shaders share one `uniforms` object via `makeMaterial()`.

| Uniform | Driver | Purpose |
|---------|--------|---------|
| `uSpawn` | GSAP intro | 0→1 cluster animation |
| `uSliderSpawn` | GSAP slider | Reveal new nodes when density increases |
| `uRevealFrom` | nodeAnimator | Split intro vs slider spawn paths |
| `uConnect` | GSAP intro | Lines fade in after nodes settle (~78% intro) |
| `uNodeCount` | store + slider | Active pool slice |
| `uActive` / `uHovered` | store → SceneUniforms | Section index (-1 = none) |
| `uFocus` / `uDim` | CameraRig GSAP | Lobe highlight after modal opens |
| `uWaveSection` / `uWaveT` | triggerSectorWave | Hover shockwave |
| `uAmbientOrigins[8]` | random surface picks | Ambient activity wave sources |

DEV only: `window.__scene.uniforms` for Playwright assertions.

## Shader invariants (do not break)

### 1. Spawn math must reach t=1

```glsl
// CORRECT — every node fully morphed when driver hits 1
return clamp((uSpawn - stagger) / (1.0 - stagger), 0.0, 1.0);

// WRONG — high-seed nodes strand mid-scatter, lines stretch outside brain
return clamp((uSpawn - stagger) / (1.0 - stagger * 0.4), 0.0, 1.0);
```

### 2. Particles and connections share `MOTION` chunk

Connection vertex shader must call the same `morphedPos()` + `displace()` as particles. Never compute line positions separately.

### 3. Connections gate on morph + connect

```glsl
vAlpha *= smoothstep(0.82, 1.0, morph);  // both endpoints settled
if (uConnect < 0.01) discard;
```

### 4. All nodes are brain-surface samples

`makeCloud()` samples `brainSurface` only. Lobe membership via `assignLobes()` (proximity to section hotspot + radius). **No separate gaussian blobs at hotspots.**

### 5. Intro scatter fills the frustum

Scatter positions use `scatterAnywhere()` (23×14×10 volume), not radial burst from target. Curved flight uses `sin(t·π)` tangent offset — zero at both endpoints so rest positions stay exact.

### 6. Intro visibility

During intro: `uRevealFrom = 1e9` routes all nodes through `uSpawn` branch. Intro-branch nodes stay visible while scattered (`hideParticle` returns false for idx < uRevealFrom).

## Brain mesh pipeline

```
scripts/brain.obj  →  scripts/bake-brain-cloud.mjs  →  src/data/brainCloud.ts
```

CC BY 4.0 FrankJohansson mesh. Regenerate: `pnpm bake:brain`. Do not hand-edit `brainCloud.ts`.

Display scale: baked `BRAIN_SCALE` × `CLUSTER_SCALE` (1.18) in `shared.ts`. Camera: `CAM_BASE = (0, 0.5, 9.8)`.

## Visual effects

### Hover shockwave
`triggerSectorWave(sectionIndex)` in `nodeAnimator.ts` → GSAP `uWaveT` 0→1. Shader `waveFront()` expands from `uHotspots[section]`. Wired to sector `onMouseEnter` / `onFocus`.

### Ambient activity
Same `waveFront()` from `uAmbientOrigins[]` (8 random surface points per load). One wave at a time, cycling origins. Accent-tinted, ~60% hover intensity. Suppressed when `uFocus > 0`.

### Section focus (click)
Travel: `uDim` ramps. Arrived: `uFocus` ramps, matching `aAffinity` nodes brighten via `targetMix()`. Return: snap `uFocus`/`uDim` to 0 immediately.

## UI pointer-events (common bug)

```css
.ui { pointer-events: none; }
.indicators { pointer-events: none; }   /* container never blocks slider */
.indicator { pointer-events: auto; }    /* buttons only */
.node-control { pointer-events: auto; }
.overlay { pointer-events: none; }
.panel { pointer-events: auto; }
```

Slider was broken when `.indicators` or `.overlay` had `pointer-events: auto` on full-screen containers.

## Quality tiers (`src/lib/quality.ts`)

`desktop` / `tablet` / `mobile` — pool size, max connections, DPR, post-processing flags, travel duration. Node limits in `src/lib/nodes.ts` (min/default/max per tier).

## Common tasks

### Edit portfolio content
Only touch `src/content/portfolio.ts`. Images: `cdnUrl` or `localPath` under `src/content/assets/`.

### Add / reposition a section
1. Add id to `SECTION_IDS` in `sections.ts`
2. Define hotspot (from `brainHotspots` or manual), `cameraOffset`, `radius`, `color`
3. Add copy in `portfolio.ts` + `sectionCopy`
4. Extend shader `uSectionColors[5]` → `[6]` if adding beyond 5 (array size is hardcoded in GLSL)

### Tune intro timing
`runIntroSpawn()` in `nodeAnimator.ts` + `IntroSequence.tsx`. Hold phase at start, cluster ease, connect delay. Reduced motion: `prefers-reduced-motion` short-circuits to ~0.6s.

### Adjust brain on screen
`CAM_BASE.z`, `CLUSTER_SCALE`, canvas `fov: 49`. Re-screenshot with `tests/shot.mjs`.

### Change node density defaults
`src/lib/nodes.ts` → `NODE_LIMITS[tier].{min,default,max,pool}`.

## Testing

```bash
pnpm dev                              # terminal 1
pnpm exec playwright install chromium # once
pnpm test                             # terminal 2, hits localhost:5173

# CI-style against production build
pnpm build && pnpm preview
SMOKE_URL=http://localhost:4173 SMOKE_LOOPS=1 pnpm test
```

Smoke asserts: canvas renders, sectors hidden during intro / visible after ready, slider hit-test, hover wave uniforms, section navigation + overlay, focus/dim on arrive/return.

Headless GL is slow (~2-3 fps) — tests use long timeouts (60-90s). Visual checks: `tests/shot.mjs`.

## Deploy (GitHub Pages)

`.github/workflows/ci-cd.yml`: build → smoke → rebuild with `VITE_BASE_PATH=/${{ github.event.repository.name }}/` → deploy.

`vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/'`

One-time: repo **Settings → Pages → Source: GitHub Actions**.

## Debugging checklist

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Nodes outside brain / wild lines | Bad spawn denominator or connections not sharing MOTION | Fix `particleSpawnT`, verify `morphedPos` shared |
| Sectors visible during intro | GSAP autoAlpha before ready | Gate on `loadPhase === 'ready'` |
| Slider dead in idle/arrived | Full-screen layer blocking clicks | `pointer-events: none` on containers |
| Stale preview | Serving old `dist/` | `pnpm build` or use `pnpm dev` |
| R3F uniform not updating | Cloned uniform object | Use single `uniforms` ref in `makeMaterial()` |
| uDim stuck after return | Idle lerp fighting GSAP | Snap on return start; don't lerp uDim in useFrame |
| Brain shape wrong after edit | Edited brainCloud.ts by hand | Re-run `pnpm bake:brain` |

## Ponytail rules for this repo

- Reuse `uniforms`, `makeMaterial()`, `waveFront()`, `MOTION` — don't duplicate shader logic
- Fix spawn/hide/morph in shaders once, not per caller
- Smoke test any change touching intro, sectors, focus, or pointer-events
- No new deps for effects already doable in GLSL + GSAP
- Delete over add (constellation was removed; lobe highlight replaced it)

## Reusable skill family

Use these when building similar projects from scratch:

| Skill | Scope |
|-------|-------|
| `r3f-particle-cloud` | R3F Points + LineSegments, shared uniforms, quality tiers |
| `mesh-to-point-cloud` | OBJ → baked surface Float32Array pipeline |
| `glsl-spawn-morph` | Scatter→target morph, stagger math, waveFront shocks |
| `gsap-shader-scenes` | GSAP uniform timelines, camera travel, intro |
| `cinematic-webgl-app` | Zustand phases, HUD/sectors, pointer-events layering |
| `webgl-smoke-deploy` | Playwright smoke + GitHub Pages CI/CD |

## Reference

File map, shader function index, and CI env vars: [reference.md](reference.md)
