# Plan: Ambient Floating Particles

**Source**: user request 2026-07-15
**Complexity**: Medium
**Base**: neural portfolio with hero typography, smoke tests green

## Summary

Replace the static inline `Dust` component with a GPU-driven `AmbientParticles` system — slow-drifting atmospheric points in a shell around the brain, visually separate from neural nodes. One draw call, tier-gated counts, intro fade, and strict visual hierarchy so the brain remains the unmistakable focal point.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `NeuralCluster.tsx`, `ConnectionSystem.tsx` | PascalCase scene components in `src/scene/` |
| Particles | `NeuralCluster.tsx:121-132` | `<points frustumCulled={false}>` + custom `ShaderMaterial` |
| Shaders | `shaders.ts` | Reuse `NOISE` chunk; separate vert/frag exports; own material factory |
| Quality tiers | `lib/quality.ts` | Per-tier counts in `QUALITY`; mobile = 0 |
| Uniforms | `shared.ts` + `SceneUniforms` | Read `uniforms.uTime`, `uniforms.uAccent`, `uniforms.uDim` — no new store slice |
| Intro fade | `IntroSequence.tsx`, `CameraRig.tsx` | Tie visibility to `loadPhase` or existing `uDim` |
| Tests | `tests/smoke.mjs` | Playwright smoke pass; no visual regression on brain/nav |

## Files to Change

| File | Action | Why |
|---|---|---|
| `src/scene/AmbientParticles.tsx` | CREATE | New ambient particle mesh + material wiring |
| `src/scene/shaders.ts` | UPDATE | Add `ambientVert` / `ambientFrag` (~40 lines) |
| `src/lib/quality.ts` | UPDATE | Rename `dust` → `ambient` with tuned counts |
| `src/scene/HomeScene.tsx` | UPDATE | Remove inline `Dust`; render `<AmbientParticles />` |
| `tests/smoke.mjs` | UPDATE (optional) | Assert canvas still renders; no new failure modes |

## Architecture

```
Canvas
├── AmbientParticles     ← NEW (renderOrder -10, outside ClusterGroup)
├── BrainScene (ClusterGroup)
│   ├── NeuralCluster
│   └── ConnectionSystem
├── IntroSequence / CameraRig / Projection
└── PostProcessing (Bloom threshold 0.62 — ambient must stay below)
```

**Key rule**: Ambient lives outside `ClusterGroup` so it does not inherit brain rotation, breath scale, or hotspot logic.

## Visual Design (brain stays hero)

| Property | Ambient | Brain (reference) |
|---|---|---|
| Placement | Hollow shell / annulus, inner exclusion ~4u | Structured surface cloud |
| Opacity | 0.06–0.14 | Shader peaks higher |
| Size | 0.015–0.035 | Larger hot nodes |
| Blending | `NormalBlending` | Additive glow |
| Motion | Slow noise drift, 8–20s cycles | Sub-second reactivity |
| Color | Cool gray `#7788aa` + 8–12% `uAccent` wash | Section colors + bloom |
| Reactivity | None (no mouse, no sector) | Full interactivity |

**Squint test**: one bright structured mass (brain) + soft atmospheric grain. Ambient disappears first.

## Tasks

### Task 1: Quality tier counts
- **Action**: Replace `dust` with `ambient: 120 | 50 | 0` in `quality.ts`
- **Mirror**: Existing `dust` tier pattern (`mobile: 0`)
- **Validate**: `pnpm exec tsc --noEmit`

### Task 2: Ambient shaders
- **Action**: Add `ambientVert` (noise drift + `aSeed` phase) and `ambientFrag` (soft circle, accent tint, capped luminance < 0.5)
- **Mirror**: `particleVert` motion style but simpler; import shared `NOISE`
- **Validate**: Build succeeds; no shader compile errors in dev

### Task 3: AmbientParticles component
- **Action**: Build geometry once in `useMemo` — positions in shell with inner hole; `aSeed` attribute; material reads `uTime`, `uAccent`, `uFade`
- **Mirror**: `NeuralCluster.tsx` points setup; `useSceneStore` for tier
- **Validate**: Particles visible on desktop, off on mobile

### Task 4: Wire into HomeScene
- **Action**: Delete `Dust` function; add `<AmbientParticles />` as sibling before `BrainScene`
- **Mirror**: Current `<Dust count={cfg.dust} />` slot
- **Validate**: Brain intro, rotation, sectors unchanged

### Task 5: Intro + travel fade
- **Action**: Fade ambient in during intro completion; dim to ~60% during section travel via `uDim`
- **Mirror**: `IntroSequence` reduced-motion guard
- **Validate**: Ambient not visible during boot; fades with brain assembly

### Task 6: Visual tune + smoke
- **Action**: Tune opacity/size/exclusion until squint test passes; run smoke suite
- **Validate**: `VITE_SMOKE=true pnpm build && pnpm test`

## What NOT to Build (YAGNI)

- No `@react-three/drei` Stars/Sparkles (new dep)
- No particle manager / object pool
- No mouse or sector reactivity on ambient
- No second postprocessing pass
- No Zustand slice for ambient
- No CSS/DOM particles
- No coupling to `ConnectionSystem` or brain shaders

## Optional Enhancements (defer unless trivial)

- 2–3 very faint "streak" particles (elongated in shader via `aLayer`) — only if single shader seed variance isn't enough
- `prefers-reduced-motion`: freeze drift or hide ambient

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Bloom picks up ambient, competes with brain | Medium | Normal blending; cap fragment luminance; no additive |
| Particles clip through brain silhouette | Medium | Inner exclusion radius; lower opacity on front-layer |
| Visual clutter with connections | Low | Smaller, dimmer, slower than connection lines |
| Mobile perf hit | Low | Count = 0 on mobile (existing convention) |
| Intro timing clash | Low | Fade tied to `loadPhase` / `uDim` |

## Validation

```bash
pnpm exec tsc --noEmit
VITE_SMOKE=true pnpm exec vite build
SMOKE_URL=http://127.0.0.1:4173 SMOKE_LOOPS=1 pnpm test
```

Manual checks:
- [ ] Squint test: brain is clear hero at idle, hover, and travel
- [ ] Ambient does not rotate with brain during intro
- [ ] Mobile tier: no ambient particles
- [ ] `prefers-reduced-motion`: ambient static or hidden

## Acceptance

- [ ] Brain remains unmistakable focal point in all phases
- [ ] Single new draw call on desktop/tablet; zero on mobile
- [ ] No frame-time regression >1ms sustained on desktop
- [ ] Ambient separate from neural nodes (different placement, shader, motion)
- [ ] Smoke tests pass
- [ ] No new dependencies

## Estimated Effort

| Phase | Time |
|---|---|
| Shaders + component | 45–60 min |
| Wire + intro fade | 15–20 min |
| Visual tuning | 20–30 min |
| Smoke validation | 10 min |
| **Total** | **~1.5–2 hours** |
