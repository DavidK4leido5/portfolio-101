# Neural Portfolio — Architecture Specification (v1)

Opinionated refinement of `.claude/plans/neural-portfolio.plan.md` for a solo incremental build. The draft plan is **directionally correct**; this document tightens boundaries, merges files, and makes contracts explicit.

---

## 1. Validated / Refined Architecture Overview

### Product intent

Single-page immersive portfolio — a living neural cluster, not a dashboard. Thousands of instanced GPU particles with organic asymmetrical density, dynamic connections (fade, pulse, reroute illusion), one slowly evolving accent color (minutes-long cycle), five section hotspots embedded in the cluster, HUD indicators outside the cluster, hover dim/highlight, click cinematic GSAP camera fly-to with section overlay on arrival and reverse on return. Decorative Jarvis-style HUD, never cluttered. Target 60fps desktop; reduced particles on mobile.

### Strict tech stack

React, Three.js, React Three Fiber, Drei, GSAP, GLSL only.

**Excluded:** Framer Motion, Anime.js, Lottie, Three AnimationMixer, other animation libraries.

### Layer responsibilities

| Layer | Responsibility |
|---|---|
| **R3F scene graph** | GPU work, instancing, spatial hash, projection math |
| **Zustand** | Low-frequency UI/scene **mode** (not per-frame data) |
| **Refs** | Camera, timelines, geometry buffers, DOM indicator nodes |
| **GLSL** | Particle motion, connection pulse/fade, accent derivation |
| **GSAP** | Camera flight, DOM fades only |

### Revised scene graph

```
App
├── HomeScene (Canvas)
│   ├── SceneUniforms        # one useFrame → all materials
│   ├── Environment          # inline in HomeScene (fog, grid, dust)
│   ├── NeuralCluster        # InstancedMesh
│   ├── ConnectionSystem     # LineSegments / BufferGeometry
│   ├── CameraRig            # camera ref + idle GSAP + transition API
│   └── PostProcessing       # Phase 10 only
└── PortfolioUI (DOM)
    ├── HUD corners
    ├── NavigationIndicators (5)
    └── SectionOverlay
```

### Refinements vs draft plan

1. **Drop `useAccentColor` hook** — accent is a pure function of elapsed time. One `getAccent(t)` util called from `useFrame` (uniform) and throttled DOM CSS var update. No store field.

2. **Merge UI files** — `HUD`, `NavigationIndicators`, `SectionOverlay` → single `PortfolioUI.tsx`. One DOM layer, one pointer-events policy.

3. **Merge `Environment` into `HomeScene.tsx`** — fog + grid + dust is ~40 lines; not worth a separate file.

4. **Keep `ConnectionSystem` separate from `NeuralCluster`** — spatial hash + pair dedup is ~120 lines of CPU logic; different lifecycle from GPU instancing. Same folder, no shared abstractions.

5. **Add `src/lib/quality.ts`** — single source for particle/connection caps and post FX flags. Avoid magic numbers scattered in components.

6. **Add `src/lib/spatialHash.ts`** — pure function, testable in isolation. Connections component owns cadence; hash is stateless.

7. **Projection via refs, not Zustand** — writing screen coords to store at 30fps causes React re-renders. Mutate indicator `style.transform` directly from `useFrame`.

8. **Single `ShaderMaterial` uniform bag** — both particle and connection materials receive the same uniform object reference (mutated in one `useFrame` in `HomeScene` or a tiny internal `SceneUniforms` child). No duplicate uniform sync.

9. **Post-processing is optional Phase 10** — ship without it first; cluster readability matters more than bloom on day one.

10. **Section content: lazy components in `sections.ts`, not ReactNode inline** — keeps data file serializable; overlay does lazy load by section id.

11. **Personal portfolio data in `src/content/`** — one folder for you to edit: CDN URLs, local assets, descriptions for projects/skills/experience/about/contact. Scene code imports from here; never hardcode copy in components.

### Architectural principles applied

- **Modularity:** scene (GPU), UI (DOM), lib (pure), store (mode) — clear boundaries
- **Performance:** instanced rendering, refs not state for frame loops, no per-particle React components
- **Maintainability:** minimal files, no barrel exports, no speculative abstractions
- **Animation split:** GSAP = camera + DOM; GLSL = particle/connection motion + color

---

## 2. Minimal File Tree (exact paths, 25 files)

No barrel files, no types-only files, no separate utils per one-liner.

```
portfolio-new/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   └── global.css
│   ├── content/                   # YOU EDIT THIS — personal portfolio data
│   │   ├── portfolio.ts           # projects, skills, experience, CDN URLs, descriptions
│   │   ├── assets/                # optional local images (CDN preferred)
│   │   └── README.md
│   ├── data/
│   │   └── sections.ts            # 3D hotspot positions + camera offsets only
│   ├── store/
│   │   └── sceneStore.ts
│   ├── lib/
│   │   ├── quality.ts
│   │   ├── spatialHash.ts
│   │   └── accent.ts              # getAccent(t) → vec3 + hex for CSS
│   ├── hooks/
│   │   └── useSceneTransition.ts  # GSAP factory; consumed by CameraRig
│   ├── scene/
│   │   ├── HomeScene.tsx          # Canvas, env, SceneUniforms, composes children
│   │   ├── NeuralCluster.tsx
│   │   ├── ConnectionSystem.tsx
│   │   ├── CameraRig.tsx
│   │   └── PostProcessing.tsx     # Phase 10; stub empty fragment until then
│   ├── ui/
│   │   └── PortfolioUI.tsx        # HUD + indicators + overlay merged
│   └── shaders/
│       ├── particles.vert.glsl
│       ├── particles.frag.glsl
│       ├── connections.vert.glsl
│       ├── connections.frag.glsl
│       └── common.glsl            # shared noise, accent HSL, phase helpers
```

**File count:** 25 (including config root files and content placeholders).

### Content folder contract (`src/content/`)

| File | Owner | Purpose |
|---|---|---|
| `portfolio.ts` | **You** | Profile, projects[], skills[], experience[], contact, `sectionCopy`, image `{ cdnUrl, localPath, alt }` |
| `assets/` | **You** | Drop JPG/PNG/WebP when not using CDN |
| `README.md` | Docs | How to swap CDN vs local |

**`resolveImage()`** in `portfolio.ts`: returns `cdnUrl` if set, else `localPath`.

**`data/sections.ts`** imports section ids from content; holds only:

- world-space hotspot `position`
- camera arrival offset
- hotspot radius for shader affinity

When you add a project or skill, edit **`portfolio.ts` only**. Change hotspot layout only when a new **section** is added (rare).

**Merge rationale:**

| Merged from | Into | Reason |
|---|---|---|
| HUD, NavigationIndicators, SectionOverlay | `PortfolioUI.tsx` | Single DOM layer, shared pointer-events |
| Environment | `HomeScene.tsx` | Too small for own file |
| useAccentColor hook | `lib/accent.ts` | Pure function, no hook needed |
| Scattered quality constants | `lib/quality.ts` | Single tier table |

**Explicitly NOT creating:** barrel `index.ts` files, separate utils per one-liner, Framer Motion, Three AnimationMixer, raycast hover (v1), physics, separate animation store.

---

## 3. Data Flow: Zustand vs Refs vs Uniforms vs GSAP

### Zustand (`sceneStore.ts`) — event-driven, ~5 writes/sec max

**Store shape:**

| Field | Type | Purpose |
|---|---|---|
| `phase` | `idle \| hover \| travel \| arrived` | Scene interaction mode |
| `hoveredSection` | SectionId or null | Drives dim/highlight uniforms |
| `activeSection` | SectionId or null | Target of travel / overlay content |
| `qualityTier` | `desktop \| tablet \| mobile` | Set once on mount + resize debounce |

**SectionId values:** `projects`, `experience`, `skills`, `about`, `contact`

**Subscribers:**

- `PortfolioUI` — overlay visibility, label states
- `ConnectionSystem` — rebuild cadence on phase change
- `CameraRig` — pause idle on travel

**NOT in store:** accent color, mouse position, camera transform, projected screen coords, particle positions, connection pairs.

### Refs — per-frame, zero React churn

| Ref | Owner | Purpose |
|---|---|---|
| `cameraRef` | CameraRig | GSAP animation target |
| `idleTimelineRef` | CameraRig | Infinite yoyo drift timeline |
| `travelTimelineRef` | useSceneTransition | Kill/reverse on navigation |
| `mouseRef` | HomeScene | Normalized [-1, 1] from pointer events |
| `uniformsRef` | HomeScene | Shared ShaderMaterial uniforms object |
| `instanceMatrix / attrs` | NeuralCluster | Static positions + per-instance seed |
| `connectionBuffer` | ConnectionSystem | Position pairs; regen on interval |
| `indicatorElsRef[5]` | PortfolioUI | DOM nodes for direct transform writes |
| `clockStart` | HomeScene | Elapsed seconds for accent + shaders |

### Uniforms — mutated every frame in one place

Single object passed to both particle and connection materials. Updated in `SceneUniforms` `useFrame`:

| Uniform | Updated from |
|---|---|
| `uTime` | clock elapsed |
| `uAccent` | `getAccent(uTime)` |
| `uMouse` | mouse ref |
| `uPhase` | store phase enum → float 0–3 |
| `uHoveredIndex` | store hoveredSection → int |
| `uActiveIndex` | store activeSection → int |
| `uDimStrength` | derived from phase + hover |
| `uTravelProgress` | GSAP onUpdate during travel |
| `uHotspotPositions[5]` | sections.ts |
| `uHotspotRadii[5]` | sections.ts |

Phase → uniform mapping reads store **once per frame** via `sceneStore.getState()` — no Zustand subscription inside useFrame.

### GSAP — camera + DOM only

| Target | Properties animated | Easing |
|---|---|---|
| Camera ref | position, lookAt (via onUpdate) | `power4.inOut` travel; `sine.inOut` idle |
| Overlay / labels | opacity, optional vertical offset | `power2.out` |
| **Never GSAP** | particle positions, connection topology | — |

### Data flow diagram

```
User input (click/hover)
    → sceneStore (phase, hoveredSection, activeSection)
        → PortfolioUI re-render (overlay, labels)
        → SceneUniforms reads getState() in useFrame
            → uniformsRef mutation
                → particle shader + connection shader
    → useSceneTransition (on click)
        → GSAP travelTimeline → cameraRef
        → onUpdate → uniformsRef.uTravelProgress
        → onComplete → store phase = arrived

Clock / mouse (continuous)
    → useFrame in HomeScene
        → uniformsRef (uTime, uAccent, uMouse)
        → indicatorElsRef DOM transforms (projection)
        → optional mouse parallax on camera (additive, not GSAP)
```

---

## 4. Shader / Uniform Contract

### File structure

| File | Role |
|---|---|
| `common.glsl` | Shared noise, accent HSL conversion, phase mix helpers — no uniforms declared here |
| `particles.vert.glsl` / `.frag.glsl` | Instanced particle motion + glow |
| `connections.vert.glsl` / `.frag.glsl` | Line fade, pulse, travel dim |

### Shared uniforms (both materials)

| Uniform | Type | Source | Semantics |
|---|---|---|---|
| `uTime` | float | clock.elapsed | Seconds since mount |
| `uAccent` | vec3 | `getAccent(uTime)` | Linear RGB 0–1 |
| `uMouse` | vec2 | mouse ref | Subtle attraction/parallax bias |
| `uPhase` | float | store phase enum | 0 idle, 1 hover, 2 travel, 3 arrived |
| `uHoveredIndex` | int | store | -1 = none |
| `uActiveIndex` | int | store | -1 = none |
| `uDimStrength` | float | derived | 0 idle, ~0.65 hover, ~0.85 travel |
| `uTravelProgress` | float | GSAP onUpdate | 0→1 during fly-to |
| `uHotspotPositions` | vec3[5] | sections.ts | World space |
| `uHotspotRadii` | float[5] | sections.ts | Influence radius per hotspot |

### Particle-only attributes / uniforms

| Name | Type | Notes |
|---|---|---|
| `aSeed` | float (instance attribute) | Per-particle random 0–1 |
| `aHotspotAffinity` | float (instance attribute) | 0–4 section index, or -1 for ambient |
| `uParticleCount` | float | Density normalization |

### Connection-only attributes

| Name | Type | Notes |
|---|---|---|
| `aPairSeed` | float (per vertex) | Stable pulse phase per edge |
| `aEndpointHotspot` | vec2 (per vertex) | x = hotspot idx A, y = idx B (-1 = ambient) |

### Visual contract (both shaders must agree)

| Effect | Rule |
|---|---|
| **Accent color** | Both use `uAccent`; particles add white core mix; connections use accent × alpha |
| **Dim on hover/travel** | `mix(fullBrightness, dimmed, uDimStrength × (1.0 - isTarget))` where isTarget checks hotspot affinity or proximity to hovered/active index |
| **Travel streak** | `uTravelProgress` drives streak elongation (particles) and non-target opacity falloff (connections) — same progress value in both shaders |
| **Pulse** | `sin(uTime × freq + aSeed × 6.28)` — connections slower (freq ~1.2), particles faster (~2.5) |
| **Accent cycle** | ~4–6 minute HSL cycle: purple → magenta → blue → cyan → purple; computed identically in `lib/accent.ts` (CPU/CSS) and `common.glsl` (GPU) |

### Sync rule

One `uniformsRef` object, one `SceneUniforms` updater per frame. Never duplicate uniform writes across components.

---

## 5. Connection Algorithm Details

### Overview

Topology generation runs on CPU, not GPU. Connections are rebuilt on an interval timer — not every frame. Visual animation (fade, pulse, reroute illusion) is shader-driven between rebuilds.

### When to rebuild

| Trigger | Action |
|---|---|
| Interval timer (tier-dependent) | Full topology rebuild |
| `qualityTier` change | Full rebuild with new caps |
| First mount | Initial build |
| `phase === 'travel'` | **Freeze** — skip rebuild during GSAP flight |

During travel, reroute illusion comes from shader pulse only, not topology changes. Prevents CPU spike mid-animation.

### Spatial hash algorithm

**Cell size:** `maxConnectionDistance` (default 2.0 world units)

**Grid key:** floor division of x, y, z by cell size

**Steps:**

1. Insert all particle rest positions into hash map.
2. Insert 8 synthetic anchor points per hotspot (small random offset around section position) for denser local mesh near sections.
3. For each particle index i (in index order):
   - Query 3×3×3 neighboring cells (27 cells).
   - Collect candidates within `maxConnectionDistance`.
   - Sort candidates by distance ascending.
   - Take up to `maxNeighborsPerParticle`.
   - Emit edge with canonical ordering (min index, max index) into a Set for deduplication.
   - Stop when global edge count reaches `maxTotalConnections`.

### Caps by quality tier (`lib/quality.ts`)

| Tier | Particles | Max neighbors/particle | Max total connections | Max distance |
|---|---|---|---|---|
| desktop | 4000 | 6 | 6000 | 2.0 |
| tablet | 2000 | 5 | 3000 | 1.8 |
| mobile | 1000 | 4 | 1200 | 1.5 |

### Hotspot particle bias

Approximately 15% of particles assigned `aHotspotAffinity` per section:

| Tier | Particles per section affinity |
|---|---|
| desktop | ~300 |
| tablet | ~150 |
| mobile | ~75 |

### Rebuild cadence

| Tier | Interval |
|---|---|
| desktop | 500 ms |
| tablet | 750 ms |
| mobile | 1000 ms |
| any, during travel | frozen |

### GPU representation

- `BufferGeometry` with position (vec3 pairs → 2 vertices per line), `aPairSeed`, `aEndpointHotspot`.
- `drawRange` set to active edge count.
- Reuse buffer across rebuilds; update `drawRange.count` rather than reallocating when count is stable.
- Shader handles fade (distance-based), pulse, travel dim — no topology animation between rebuilds.

### Complexity guardrails

- Spatial hash keeps neighbor lookup O(n × k) where k = average neighbors per cell.
- Hard global cap prevents runaway edge count.
- Profile rebuild in dev with timing logs; target rebuild < 8ms on desktop.

---

## 6. GSAP Timeline Architecture

### State machine

Store `phase` is the source of truth.

```
idle ←→ hover          (indicator mouseenter / mouseleave)
idle/hover → travel    (click section)
travel → arrived       (timeline onComplete)
arrived → travel       (return click, reversed timeline)
travel → idle          (reverse onComplete, OR kill mid-flight → snap cleanup)
```

### Two timelines — never concurrent

#### idleTimeline (CameraRig)

- Infinite yoyo on camera ref.
- Motion: ±0.15 position units, ±0.02 rotation over 18–24 seconds.
- Easing: `sine.inOut`.
- **Paused** when `phase` is `travel` or `arrived`.
- Resumed when returning to `idle`.

#### travelTimeline (useSceneTransition)

- Created fresh per navigation; previous timeline `kill()` before start.
- Labels: `pullBack` → `orbit` → `focus` → `fly` → `arrive`.
- Total duration: ~2.8–3.4s desktop; ~2.2s mobile.
- Easing: `power4.inOut` on camera position.
- LookAt: set via `onUpdate` callback — `camera.lookAt(target)`.

### Timeline structure (conceptual)

| Time | Label | Action |
|---|---|---|
| 0.0s | pullBack | Camera +Z 1.2 units; uTravelProgress = 0 |
| 0.4s | orbit | Slight yaw toward hotspot |
| 0.9s | focus | uDimStrength ramp via onUpdate → uniformsRef |
| 1.2s | fly | Position → arrival offset (section-specific from sections.ts) |
| 2.8s | arrive | phase = arrived; overlay fade in |

### Reverse navigation

- `timeline.reverse()` from `arrived`.
- On complete: `phase = idle`, `activeSection = null`, resume idle timeline.

### Rapid re-click handling

- `travelTimeline.kill()`.
- Reset `uTravelProgress` to 0.
- Start new timeline from **current camera pose** (GSAP animates from current values).

### Mouse parallax (not GSAP)

- Additive offset on camera ref in `useFrame`.
- Max ±0.08 units.
- Avoids fighting with GSAP timelines.

### uTravelProgress sync

- Set in timeline `onUpdate` as timeline progress during travel phase only.
- Shaders stay in sync without React re-renders.

### Cleanup

- Use `gsap.context()` for cleanup on unmount.
- Kill both timelines on component teardown.

---

## 7. DOM Indicator Projection Strategy

### Goal

Five HUD indicators outside the cluster point to embedded 3D hotspots. Indicators track cluster and camera movement without causing React re-renders.

### Data source

`sections.ts` defines world-space `position` per hotspot (one of five sections).

### Implementation approach: ref-based projection at ~30 Hz

1. `PortfolioUI` renders 5 indicators as `<button>` elements with `ref` callbacks stored in `indicatorElsRef[5]`.

2. `HomeScene` or `CameraRig` runs projection in `useFrame`:
   - Copy section world position.
   - Apply `vector.project(camera)` to get NDC.
   - Convert NDC to screen pixels using viewport width/height.

3. **Throttle:** only write DOM when frame count is even (~30fps at 60fps rAF) OR position delta exceeds 2px.

4. **Direct DOM mutation:** set `el.style.transform = translate(xpx, ypx)` — no setState, no Zustand.

5. **Off-screen handling:** if projected z > 1 (behind camera), set indicator `opacity: 0`. Do not remove from layout (prevents jump on re-entry).

6. **SVG connector lines (Phase 7+):** optional line from fixed HUD anchor to projected point; update line endpoint on same throttled tick via ref to SVG element.

### Hit testing

- Indicators are DOM click targets with minimum 44×44px hit area.
- Indicators are real buttons with `aria-label` per section.
- **Not required v1:** raycast from mouse to invisible mesh spheres at hotspots for cluster hover. Indicator hover is sufficient and cheaper.

### Why not Zustand for projection

Writing screen coordinates to store at 30fps triggers React re-renders across UI subtree. Ref-based direct DOM writes keep the render tree static while positions update every frame.

### Sync with hover/travel

- Indicator visual state (highlight, opacity) reads from store `phase` and `hoveredSection` — low frequency, appropriate for React.
- Position tracking uses refs — high frequency, bypasses React.

---

## 8. Mobile Degradation Numbers

### Tier detection

Detect once on mount; update on debounced resize (200ms):

| Condition | Tier |
|---|---|
| `max-width: 768px` OR `pointer: coarse` | mobile |
| `max-width: 1024px` | tablet |
| otherwise | desktop |

### Parameter table

| Parameter | Desktop | Tablet | Mobile |
|---|---|---|---|
| Particles | 4000 | 2000 | 1000 |
| Max connections | 6000 | 3000 | 1200 |
| Neighbors per particle | 6 | 5 | 4 |
| Connection rebuild interval | 500 ms | 750 ms | 1000 ms |
| Post: bloom | on, intensity 0.35 | on, intensity 0.25 | **off** |
| Post: vignette | on | on | on, lighter |
| Post: chromatic aberration | on | **off** | off |
| Post: film grain | on | **off** | off |
| Pixel ratio cap | min(dpr, 2) | min(dpr, 1.5) | 1 |
| Travel duration | 3.2s | 2.8s | 2.2s |
| Idle camera drift amplitude | 100% | 80% | 60% |
| Dust particles (environment) | 200 | 100 | 0 |
| Target FPS | 60 | 60 | 30–60 (accept 45 floor) |

### Dynamic fallback

If measured FPS < 45 for 2 consecutive seconds (rolling average via useFrame delta):

1. Step down one tier (disable bloom first).
2. Halve connection count once.
3. Do not step down particle count mid-session unless still below 30fps.

### Accessibility

Respect `prefers-reduced-motion`:

- Skip travel timeline.
- Jump to `arrived` with cut fade ≤ 200ms.
- Disable idle camera drift.

---

## 9. Phased Build Order

Build incrementally. Each phase has a concrete exit criterion. Do not skip validation gates.

### Phase 1 — Scaffold

**Dependencies:** none

**Deliverables:** Vite + React + TS, pnpm scripts (dev, build, preview), GLSL import plugin, global dark CSS, blank Canvas

**Exit:** `pnpm dev` loads blank dark page with empty R3F canvas

---

### Phase 2 — Quality + content + data foundation

**Dependencies:** Phase 1

**Deliverables:** `lib/quality.ts`, `lib/accent.ts`, `data/sections.ts`, `sceneStore.ts`, wire `src/content/portfolio.ts` (placeholders already present)

**Exit:** store readable; sections config loads hotspot positions; overlay can import projects/skills from content folder

---

### Phase 3 — Particle cluster (core)

**Dependencies:** Phase 2

**Deliverables:** `NeuralCluster.tsx`, `shaders/particles.*`, `shaders/common.glsl`

**Exit:** 4000 instanced particles at 60fps desktop; accent cycling visible in shader; no React child per particle

---

### Phase 4 — Connections

**Dependencies:** Phase 3 (particle positions for hash)

**Deliverables:** `lib/spatialHash.ts`, `ConnectionSystem.tsx`, `shaders/connections.*`

**Exit:** capped dynamic lines; rebuild on interval; no FPS collapse on rebuild tick

---

### Phase 5 — Camera idle + environment

**Dependencies:** Phase 3

**Deliverables:** `CameraRig.tsx` idle timeline; environment inline in `HomeScene.tsx`; mouse parallax

**Exit:** living camera never static; fog/grid/dust visible; mouse influence subtle

---

### Phase 6 — Uniform bus + UI shell

**Dependencies:** Phase 3, Phase 5

**Deliverables:** `SceneUniforms` in `HomeScene.tsx`; `PortfolioUI.tsx` HUD + indicators (static positions first)

**Exit:** HUD visible; accent synced to CSS custom property; shared uniforms feeding particle shader

---

### Phase 7 — Projection sync

**Dependencies:** Phase 5, Phase 6

**Deliverables:** ref-based indicator tracking in useFrame

**Exit:** indicators follow hotspot world positions as camera moves

---

### Phase 8 — Hover interaction

**Dependencies:** Phase 4, Phase 6, Phase 7

**Deliverables:** store hover → uniform dim/highlight; GSAP micro-fade on labels

**Exit:** smooth enter/exit dim; unrelated particles/lines fade; no layout shift

---

### Phase 9 — Cinematic transition (hero)

**Dependencies:** Phase 5, Phase 6, Phase 8

**Deliverables:** `useSceneTransition.ts`, travel timeline, section overlay rendering from `portfolio.ts`

**Exit:** fly-to and reverse work; overlay shows content from `src/content/`; network alive behind content; indicators hidden during travel/arrived

---

### Phase 10 — Post-processing + perf pass

**Dependencies:** Phase 9

**Deliverables:** `PostProcessing.tsx`, fps watchdog, mobile tier verification

**Exit:** bloom/vignette/CA/grain tuned; ≥55fps on mid laptop; mobile maintains visual identity

---

### Critical path

```
Phase 1 → 2 → 3 → 4 → 5 → 9
```

Phases 6–8 can proceed in parallel after Phase 5 if needed, but Phase 9 requires 5, 6, and 8 complete.

### Dependencies (package)

**Runtime:** react, react-dom, three, @react-three/fiber, @react-three/drei, gsap, zustand

**Dev:** vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, @types/three, vite-plugin-glsl

**Phase 10 optional:** @react-three/postprocessing

---

## 10. Top 5 Architectural Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **1** | Connection rebuild O(n²) creep | High | Frame drops on rebuild tick | Spatial hash only; hard caps in `quality.ts`; freeze topology during travel; profile rebuild with dev timing; target < 8ms rebuild |
| **2** | GSAP camera vs R3F useFrame fight | Medium | Jitter, snap-back | GSAP owns camera during travel/idle yoyo only; parallax additive in useFrame; pause idle timeline when travel starts; never set camera via React state |
| **3** | React re-render storm from interaction | Medium | UI jank during hover/travel | Store writes only on phase/hover change; projection via DOM refs; uniforms via ref mutation; use `getState()` in useFrame not `useStore` subscription |
| **4** | Shader drift (particles vs connections desync) | Medium | Breaks immersion | Single `uniformsRef` object; shared `common.glsl`; one `SceneUniforms` updater; documented visual contract (Section 4) |
| **5** | Mobile GPU memory / fill-rate | Medium | Crash or <30fps | Tier table (Section 8); pixel ratio cap; no bloom on mobile; dynamic downgrade watchdog; test on real device early in Phase 3 |

### Secondary risks (monitor, not blocking v1)

| Risk | Mitigation |
|---|---|
| Scope creep (real section content) | All copy/images in `src/content/portfolio.ts`; add projects/skills without scene changes |
| DOM indicators desync from 3D | Ref-based projection every frame throttled to 30Hz; off-screen opacity handling |
| Post-processing FPS drop | Quality presets; mobile skips CA/grain; bloom off on mobile |
| Shader maintainability | Two shader pairs + one common file; no shader graph framework |

---

## Acceptance Criteria (v1)

- [ ] Living asymmetrical neural cluster with instanced particles
- [ ] Dynamic fading connections with interval rebuild
- [ ] Slow global accent color evolution (~4–6 min cycle)
- [ ] HUD + navigation indicators with hover dim/highlight
- [ ] GSAP cinematic fly-to and return (`power4.inOut`)
- [ ] Section content overlay on arrival
- [ ] GSAP only — no Framer Motion / AnimationMixer
- [ ] Desktop 60fps; mobile reduced but same visual identity
- [ ] Minimal file count per architecture spec
- [ ] Personal content editable in `src/content/` only (CDN URLs, assets, descriptions)
- [ ] `prefers-reduced-motion` respected

---

## Implementation Notes

- **Testing:** unit-test `spatialHash.ts` and `accent.ts` only (pure functions). Visual validation manual per phase.
- **Accessibility:** indicators are `<button>` with `aria-label`; overlay traps focus on arrival.
- **Do not add until pain appears:** raycasting, physics, separate animation store, custom post passes beyond drei/postprocessing presets.

This spec is ready for Phase 1 scaffold without further architectural decisions.
