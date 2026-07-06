---
name: cinematic-webgl-app
description: >-
  Full-stack pattern for cinematic WebGL portfolio apps: Zustand scene state,
  HUD overlays, 3D sector labels, camera section navigation, and pointer-events
  layering over canvas. Use when building interactive 3D portfolio sites with
  React UI floating over React Three Fiber canvases.
---

# Cinematic WebGL App Shell

React UI + R3F canvas + Zustand phase machine. Separates content data from 3D scene wiring.

## State machine (two axes)

```typescript
type LoadPhase = 'loading' | 'intro' | 'ready'   // boot + intro gate
type Phase = 'idle' | 'travel' | 'arrived'        // navigation gate

// loadPhase: when sectors/slider appear
// phase: camera flight + overlay panel
```

Store actions:
- `navigateTo(id)` → `{ activeSection, phase: 'travel', returning: false }`
- `arrive()` → `{ phase: 'arrived' }`
- `returnHome()` → `{ phase: 'travel', returning: true, hoveredSection: null }`
- `settleHome()` → `{ phase: 'idle', activeSection: null, returning: false }`

Sync store → uniforms each frame in `SceneUniforms`:

```typescript
uniforms.uHovered.value = hoveredSection ? SECTION_IDS.indexOf(hoveredSection) : -1
uniforms.uActive.value = activeSection ? SECTION_IDS.indexOf(activeSection) : -1
```

## Content vs scene separation

| Layer | Location | Contains |
|-------|----------|----------|
| Content | `src/content/portfolio.ts` | Name, projects, skills, copy, image URLs |
| Scene | `src/data/sections.ts` | Hotspot positions, camera offsets, colors, radii |

Never put 3D coordinates in content files.

## Sector labels (3D → 2D)

Project hotspot world positions each frame, place HTML buttons:

```typescript
hotspotWorld(i, vec).project(camera)
// x: (proj.x * 0.5 + 0.5) * width
// y: (-proj.y * 0.5 + 0.5) * height
```

Run separation pass if labels overlap (`MIN_IND_GAP ~118px`). Skip projection until `loadPhase === 'ready'`.

## Pointer-events layering (critical)

Canvas is full-screen. UI is `position: fixed; inset: 0; pointer-events: none`:

```css
.ui { pointer-events: none; }
.indicators { pointer-events: none; }  /* container */
.indicator { pointer-events: auto; }    /* buttons only */
.node-control { pointer-events: auto; }
.overlay { pointer-events: none; }
.panel { pointer-events: auto; }
```

Full-screen containers with `pointer-events: auto` block the density slider and HUD clicks.

## Sector visibility

Hidden until brain assembled:

```typescript
const uiReady = loadPhase === 'ready'
gsap.set(el, { autoAlpha: 0 })           // when !uiReady
gsap.to(el, { autoAlpha: phase === 'idle' ? 1 : 0 })  // when ready
```

CSS fallback: `.indicators { visibility: hidden }` until GSAP reveals.

## Overlay panel

Show on `phase === 'arrived'`. GSAP fade/slide in. Escape key → `returnHome()`. Back button same.

Camera frames content: panel on right, brain on left (`justify-content: flex-end`).

## Section focus (shader side)

- Hover: `uHovered` + optional `triggerSectorWave(i)` on mouseenter
- Click: `uActive` during travel, `uFocus`/`uDim` after arrived
- Shader: `targetMix(aAffinity)` compares affinity to hovered/active index

## Loading screen

`LoadingScreen` until WebGL ready → `startIntro()` → intro runs → `finishIntro()` → sectors appear.

## Quality + density slider

Tier from viewport breakpoints. Slider calls `animateNodeCount(n)` + store `setNodeCount`. Show slider only when `loadPhase === 'ready'`.

## App structure

```
App.tsx
  LoadingScreen (loadPhase loading)
  HomeScene (Canvas)
    SceneBoot, SceneUniforms, BrainScene, IntroSequence, CameraRig, Projection, PostProcessing
  PortfolioUI (fixed overlay)
```

## Related skills

- Particles: `r3f-particle-cloud`
- Animation: `gsap-shader-scenes`
- Deploy/test: `webgl-smoke-deploy`
- This repo: `neural-portfolio`
