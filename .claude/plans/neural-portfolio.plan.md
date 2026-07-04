# Plan: Neural Portfolio Homepage

**Source PRD**: User prompt (cinematic WebGL portfolio)
**Selected Milestone**: Full homepage v1
**Complexity**: Large

## Summary

Greenfield build of a single-page immersive portfolio: a living neural cluster (instanced GPU particles + dynamic connections) with evolving accent color, HUD navigation, and GSAP-driven cinematic camera flights into section hotspots. React/R3F handles composition and UI; nearly all motion lives in shaders (particles) or GSAP (camera, DOM). No application source exists yet — only pnpm + agent config.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `implementation-discipline` skill | Extend existing files; kebab-case folders by layer (`scene/`, `ui/`, `shaders/`, `data/`) |
| Package manager | `package.json` | pnpm only |
| React perf | `react-performance` skill | Instanced meshes, refs not state for frame loops, no per-particle React components |
| React structure | `react-patterns` skill | Composition; scene state in one external store; derive during render for UI |
| Animation split | User spec | GSAP = camera + DOM; GLSL = particle/connection motion + color |
| Design | `frontend-design-direction` skill | Dark, restrained HUD; cluster is hero; no generic dashboard cards |

## Architecture

```
App
└── HomeScene (Canvas)
    ├── Environment        # fog, faint grid, dust particles
    ├── NeuralCluster      # InstancedMesh + particle shader
    ├── ConnectionSystem   # LineSegments / custom geometry + connection shader
    ├── CameraRig          # PerspectiveCamera; GSAP targets via ref
    └── PostProcessing     # bloom, vignette, CA, grain (subtle)
└── UI layer (DOM, pointer-events)
    ├── NavigationIndicators
    ├── HUD
    └── SectionOverlay     # content panel; fades on arrival
```

**State (minimal Zustand store or refs + context):**

| State | Where | Why |
|---|---|---|
| `accentColor` (vec3/hsl) | Store → shader uniform | Single source for color evolution |
| `activeSection` / `phase` | Store | `idle` \| `hover` \| `travel` \| `arrived` |
| `hoveredSection` | Store | Drives dim/highlight uniforms |
| Camera position/lookAt | Refs + GSAP | Avoid React re-renders per frame |
| Particle/connection attrs | BufferGeometry + uniforms | GPU-side motion |
| Mouse normalized | Ref | Subtle camera + attraction bias |

**Data-driven sections** — one config file:

```ts
// data/sections.ts
{ id, label, position: [x,y,z], content: ReactNode | lazy import }
```

Adding a section = one config entry + content, no scene restructure.

## Personal content (editable)

All portfolio copy, image CDN URLs, and descriptions live in **one folder** you maintain by hand:

```
src/content/
├── portfolio.ts      # projects, skills, experience, about, contact — placeholders now
├── assets/           # drop local images here (optional if using CDN only)
└── README.md         # how to update URLs vs local files
```

- **`cdnUrl`** — full HTTPS URL when hosted externally
- **`localPath`** — fallback under `assets/` when `cdnUrl` is empty
- **`resolveImage()`** — picks CDN first, else local path

Scene code reads from here; **`src/data/sections.ts`** keeps only 3D hotspot positions and camera offsets (wired to the same section ids).

## Files to Change

| File | Action | Why |
|---|---|---|
| `package.json` | UPDATE | Vite scripts, dependencies |
| `vite.config.ts` | CREATE | Dev server, GLSL import plugin |
| `index.html` | CREATE | Entry |
| `src/main.tsx` | CREATE | Bootstrap |
| `src/App.tsx` | CREATE | Canvas + UI shell |
| `src/scene/HomeScene.tsx` | CREATE | R3F Canvas orchestration |
| `src/scene/NeuralCluster.tsx` | CREATE | Instanced particles |
| `src/scene/ConnectionSystem.tsx` | CREATE | Dynamic lines |
| `src/scene/Environment.tsx` | CREATE | Background atmosphere |
| `src/scene/CameraRig.tsx` | CREATE | Idle drift + GSAP hooks |
| `src/scene/PostProcessing.tsx` | CREATE | EffectComposer stack |
| `src/ui/NavigationIndicators.tsx` | CREATE | HUD lines + labels |
| `src/ui/HUD.tsx` | CREATE | Decorative diagnostics |
| `src/ui/SectionOverlay.tsx` | CREATE | Section content on arrival |
| `src/store/sceneStore.ts` | CREATE | Shared scene/UI state |
| `src/hooks/useSceneTransition.ts` | CREATE | GSAP timeline factory |
| `src/lib/accent.ts` | CREATE | Slow accent color cycle (not a hook) |
| `src/data/sections.ts` | CREATE | Hotspot 3D positions (references content section ids) |
| `src/content/portfolio.ts` | EXISTS | Personal copy, CDN URLs, project/skill lists (placeholders) |
| `src/content/assets/` | EXISTS | Local image drop folder |
| `src/shaders/particles.glsl` | CREATE | Particle motion + glow |
| `src/shaders/connections.glsl` | CREATE | Line fade/pulse |
| `src/styles/global.css` | CREATE | HUD typography, resets |

**Explicitly NOT creating:** barrel `index.ts` files, separate utils per one-liner, Framer Motion, Three AnimationMixer.

## Dependencies

```bash
pnpm add react react-dom three @react-three/fiber @react-three/drei gsap zustand
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/three vite-plugin-glsl
```

Optional (Phase 8): `@react-three/postprocessing` for bloom/vignette/CA.

## Tasks

### Task 1: Scaffold
- **Action**: Vite + React + TS, pnpm scripts (`dev`, `build`, `preview`), GLSL plugin, global dark CSS.
- **Validate**: `pnpm dev` loads blank dark page.

### Task 2: Content + scene data foundation
- **Action**: Add `src/content/portfolio.ts` with placeholder projects, skills, experience, about, contact (CDN + local paths + descriptions). Add `src/data/sections.ts` for hotspot positions only. Wire `sectionCopy` into overlay placeholders later.
- **Validate**: Edit one `cdnUrl` in `portfolio.ts`; overlay can read resolved image URL without touching scene code.

### Task 3: Organic particle cluster
- **Action**: Generate asymmetrical density (dense core, sparse shell) via noise-weighted positions. `InstancedMesh` + custom shader: noise displacement, micro-oscillation, slow drift, accent uniform, size/opacity variation.
- **Validate**: 60fps desktop with ~3–5k particles; no React child per particle.

### Task 4: Connection system
- **Action**: Precompute neighbor pairs (spatial hash, max N connections/particle, refresh on interval not every frame). `LineSegments` with shader-driven opacity pulse/fade. Hotspot regions get denser local links.
- **Validate**: Connections animate without FPS collapse; count tunable via uniform.

### Task 4: Color evolution
- **Action**: `lib/accent.ts` cycles HSL through purple→magenta→blue→cyan→purple over ~4–6 min. Single uniform feeds particles, connections, HUD CSS vars, post FX.
- **Validate**: No hard color jumps; all elements stay in sync.

### Task 5: Environment + camera idle
- **Action**: Dark fog, faint grid plane, sparse dust instancing. CameraRig: perpetual slow drift/rotation via GSAP yoyo timeline on ref. Mouse: subtle parallax (clamped).
- **Validate**: Camera never static; mouse influence stays subtle.

### Task 6: Navigation + HUD
- **Action**: `sections.ts` drives 5 hotspots. DOM indicators with SVG/CSS lines from screen-projected hotspot positions (`useFrame` + `vector.project` → store, throttled). HUD corners: section name, node count, accent readout, decorative ticks — minimal typography.
- **Validate**: Indicators track cluster movement; keyboard focus on indicators.

### Task 7: Hover interaction
- **Action**: On indicator hover: boost hotspot uniform, dim non-selected particles (shader mix), strengthen line glow. GSAP micro-tweens on label opacity.
- **Validate**: Smooth enter/exit; no layout shift.

### Task 8: Cinematic transition (hero)
- **Action**: `useSceneTransition` GSAP timeline (`power4.inOut`): pull back → rotate cluster → brighten target → accelerate fly-to → fade non-target → onComplete set `arrived`. Reverse timeline on return. Shader uniforms for streak/stretch during travel.
- **Validate**: No camera snap; timeline killable on rapid re-click.

### Task 9: Section overlay
- **Action**: `PortfolioUI` overlay reads active section from `portfolio.ts` (projects, skills, etc.). Placeholder layout uses `sectionCopy` + `resolveImage()`. Return control triggers reverse transition.
- **Validate**: Network stays alive behind content; indicators hidden during travel/arrived.

### Task 10: Post-processing + polish
- **Action**: Bloom (low intensity), vignette, light CA, film grain. Tune for elegance not spectacle.
- **Validate**: Still ≥55fps on mid laptop; disable heavy passes on mobile.

### Task 11: Responsive degradation
- **Action**: `matchMedia` or viewport width → reduce particle count, connection budget, disable CA/grain on mobile.
- **Validate**: Mobile maintains visual identity at 60fps target.

## Validation

```bash
pnpm install
pnpm dev          # manual: interactions, transitions, hover
pnpm build        # production bundle succeeds
pnpm preview      # prod build runs
```

Performance: Chrome DevTools Performance tab — sustained ~60fps on desktop during idle + transition.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Connection neighbor search too expensive | High | Spatial hash; cap connections; rebuild every 500ms not 16ms |
| GSAP camera vs R3F fight | Medium | Animate camera ref in `onUpdate`; disable idle timeline during travel |
| Post-processing FPS drop | Medium | Quality presets; mobile skips CA/grain |
| Scope creep (real section content) | Low | All copy/images in `src/content/portfolio.ts`; scene code unchanged when updating portfolio |
| DOM indicators desync from 3D | Medium | Project hotspots each frame; throttle DOM writes |
| Shader complexity / maintainability | Low | Keep two shader files; shared `accent` + `time` uniforms |

## Acceptance

- [ ] Living asymmetrical neural cluster with instanced particles
- [ ] Dynamic fading connections
- [ ] Slow global accent color evolution
- [ ] HUD + navigation indicators with hover dim/highlight
- [ ] GSAP cinematic fly-to and return (`power4.inOut`)
- [ ] Section content overlay on arrival
- [ ] GSAP only (no Framer Motion / mixers)
- [ ] Desktop 60fps; mobile reduced but same identity
- [ ] Personal content editable in `src/content/` only (CDN URLs + local assets + descriptions)
