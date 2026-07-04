# Plan: Section Focus FX — Constellation, DoF Blur, Section Colors, Organic Core

**Source**: user request 2026-07-05 + architect design (agent 816ad88a)
**Complexity**: Medium
**Base**: working neural portfolio (all 10 phases shipped, smoke test green)

## Summary

Four additive visual features: (1) each section gets its own fixed color, and hovering an indicator lights up **all** of that section's nodes in that color; (2) clicking a section draws a bright **star constellation** over the focused cluster as the camera arrives; (3) a **depth-of-field blur** defocuses everything except the focused cluster for drama; (4) the cluster core gains subtle **organic breathing** motion. Zero new files, zero store changes, one new animated uniform.

## Key architect finding

Every material in the scene has `depthWrite: false`, so the depth buffer is empty and a naive `DepthOfField` effect would blur the **entire frame uniformly**. Fix: an invisible depth-proxy sphere (`colorWrite: false`, `depthWrite: true`, `renderOrder: 999`) placed at the focused hotspot. It writes depth only where the focused cluster is, so DoF keeps that region sharp and blurs the rest. Invisible to color, zero visual popping.

## Files to Change (all UPDATE, no new files)

| File | Change |
|---|---|
| `src/data/sections.ts` | Add `color: string` per section (5-hue palette below) |
| `src/scene/shared.ts` | New uniforms `uSectionColors` (static vec3[5]), `uConstel` (0..1, GSAP-driven); new `dofState` module ref `{ focus, bokeh }` |
| `src/scene/shaders.ts` | `displace()`: 2nd noise octave + radial breathing. Particle/connection shaders: section color tint + hover light-up. New constellation line + star shaders (reuse `NOISE`/`MOTION` chunks so they track particle motion exactly) |
| `src/scene/NeuralCluster.tsx` | No structural change (affinity attribute already exists; color logic is shader-side) |
| `src/scene/ConnectionSystem.tsx` | Add `Constellation` sub-component: one LineSegments + one Points (2 extra draw calls), buffers built once per cloud |
| `src/scene/CameraRig.tsx` | flyTo timeline: tween `uConstel` 0→1 near arrival, `dofState.bokeh` in; return: both →0 |
| `src/scene/PostProcessing.tsx` | Add `DepthOfField` (desktop tier only), reads `dofState` per frame, ordered before Bloom |
| `src/scene/HomeScene.tsx` | Add depth-proxy sphere component positioned at active hotspot |
| `src/lib/quality.ts` | Tier flags: `dof: true/false/false`, `dofBokeh`, constellation star count |

## Section palette (harmonizes with the cycling global accent)

| Section | Hue | Hex |
|---|---|---|
| projects | violet | `#7c5cff` |
| experience | magenta-pink | `#ff5c9e` |
| skills | azure | `#4da6ff` |
| about | teal | `#35e0c8` |
| contact | amber | `#ffb85c` |

Rest state: section-affinity particles tint ~35% toward their section color (subtle identity). Hover: target section nodes mix ~90% to section color at ~1.6× brightness; non-target dims via existing `uDim` path. Connection lines between two same-section endpoints inherit the tint.

## Uniforms / state

| Name | Type | Writer |
|---|---|---|
| `uSectionColors` | `vec3[5]` | static, set once in `shared.ts` from `sections[].color` |
| `uConstel` | float 0..1 | GSAP timelines in CameraRig |
| `dofState` | JS module ref `{ focus, bokeh }` | GSAP writes; PostProcessing reads per frame via effect ref |

Existing `uActive` selects which section's constellation shows — no store changes.

## GLSL changes (concrete)

Organic core motion, added inside shared `displace()` (both shaders → connections stay attached by construction):

```glsl
// 2nd octave: low spatial freq, slow, small weight — large-scale "swell"
p += 0.12 * vec3(
  snoise(pos * 0.07 + vec3(uTime * 0.03, 5.0, 0.0)),
  snoise(pos * 0.07 + vec3(0.0, uTime * 0.03 + 11.0, 3.0)),
  snoise(pos * 0.07 + vec3(7.0, 0.0, uTime * 0.03 + 23.0)));
// radial breathing: ±1.5%, phase varies with radius so it ripples outward
p *= 1.0 + 0.015 * sin(uTime * 0.35 - length(pos) * 0.4);
```

Constellation reveal (line shader): per-vertex `aOrder` (0..1 along the path) + `aSection`; alpha = `smoothstep(aOrder, aOrder + 0.08, uConstel) * step(abs(aSection - uActive), 0.5)` — lines draw in sequentially like a pen stroke. Star points: same gate, `gl_PointSize` scales with reveal for a pop; color = section color mixed toward white.

## Constellation generation (deterministic per session)

Per section, at cloud build: take all particles with that section's affinity, farthest-point-sample 10–12 of them (spread guarantees a constellation-like figure), order them with a nearest-neighbor walk from the point closest to the hotspot. All 5 sections packed into one static buffer pair (built once on mount); `uActive` gates which one is visible. No rebuilds, no per-frame CPU work.

## GSAP timeline insertions (CameraRig)

- **flyTo**: at `dur * 0.55` → `.to(uniforms.uConstel, { value: 1, duration: 1.1, ease: 'power2.out' })`; at `dur * 0.5` → `.to(dofState, { bokeh: cfg.dofBokeh, duration: 1.2 })`. `dofState.focus` set at flight start = distance from destination camera position to hotspot (≈ `|cameraOffset|`).
- **return**: `.to(uniforms.uConstel, { value: 0, duration: 0.5 }, 0)` and `.to(dofState, { bokeh: 0, duration: 0.8 }, 0)`.

## DoF configuration

`<DepthOfField>` from @react-three/postprocessing, `worldFocusDistance = dofState.focus`, small focus range (~1.6), `bokehScale` animated 0→~4. Placed **before Bloom** in the composer so the focused cluster's glow stays crisp. Desktop tier only (tablet/mobile: skipped entirely — bokehScale 0 still costs a pass). Depth proxy sphere radius ≈ `section.radius * 1.6`, repositioned to the active hotspot, mounted only while `activeSection` is set.

## Performance

- +2 draw calls (constellation lines + stars), static buffers, ~60 verts total — negligible.
- Shader delta: +4 snoise calls per vertex in `displace()` (2nd octave) — measured budget fine at 4k particles; mobile already at 1100.
- DoF: 1 extra full-screen pass + CoC, desktop only.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| DoF blurs everything (empty depth buffer) | Certain without fix | Depth-proxy sphere (see above) |
| Amber/teal clash with additive purple accent | Medium | Palette in one place (`sections.ts`); tune from screenshots |
| Constellation lost among existing connection lines | Medium | Higher alpha + white-mixed color + star flares; existing lines already fade during travel (`uTravel`) |
| Breathing too strong / seasick | Low | Amplitudes chosen tiny (0.12 noise, 1.5% radial); verify via screenshot pass |
| Constellation shape differs per reload (cloud is random) | Certain | Accepted — it's generative art; FPS sampling keeps it always well-shaped |

## Phased build order

1. **Organic motion + rest-state section tint** — edit `displace()` + palette; verify idle screenshot, connections still attached.
2. **Hover light-up** — full section-color highlight; verify hover screenshot per section.
3. **Constellation** — generation + shaders + timeline reveal; verify arrived screenshot shows figure, gone after return.
4. **DoF + depth proxy + tier gating** — verify blur on arrival (desktop viewport), absent on mobile viewport; full smoke loop.

## Validation

```bash
pnpm exec tsc --noEmit
PLAYWRIGHT_BROWSERS_PATH="C:\Users\Programming\AppData\Local\ms-playwright" node tests/smoke.mjs
```

Smoke test additions: expose `uniforms` + `dofState` on `window.__scene` in dev only; assert after arrival `uConstel > 0.95` and (desktop) `dofState.bokeh > 0`; after return both `=== 0`; existing loop assertions unchanged.

## Acceptance

- [ ] Hovering any indicator lights all of that section's nodes in its own color
- [ ] Arrival draws a constellation over the focused cluster; return dissolves it
- [ ] Focused cluster sharp, everything else blurred (desktop); no DoF on mobile tier
- [ ] Core motion reads as subtly alive; connection endpoints never detach
- [ ] `tsc` clean, smoke loop passes with new assertions
