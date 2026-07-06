---
name: react-responsive-verify
description: >-
  Fix React viewport-specific UI/layout bugs (mobile, tablet, portrait) with
  scoped changes, Playwright assertions per breakpoint, and mandatory TypeScript
  verification before finishing. Use for responsive fixes in React/Vite apps,
  R3F/Three.js camera framing, tier-aware layout, or when the user asks to verify
  mobile/desktop behavior with Playwright and run tsc --noEmit.
---

# React Responsive Fix & Verify

Workflow for **one-tier fixes** (e.g. mobile only) verified by **Playwright** and closed with **`tsc --noEmit`**. Generalizes beyond WebGL — applies to any React app with viewport-sensitive layout.

## When to use

- Brain/canvas too close or clipped on mobile
- Layout breaks at a breakpoint but desktop is fine
- User asks to "check with Playwright" and fix mobile/desktop separately
- CI failed on `tsc --noEmit` after a React Three Fiber change

## Finish gate (mandatory)

**Before marking the task done, always run:**

```bash
pnpm exec tsc --noEmit
```

Fix every error. Do not skip because "build passed" — Vite build and `tsc --noEmit` are separate gates.

If the project uses a `build` script that already runs tsc (e.g. `"build": "tsc --noEmit && vite build"`), still run `pnpm exec tsc --noEmit` explicitly after the last edit so CI and local agree.

Optional but recommended after responsive changes:

```bash
VITE_SMOKE=true pnpm exec vite build   # if app uses smoke test hooks
SMOKE_URL=http://127.0.0.1:4173 pnpm test
```

---

## Workflow checklist

Copy and track:

```
- [ ] 1. Reproduce — identify tier/breakpoint (mobile portrait vs landscape vs desktop)
- [ ] 2. Scope — change ONLY the affected tier; add regression guard for desktop
- [ ] 3. Centralize — one config function/hook, not scattered magic numbers
- [ ] 4. Instrument — data attributes + optional debug bridge for Playwright
- [ ] 5. Assert — Playwright tests per viewport; desktop unchanged
- [ ] 6. Typecheck — pnpm exec tsc --noEmit (must pass)
- [ ] 7. Smoke — build + test if project has tests/smoke.mjs
```

---

## Step 1: Scope the fix

**Rule:** Desktop/tablet defaults stay untouched unless the bug affects them.

| Pattern | Example |
|---------|---------|
| Tier enum | `detectTier()` → `'mobile' \| 'tablet' \| 'desktop'` |
| CSS only | `@media (max-width: 768px) { ... }` |
| JS config | `sceneFraming(tier)` returns desktop config unless `tier === 'mobile'` |

**Portrait within mobile:** landscape may already fit while portrait clips. Do not use one mobile preset for both — branch on aspect ratio:

```typescript
function mobileAspect() {
  return typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1
}

export function sceneFraming(tier: Tier): SceneFraming {
  if (tier === 'mobile') {
    return mobileAspect() < 0.85 ? MOBILE_PORTRAIT : MOBILE_LANDSCAPE
  }
  return DESKTOP
}
```

Threshold `0.85` ≈ taller-than-wide. Tune per app.

---

## Step 2: Centralize + wire through React

Put numbers in **one module** (`lib/framing.ts`, `hooks/useBreakpointLayout.ts`, etc.). Call from:

- Initial render (Canvas `camera`, CSS variables)
- **Per-frame or resize-aware** paths (`useFrame`, `useEffect` deps on `useThree().size`)

**R3F resize:** tier may not change when rotating phone — depend on `width/height` from `useThree((s) => s.size)`, not only `qualityTier`.

```tsx
const { width, height } = useThree((s) => s.size)
useEffect(() => {
  const { fov } = sceneFraming(tier)
  if (camera instanceof PerspectiveCamera) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }
}, [camera, tier, width, height])
```

Read dynamic values **inside** `useFrame` when they must track aspect at runtime:

```tsx
useFrame(() => {
  const scale = sceneFraming(tier).clusterScale
  g.scale.setScalar(scale * breath)
})
```

---

## Step 3: Instrument for Playwright

### DOM attributes (always)

Expose tier/phase on a stable root so tests don't scrape computed styles:

```tsx
<div className="ui" data-quality-tier={tier} data-phase={phase} />
```

### Debug bridge (WebGL / complex state)

Production must **not** expose internals. Gate on dev or CI smoke build:

```typescript
// SceneDebugBridge.tsx — only when DEV or VITE_SMOKE=true
;(window as any).__scene = {
  qualityTier: tier,
  measureBrainFit: () => measureBrainFit(camera, framing.clusterScale),
  framing: { camZ, clusterScale, fov, portrait: width / height < 0.85 },
}
```

CI builds smoke bundle separately:

```yaml
env:
  VITE_SMOKE: 'true'
run: pnpm exec vite build
```

See `webgl-smoke-deploy` for full CI pattern.

### Measurable helper

Prefer a **single probe function** over screenshot diff for layout fit:

```typescript
/** Min NDC inset from screen edge (positive = visible with padding). */
export function measureBrainFit(camera, clusterScale): number {
  // project AABB corners, return min(1 - max(|x|, |y|))
}
```

---

## Step 4: Playwright assertions

Test **each viewport that behaves differently**:

```javascript
const readFraming = (page) => page.evaluate(() => ({
  tier: window.__scene?.qualityTier,
  uiTier: document.querySelector('.ui')?.getAttribute('data-quality-tier'),
  camZ: window.__scene?.framing?.camZ ?? -1,
  fit: window.__scene?.measureBrainFit?.() ?? -1,
}))

// Desktop regression guard
const d = await readFraming(desktopPage)
if (d.tier !== 'desktop') fail(...)
if (Math.abs(d.camZ - 9.8) > 0.15) fail('desktop camZ changed')

// Mobile portrait
const p = await readFraming(portraitPage) // viewport: { width: 390, height: 844 }
if (p.tier !== 'mobile') fail(...)
if (!(p.fit > 0.04)) fail(`brain clipped: margin=${p.fit}`)
```

| Assertion | Why |
|-----------|-----|
| `data-quality-tier` | Confirms React tier detection |
| Desktop constants unchanged | Prevents accidental global zoom |
| `measureBrainFit() > threshold` | Quantifies "fits in frame" |
| Separate portrait + landscape pages | Catches aspect-ratio-only bugs |

**Tune loop:** adjust config → rebuild smoke → re-run test until margins pass.

---

## Step 5: TypeScript (React + Three.js)

R3F `useThree().camera` is `Camera | OrthographicCamera` — **`camera.fov` fails tsc** even after `camera.type === 'PerspectiveCamera'`.

**Fix:** use `instanceof`:

```typescript
import { PerspectiveCamera } from 'three'

if (camera instanceof PerspectiveCamera) {
  camera.fov = fov
  camera.updateProjectionMatrix()
}
```

Other common React tsc fixes:

| Error | Fix |
|-------|-----|
| `Property 'fov' does not exist on type 'Camera'` | `instanceof PerspectiveCamera` |
| Ref nullable in effect | Guard `if (!ref.current) return` |
| `import.meta.env.VITE_*` | Declare in `vite-env.d.ts` |

---

## Step 6: Verify commands (copy-paste)

```bash
# Always before done
pnpm exec tsc --noEmit

# If smoke tests exist
pnpm exec playwright install chromium   # once per machine/CI
VITE_SMOKE=true pnpm exec vite build
pnpm preview --host 127.0.0.1 --port 4173 &   # background
SMOKE_URL=http://127.0.0.1:4173 pnpm test
```

---

## Anti-patterns

| Don't | Do instead |
|-------|------------|
| Change global camera/scale for a mobile bug | Tier + aspect branching |
| Ship without `tsc --noEmit` | Run it every time before finishing |
| `camera.type === 'PerspectiveCamera'` then `.fov` | `instanceof PerspectiveCamera` |
| One mobile viewport in tests only | Portrait **and** landscape if aspect branching exists |
| Expose `window.__scene` in production deploy | `VITE_SMOKE` CI build only |
| Screenshot-only verification | DOM attrs + measurable probes |

---

## Reference in this repo

| File | Role |
|------|------|
| `src/lib/framing.ts` | Tier + aspect camera/scale/FOV |
| `src/scene/SceneDebugBridge.tsx` | Smoke hooks + `CameraFraming` |
| `tests/smoke.mjs` | Desktop regression + mobile portrait/landscape fit |
| `.github/workflows/ci-cd.yml` | `VITE_SMOKE` smoke build |

## Related skills

- `webgl-smoke-deploy` — Playwright smoke + GitHub Pages CI
- `verification-loop` — broader pre-PR gates (build, lint, tests)
- `react-testing` — RTL unit tests vs Playwright E2E boundary
- `neural-portfolio` — project-specific brain/scene architecture
