---
name: webgl-smoke-deploy
description: >-
  Playwright smoke testing and GitHub Actions CI/CD for Vite WebGL apps.
  Use when testing React Three Fiber canvases headlessly, asserting shader
  uniforms, hit-testing UI over canvas, or deploying static Vite builds to
  GitHub Pages.
---

# WebGL Smoke Test & Deploy

Minimal CI for GPU-heavy Vite apps: typecheck, build, Playwright smoke against preview server, deploy to GitHub Pages.

## Smoke test pattern (`tests/smoke.mjs`)

Plain Node + Playwright (no test runner framework needed for smoke):

```javascript
import { chromium } from 'playwright'
const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const errors = []
const fail = (msg) => { errors.push(msg); console.error('FAIL:', msg) }

const browser = await chromium.launch()
// watch pageerror + console.error
// assert canvas width/height > 0
// assert DOM phases via data-load-phase / data-phase attributes
// assert uniforms via window.__scene.uniforms (DEV expose only)
process.exit(errors.length ? 1 : 0)
```

## Expose uniforms for assertions (smoke build only)

Production deploy must NOT expose `window.__scene`. CI preview builds use `VITE_SMOKE=true`:

```typescript
// shared.ts
if (import.meta.env.DEV || import.meta.env.VITE_SMOKE === 'true') {
  (window as any).__scene = { uniforms }
}
```

CI workflow:
```yaml
- name: Build for smoke tests
  env:
    VITE_SMOKE: 'true'
  run: pnpm exec vite build

- name: Build for GitHub Pages   # separate step, no VITE_SMOKE
  env:
    VITE_BASE_PATH: /${{ github.event.repository.name }}/
  run: pnpm build
```

Without `VITE_SMOKE`, all `window.__scene` assertions fail on `pnpm preview` (production bundle).

Assert hover/travel/focus:

```javascript
const fx = await page.evaluate(() => ({
  focus: window.__scene?.uniforms.uFocus.value ?? -1,
  waveT: window.__scene?.uniforms.uWaveT.value ?? -1,
}))
```

## WebGL-specific assertions

| Check | How |
|-------|-----|
| Canvas renders | `canvas.width > 0 && canvas.height > 0` |
| Intro gate | `[data-load-phase="ready"]` timeout 60-90s |
| Sectors hidden early | opacity/visibility before ready |
| Slider not blocked | `elementFromPoint` on slider center === slider |
| Sector clickable | `elementFromPoint` hits `[data-section]` button |
| Navigation | click sector → overlay title matches |
| Return | Escape → overlay detached, uFocus ≈ 0 |

Headless GL runs ~2-3 fps — use generous timeouts (60-90s for intro).

## UI hit-testing pattern

```javascript
const hit = await page.evaluate(() => {
  const s = document.querySelector('[data-testid="node-slider"]')
  const r = s.getBoundingClientRect()
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return el === s ? 'ok' : `blocked by ${el?.className}`
})
```

## Local run

```bash
pnpm exec playwright install chromium
pnpm dev                                    # :5173
SMOKE_URL=http://localhost:5173 pnpm test

pnpm build && pnpm preview                  # :4173 — CI-style
SMOKE_URL=http://localhost:4173 SMOKE_LOOPS=1 pnpm test
```

## Visual debug helper (`tests/shot.mjs`)

Drive uniforms or wait for spawn phases, save PNGs to `tests/shots/`. Headless GL too slow for live intro capture — sample by setting `uSpawn` manually post-load.

## GitHub Actions workflow

```yaml
# .github/workflows/ci-cd.yml
on:
  push: { branches: [master] }
  pull_request: { branches: [master] }
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 11 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec playwright install chromium --with-deps
      - run: |
          pnpm preview &
          PREVIEW_PID=$!
          for i in $(seq 1 30); do curl -sf http://localhost:4173 > /dev/null && break; sleep 1; done
          SMOKE_URL=http://localhost:4173 SMOKE_LOOPS=1 pnpm test
          kill $PREVIEW_PID
      - name: Build for GitHub Pages
        if: github.ref == 'refs/heads/master' && github.event_name != 'pull_request'
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
        run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        if: ...
        with: { path: dist }

  deploy:
    needs: build-and-test
    if: ...
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - uses: actions/deploy-pages@v4
```

## Vite base path

```typescript
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  preview: { port: 4173, strictPort: true },
})
```

Deploy URL: `https://<user>.github.io/<repo-name>/`

One-time: repo **Settings → Pages → Source: GitHub Actions**.

Root deploy (Vercel/Netlify): omit `VITE_BASE_PATH`.

## public/.nojekyll

Empty file in `public/` so GitHub Pages skips Jekyll processing.

## PR vs push

- PR: CI only (build + smoke)
- Push to master: CI + Pages rebuild with base path + deploy

## Related skills

- App patterns: `cinematic-webgl-app`
- General E2E: `e2e-testing` (Page Object Model, fixtures — use for larger suites)

Reference: `.github/workflows/ci-cd.yml`, `tests/smoke.mjs` in this repo.
