---
name: efficient-github-ci
description: >-
  Designs efficient GitHub Actions CI/CD for Vite/React/Node apps: path filters,
  Playwright browser caching, split jobs, artifact reuse, conditional deploy, and
  GitHub Pages. Use when setting up or optimizing GitHub workflows, reducing CI
  time, avoiding redundant smoke tests, or asking about Turborepo vs Actions caching.
---

# Efficient GitHub CI/CD

Design workflows for **fast feedback** without skipping checks that matter. Default stack: pnpm, Node 22, Vite, optional Playwright smoke.

## Before you add complexity

| Question | If no → |
|----------|---------|
| Monorepo with 2+ packages? | **Skip Turborepo** — use path filters + Actions cache instead |
| WebGL/shaders/visual app? | Keep smoke on **code path** changes; don't drop entirely |
| Production deploy? | Separate **smoke build** from **deploy build** (different env vars) |

**Turborepo** caches task outputs across packages in monorepos. It does **not** replace Playwright browser caching or path filters in a single-app repo.

## Recommended job graph

```
changes (path filter)
  ├─ code touched → build → smoke → deploy (master only)
  └─ docs only    → skip (fast green check)

workflow_dispatch → always runs full pipeline
```

## Path filter (skip docs/skills-only pushes)

Use `dorny/paths-filter@v3`:

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      code: ${{ steps.filter.outputs.code }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            code:
              - 'src/**'
              - 'tests/**'
              - 'public/**'
              - 'scripts/**'
              - 'index.html'
              - 'package.json'
              - 'pnpm-lock.yaml'
              - 'vite.config.ts'
              - 'tsconfig*.json'
              - '.github/workflows/**'

  build:
    needs: changes
    if: needs.changes.outputs.code == 'true' || github.event_name == 'workflow_dispatch'

  skip:
    needs: changes
    if: needs.changes.outputs.code != 'true' && github.event_name != 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - run: echo "No app code changed — skipped CI."
```

Tune `code` paths to your repo. Do **not** include `README.md` or `.cursor/skills/**` if those shouldn't trigger smoke.

## Playwright: cache browsers, not re-download

Chromium (~150MB) every run is wasteful. Cache by **Playwright version**:

```yaml
- name: Get Playwright version
  id: playwright-version
  run: echo "version=$(pnpm exec playwright --version | awk '{print $2}')" >> "$GITHUB_OUTPUT"

- uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

- name: Install Playwright Chromium
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: pnpm exec playwright install chromium --with-deps

- name: Install Playwright OS deps (cache hit)
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: pnpm exec playwright install-deps chromium
```

Also cache pnpm via `actions/setup-node@v4` with `cache: pnpm`.

## Split build and smoke

Build once, upload artifact, smoke job downloads it — avoids duplicate `vite build`:

```yaml
# build job
- run: pnpm exec vite build
- uses: actions/upload-artifact@v4
  with:
    name: dist-smoke
    path: dist
    retention-days: 1

# smoke job (needs: build)
- uses: actions/download-artifact@v4
  with:
    name: dist-smoke
    path: dist
- run: pnpm preview --host 127.0.0.1 & … && pnpm test
```

## WebGL / production preview gotcha

Smoke tests against `pnpm preview` use a **production bundle**. If tests read `window.__scene` or other dev-only hooks:

```typescript
// Expose in dev OR CI smoke build only — not production deploy
if (import.meta.env.DEV || import.meta.env.VITE_SMOKE === 'true') {
  window.__scene = { uniforms }
}
```

```yaml
# smoke build
env:
  VITE_SMOKE: 'true'
run: pnpm exec vite build

# deploy build (separate job, no VITE_SMOKE)
env:
  VITE_BASE_PATH: /${{ github.event.repository.name }}/
run: pnpm build
```

## GitHub Pages deploy

Permissions and jobs:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

deploy:
  needs: [build, smoke]
  if: |
    always() &&
    github.ref == 'refs/heads/master' &&
    needs.build.result == 'success' &&
    (needs.smoke.result == 'success' || needs.smoke.result == 'skipped')
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  steps:
    - run: pnpm build   # with VITE_BASE_PATH only
    - uses: actions/upload-pages-artifact@v4
      with:
        path: dist
    - uses: actions/deploy-pages@v4
        id: deployment
```

**One-time repo setup:** Settings → Pages → Source → **GitHub Actions**.  
404 on deploy = Pages not enabled (not a code bug).

`vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/'`

## Speed knobs (pick what fits)

| Knob | Tradeoff |
|------|----------|
| Path filters | Docs pushes skip CI — good |
| Browser cache | First run slow; rest fast — good |
| `SMOKE_LOOPS=1` in CI | Less coverage, faster — acceptable for smoke |
| `CI=true` longer timeouts | Headless GL is slow — required |
| Smoke only on PR | Faster master; less safe on direct push |
| `concurrency: cancel-in-progress` | New push kills old run — good for rapid iteration |
| `workflow_dispatch` | Manual full run when needed — good |

Pin **Node 22** explicitly. Ignore Node 20 deprecation warnings from GitHub's internal action runtime unless a step fails.

## Smoke job shell pattern

```yaml
- name: Smoke tests
  env:
    CI: 'true'
  run: |
    set -euo pipefail
    pnpm preview --host 127.0.0.1 &
    PREVIEW_PID=$!
    trap 'kill "$PREVIEW_PID" 2>/dev/null || true' EXIT
    for i in $(seq 1 60); do
      curl -sf http://127.0.0.1:4173 > /dev/null && break
      sleep 1
    done
    SMOKE_URL=http://127.0.0.1:4173 SMOKE_LOOPS=1 pnpm test
```

In smoke tests, scale timeouts when `process.env.CI` is set (2× local defaults).

## Checklist for new projects

```
- [ ] changes job with path filter + skip job
- [ ] build: tsc + vite build, upload artifact
- [ ] smoke: cache Playwright, download artifact, preview + test
- [ ] deploy: separate production build, upload-pages-artifact, deploy-pages
- [ ] VITE_SMOKE for preview tests if dev-only test hooks exist
- [ ] VITE_BASE_PATH for GitHub Pages project sites
- [ ] Pages enabled: Settings → GitHub Actions
- [ ] concurrency cancel-in-progress on feature branches
- [ ] workflow_dispatch for manual full runs
```

## Anti-patterns

- Running smoke against `pnpm dev` in CI (dev server in CI is fragile; use preview + built dist)
- Single job that builds twice (smoke + deploy) without reason
- `window.__scene` in production deploy bundle
- Turborepo for a single-package portfolio site
- Skipping smoke on **all** pushes including `src/**` changes
- Full-screen UI layers with `pointer-events: auto` blocking hit-test targets (if UI smoke tests exist)

## Reference

Full working example in this repo: `.github/workflows/ci-cd.yml`  
WebGL-specific testing: `webgl-smoke-deploy` skill
