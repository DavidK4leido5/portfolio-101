# Neural Portfolio — Reference

## File map

| File | Role |
|------|------|
| `src/App.tsx` | LoadingScreen gate → HomeScene when sceneReady |
| `src/scene/HomeScene.tsx` | Canvas, ClusterGroup, SceneUniforms, Projection (sector screen positions) |
| `src/scene/NeuralCluster.tsx` | `makeCloud()`, `makeMaterial()`, particle Points |
| `src/scene/ConnectionSystem.tsx` | Spatial-hash lines, rebuild on interval |
| `src/scene/shaders.ts` | NOISE, MOTION, particle/connection vert/frag, `waveFront`, `brainActivity` |
| `src/scene/shared.ts` | uniforms, CAM_BASE, CLUSTER_SCALE, hotspotWorld |
| `src/scene/CameraRig.tsx` | Idle orbit, travel/return GSAP, focus timeline |
| `src/scene/IntroSequence.tsx` | Intro camera pull, calls runIntroSpawn |
| `src/scene/nodeAnimator.ts` | runIntroSpawn, animateNodeCount, triggerSectorWave |
| `src/scene/PostProcessing.tsx` | Bloom, CA, grain (tier-gated) |
| `src/ui/PortfolioUI.tsx` | HUD, sectors, density slider, overlay panel |
| `src/ui/LoadingScreen.tsx` | "SYNTHESIZING CORTEX" boot overlay |
| `src/store/sceneStore.ts` | Zustand phase machine |
| `src/lib/spatialHash.ts` | Connection pair builder |
| `src/lib/quality.ts` | Tier configs |
| `src/lib/nodes.ts` | Pool + slider limits per tier |
| `src/data/brainCloud.ts` | ~24k Float32Array surface + brainHotspots |
| `src/data/sections.ts` | 5 sections → lobe mapping |
| `src/content/portfolio.ts` | User-facing copy |
| `tests/smoke.mjs` | E2E smoke suite |
| `tests/shot.mjs` | Dev screenshot helper |
| `.github/workflows/ci-cd.yml` | CI + GitHub Pages |

## Shader functions (shaders.ts)

| Function | Used by | Notes |
|----------|---------|-------|
| `particleSpawnT` | all verts | Intro vs slider spawn split at uRevealFrom |
| `spawnEase` | morphedPos | pow ease-out |
| `morphedPos` | particles + connections | scatter→target + arc tangent |
| `hideParticle` | particles + connections | Pool slice + spawn visibility |
| `displace` | morphedPos output | Noise + ambient drift (1-k) |
| `targetMix` | color emphasis | uHovered or uActive vs aAffinity |
| `waveFront` | brainActivity | Expanding sphere, sin-shimmered edge |
| `brainActivity` | particle + connection color | Ambient + hover waves |
| `nodePalette` | base color | Cortex gradient + section tint |

## Cloud buffer layout

Per node index `i`:
- `positions[i*3+0..2]` — brain surface target
- `scatter[i*3+0..2]` — intro start (frustum scatter)
- `seeds[i]` — stagger seed 0..1
- `affinity[i]` — section index or -1
- `indices[i]` — pool slot index

## Section → lobe mapping

Sections use `brainHotspots` centroids baked from anatomical regions:
- projects → frontal
- experience → parietal
- skills → temporal
- about → occipital
- contact → brainstem

`assignLobes()` assigns affinity if node within `sections[s].radius` of hotspot.

## Intro timeline (default 5.4s)

```
0–14%     hold scattered field (uSpawn=0, nodes visible, drifting)
14–84%    uSpawn 0→1 (power3.inOut)
~60%      uIntroPulse peak
~78%      uConnect 0→1
84–100%   pulse fade, connect finish → loadPhase=ready
```

Camera: offset start → CAM_BASE. Cluster rotation: 0 → 0.42 rad.

## CI/CD env

| Variable | Where | Value |
|----------|-------|-------|
| `VITE_BASE_PATH` | deploy build step | `/${{ github.event.repository.name }}/` |
| `SMOKE_URL` | smoke step | `http://localhost:4173` |
| `SMOKE_LOOPS` | smoke step | `1` (CI) / `2` (local default) |

Node 22, pnpm 11, Playwright chromium with `--with-deps`.

## Evolution log (decisions from build sessions)

1. **Brain shape** — Replaced generic cluster with CC BY 4.0 anatomical mesh, surface-sampled to point cloud
2. **Sectors** — Removed separate hotspot gaussian blobs; all nodes on surface, affinity by proximity
3. **Constellation** — Removed; lobe highlight via uFocus/uDim + aAffinity is sufficient
4. **Spawn bug** — Fixed denominator `(1-stagger)` so no nodes strand outside brain
5. **Intro** — Frustum scatter + curved arcs + hold phase; sectors after ready
6. **Shockwaves** — waveFront from hotspots (hover) and random surface points (ambient)
7. **Slider** — pointer-events fix on full-screen UI layers
8. **Deploy** — GitHub Actions + Pages with dynamic base path

## Adding a 6th section (checklist)

- [ ] `SECTION_IDS` + section def in `sections.ts`
- [ ] Hotspot filter in `bake-brain-cloud.mjs` OR manual position from surface inspection
- [ ] GLSL: `uSectionColors[5]` → `[6]`, loop bounds in `brainActivity` if iterating sections
- [ ] `portfolio.ts` content + `sectionCopy`
- [ ] `PortfolioUI` SectionContent branch
- [ ] `smoke.mjs` SECTIONS array
- [ ] Separate indicators if overlap — adjust `MIN_IND_GAP` in HomeScene Projection
